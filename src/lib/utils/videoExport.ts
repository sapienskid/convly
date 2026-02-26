import type { AnimationTimeline } from './animationTimeline';
import { extractAudioEventsFromTimeline } from './audioMixer';
import { createOffscreenCanvas, downloadBlob } from './domCapture';

export interface ExportOptions {
	width: number;
	height: number;
	fps: number;
	format: 'mp4' | 'webm';
	codec: 'h264' | 'h265' | 'vp9';
	animationSpeed: number;
	quality: 'low' | 'medium' | 'high' | 'ultra';
	channelName: string;
	backgroundColor: string;
	outputFileStream?: FileSystemWritableFileStream | null;
	outputFileHandle?: FileSystemFileHandle | null;
	outputFileStreamMode?: 'save-picker' | 'opfs-temp';
	audio: {
		musicEnabled: boolean;
		musicVolume: number;
		musicTrackUrl: string | null;
		notificationEnabled: boolean;
		notificationSoundUrl: string;
	};
}

export interface ExportProgress {
	phase: 'initializing' | 'rendering' | 'encoding' | 'finalizing' | 'complete' | 'cancelled';
	percent: number;
	currentFrame: number;
	totalFrames: number;
	elapsedMs: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

const QUALITY_BITRATES: Record<string, number> = {
	low: 2_000_000,
	medium: 5_000_000,
	high: 8_000_000,
	ultra: 15_000_000
};

/** Wait for DOM to be fully painted after state updates */
function waitForDomPaint(): Promise<void> {
	return new Promise((resolve) => {
		// requestAnimationFrame is heavily throttled (or paused) in background tabs.
		// Fall back to a microtask so export can continue when the tab is hidden.
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
			queueMicrotask(resolve);
			return;
		}

		requestAnimationFrame(() => {
			resolve();
		});
	});
}

/** Wait for all images in an element to load */
function waitForImages(element: HTMLElement): Promise<void[]> {
	const images = element.querySelectorAll('img');
	const promises: Promise<void>[] = [];

	images.forEach((img) => {
		if (!img.complete) {
			promises.push(
				new Promise((resolve) => {
					img.onload = () => resolve();
					img.onerror = () => resolve();
				})
			);
		}
	});

	return Promise.all(promises);
}

async function waitForFonts(): Promise<void> {
	if (!('fonts' in document)) return;

	try {
		await document.fonts.ready;
	} catch {
		// Ignore font readiness errors and continue export with fallback fonts.
	}
}

type CaptureContext = any;

let _captureModule:
	| {
			domToCanvas: (nodeOrContext: Node | CaptureContext, options?: any) => Promise<HTMLCanvasElement>;
			createContext: (node: Node, options?: any) => Promise<CaptureContext>;
			destroyContext: (context: CaptureContext) => void;
	  }
	| null = null;

async function ensureDomToCanvas() {
	if (!_captureModule) {
		const mod = await import('modern-screenshot');
		_captureModule = {
			domToCanvas: mod.domToCanvas,
			createContext: mod.createContext,
			destroyContext: mod.destroyContext
		};
	}
	return _captureModule;
}

export class VideoExporter {
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private isRecording = false;
	private isCancelled = false;
	private startTime = 0;
	private options: ExportOptions | null = null;
	private fatalError: Error | null = null;
	private isClosingForFailure = false;

	// WebCodecs / Muxer
	private muxer: any = null;
	private videoEncoder: VideoEncoder | null = null;
	private audioEncoder: AudioEncoder | null = null;

	private setFatalError(error: unknown): void {
		if (this.fatalError) return;

		this.fatalError = error instanceof Error ? error : new Error(String(error));
		this.isCancelled = true;
		this.isRecording = false;

		// Stop further async encoder callbacks so export halts quickly.
		if (this.isClosingForFailure) return;
		this.isClosingForFailure = true;
		try {
			this.videoEncoder?.close();
		} catch {
			// Ignore close errors while failing.
		}
		try {
			this.audioEncoder?.close();
		} catch {
			// Ignore close errors while failing.
		}
	}

	private throwIfFatalError(): void {
		if (this.fatalError) {
			throw this.fatalError;
		}
	}

	async initialize(options: ExportOptions): Promise<void> {
		this.options = options;
		this.isCancelled = false;
		this.fatalError = null;
		this.isClosingForFailure = false;

		this.canvas = createOffscreenCanvas(options.width, options.height);
		this.ctx = this.canvas.getContext('2d', {
			willReadFrequently: false,
			alpha: false
		}) as CanvasRenderingContext2D;
		this.ctx.imageSmoothingEnabled = true;
		this.ctx.imageSmoothingQuality = 'high';

		await ensureDomToCanvas();
	}

	async startRecording(
		timeline: AnimationTimeline,
		previewElement: HTMLElement,
		onProgress: ProgressCallback,
		onTimeUpdate: (time: number) => Promise<void>
	): Promise<Blob | null> {
		if (!this.canvas || !this.ctx || !this.options) {
			throw new Error('VideoExporter not initialized');
		}

		this.isRecording = true;
		this.isCancelled = false;
		this.fatalError = null;
		this.isClosingForFailure = false;
		this.startTime = Date.now();

		let totalFrames = 0;
		let currentFrame = 0;

		try {
			const { width, height, fps, format, codec, animationSpeed, quality, backgroundColor } = this.options;
			const safeFps = Math.min(60, Math.max(24, Math.round(Number(fps) || 30)));
			const safeAnimationSpeed = Math.min(2, Math.max(0.5, Number(animationSpeed) || 1));
			const adjustedDuration = timeline.totalDuration / safeAnimationSpeed;
			totalFrames = Math.max(1, Math.round(adjustedDuration * safeFps));
			const frameDuration = 1 / safeFps;
			const frameDurationUs = Math.max(1, Math.round(frameDuration * 1e6));
			const bitrate = QUALITY_BITRATES[quality] || QUALITY_BITRATES.high;

			onProgress({
				phase: 'initializing',
				percent: 0,
				currentFrame: 0,
				totalFrames,
				elapsedMs: 0
			});

			// Dynamic import Muxers
			let MuxerModule;
			if (format === 'mp4') {
				MuxerModule = await import('mp4-muxer');
			} else {
				MuxerModule = await import('webm-muxer');
			}

			const MuxerClass = MuxerModule.Muxer as any;
			const ArrayBufferTargetClass = MuxerModule.ArrayBufferTarget as any;
			const StreamTargetClass = MuxerModule.StreamTarget as any;
			const FileSystemWritableFileStreamTargetClass =
				MuxerModule.FileSystemWritableFileStreamTarget as any;
			const usingOutputFileStream =
				Boolean(this.options.outputFileStream) &&
				typeof FileSystemWritableFileStreamTargetClass === 'function';

			type MuxerChunk = { position: number; data: Uint8Array<ArrayBuffer> };
			const muxerChunks: MuxerChunk[] = [];
			let muxerOutputSize = 0;
			const target =
				usingOutputFileStream
					? new FileSystemWritableFileStreamTargetClass(this.options.outputFileStream, {
							chunkSize: 1024 * 1024
						})
					: typeof StreamTargetClass === 'function'
					? new StreamTargetClass({
							onData: (data: Uint8Array, position: number) => {
								const chunkCopy = new Uint8Array(data.byteLength) as Uint8Array<ArrayBuffer>;
								chunkCopy.set(data);
								muxerChunks.push({ position, data: chunkCopy });
								muxerOutputSize = Math.max(muxerOutputSize, position + chunkCopy.byteLength);
							},
							chunked: true,
							chunkSize: 1024 * 1024
						})
					: new ArrayBufferTargetClass();

			const videoTrackCodec =
				format === 'mp4'
					? codec === 'h265'
						? 'hevc'
						: codec === 'vp9'
							? 'vp9'
							: 'avc'
					: codec === 'h265'
						? 'V_MPEGH/ISO/HEVC'
						: codec === 'vp9'
							? 'V_VP9'
							: 'V_MPEG4/ISO/AVC';

			const wantsAudio = this.options.audio.musicEnabled || this.options.audio.notificationEnabled;
			type AudioPlan = {
				trackCodec: 'aac' | 'opus' | 'A_OPUS';
				encoderConfig: AudioEncoderConfig;
			};
			const audioCandidates: AudioPlan[] =
				format === 'mp4'
					? [
							{
								trackCodec: 'aac',
								encoderConfig: {
									codec: 'mp4a.40.2',
									sampleRate: 44100,
									numberOfChannels: 2,
									bitrate: 128000
								}
							},
							{
								trackCodec: 'opus',
								encoderConfig: {
									codec: 'opus',
									sampleRate: 48000,
									numberOfChannels: 2,
									bitrate: 128000
								}
							}
						]
					: [
							{
								trackCodec: 'A_OPUS',
								encoderConfig: {
									codec: 'opus',
									sampleRate: 48000,
									numberOfChannels: 2,
									bitrate: 128000
								}
							}
						];
			let audioPlan: AudioPlan | null = null;

			if (wantsAudio) {
				if (typeof AudioEncoder === 'undefined') {
					console.warn('AudioEncoder not available in this browser, exporting without audio');
				} else {
					for (let index = 0; index < audioCandidates.length; index += 1) {
						const candidate = audioCandidates[index];
						try {
							const support = await AudioEncoder.isConfigSupported(candidate.encoderConfig);
							if (!support.supported) {
								continue;
							}

							audioPlan = candidate;
							if (index > 0) {
								console.warn(
									`Audio codec fallback: ${audioCandidates[0].encoderConfig.codec} unsupported, using ${candidate.encoderConfig.codec}`
								);
							}
							break;
						} catch (error) {
							console.warn(
								`Failed to query AudioEncoder support for ${candidate.encoderConfig.codec}`,
								error
							);
						}
					}

					if (!audioPlan) {
						console.warn('No supported audio codec found for current export format, exporting without audio');
					}
				}
			}

			this.muxer = new MuxerClass({
				target,
				video: {
					codec: videoTrackCodec,
					width,
					height,
					frameRate: safeFps
				},
				audio: audioPlan
					? {
							codec: audioPlan.trackCodec,
							numberOfChannels: audioPlan.encoderConfig.numberOfChannels,
							sampleRate: audioPlan.encoderConfig.sampleRate
						}
					: undefined,
				fastStart: format === 'mp4' ? false : undefined
			});

			// Setup VideoEncoder
			let muxedVideoChunkCount = 0;
			this.videoEncoder = new VideoEncoder({
				output: (chunk, meta) => {
					if (!this.muxer || this.isCancelled) return;

					try {
						if (format !== 'mp4') {
							this.muxer.addVideoChunk(chunk, meta);
							return;
						}

						// Keep MP4 timestamps strictly monotonic for mp4-muxer.
						const muxTimestamp = muxedVideoChunkCount * frameDurationUs;
						muxedVideoChunkCount += 1;
						this.muxer.addVideoChunk(chunk, meta, muxTimestamp);
					} catch (error) {
						console.error('Muxer video output error:', error);
						this.setFatalError(error);
					}
				},
				error: (e) => {
					console.error('VideoEncoder error:', e);
					this.setFatalError(e);
				}
			});

			const videoCodecMap: Record<string, string> = {
				h264: 'avc1.4d002a', // Main profile, level 4.2
				h265: 'hev1.1.6.L93.B0', // HEVC Main profile
				vp9: 'vp09.00.10.08' // VP9 profile 0
			};
			const videoCodec = videoCodecMap[codec] || videoCodecMap.h264;

			const videoEncoderConfig: VideoEncoderConfig = {
				codec: videoCodec,
				width,
				height,
				bitrate,
				framerate: safeFps,
				latencyMode: format === 'mp4' ? 'realtime' : 'quality'
			};

			// MP4 + H.264 works best with AVCC-formatted output (includes decoder config metadata for muxing).
			if (format === 'mp4' && codec === 'h264') {
				(videoEncoderConfig as VideoEncoderConfig & { avc?: { format: 'avc' | 'annexb' } }).avc = {
					format: 'avc'
				};
			}

			this.videoEncoder.configure(videoEncoderConfig);

			// Setup audio rendering if audio is needed.
			// We intentionally avoid full OfflineAudioContext.startRendering() to keep
			// memory usage bounded for long exports.
			const audioEvents = extractAudioEventsFromTimeline(timeline);
			if (audioPlan) {
					try {
						const audioSampleRate = audioPlan.encoderConfig.sampleRate;
						const totalAudioSamples = Math.max(1, Math.ceil(audioSampleRate * adjustedDuration));
						let musicBuffer: AudioBuffer | null = null;
						let notifBuffer: AudioBuffer | null = null;
						const needsDecodeContext =
							Boolean(this.options.audio.musicEnabled && this.options.audio.musicTrackUrl) ||
							Boolean(
								this.options.audio.notificationEnabled && this.options.audio.notificationSoundUrl
							);
						const decodeContext = needsDecodeContext
							? new AudioContext({ sampleRate: audioSampleRate })
							: null;

						const decodeAudio = async (url: string): Promise<AudioBuffer> => {
							const res = await fetch(url);
							if (!res.ok) {
								throw new Error(`Failed to load audio asset: ${res.status} ${res.statusText}`);
							}
							const arrayBuffer = await res.arrayBuffer();
							if (!decodeContext) {
								throw new Error('Audio decode context unavailable');
							}
							return await decodeContext.decodeAudioData(arrayBuffer);
						};

					if (this.options.audio.musicEnabled && this.options.audio.musicTrackUrl) {
						musicBuffer = await decodeAudio(this.options.audio.musicTrackUrl);
					}

					if (this.options.audio.notificationEnabled && this.options.audio.notificationSoundUrl) {
						notifBuffer = await decodeAudio(this.options.audio.notificationSoundUrl);
					}

						if (decodeContext) {
							try {
								await decodeContext.close();
							} catch {
								// Ignore decode context close failures.
							}
						}

					const musicLeft = musicBuffer ? musicBuffer.getChannelData(0) : null;
					const musicRight = musicBuffer
						? musicBuffer.getChannelData(Math.min(1, musicBuffer.numberOfChannels - 1))
						: null;
					const musicLength = musicBuffer?.length ?? 0;
					const musicGain = Math.max(0, Math.min(1, this.options.audio.musicVolume));

					const notifLeft = notifBuffer ? notifBuffer.getChannelData(0) : null;
					const notifRight = notifBuffer
						? notifBuffer.getChannelData(Math.min(1, notifBuffer.numberOfChannels - 1))
						: null;
					const notifLength = notifBuffer?.length ?? 0;

					const notificationStarts = audioEvents
						.filter((event) => event.type === 'notification')
						.map((event) => Math.max(0, Math.round((event.time / safeAnimationSpeed) * audioSampleRate)))
						.filter((startSample) => startSample < totalAudioSamples)
						.sort((a, b) => a - b);

					this.audioEncoder = new AudioEncoder({
						output: (chunk, meta) => {
							if (!this.muxer || this.isCancelled) return;
							try {
								this.muxer.addAudioChunk(chunk, meta);
							} catch (error) {
								console.error('Muxer audio output error:', error);
								this.setFatalError(error);
							}
						},
						error: (e) => {
							console.error('AudioEncoder error:', e);
							this.setFatalError(e);
						}
					});

					this.audioEncoder.configure(audioPlan.encoderConfig);

					let offset = 0;
					const chunkSize = Math.max(1, Math.round(audioSampleRate / 10));
					let nextNotificationIdx = 0;
					const activeNotificationStarts: number[] = [];

					while (offset < totalAudioSamples) {
						const curSize = Math.min(chunkSize, totalAudioSamples - offset);
						const chunkEnd = offset + curSize;

						while (
							nextNotificationIdx < notificationStarts.length &&
							notificationStarts[nextNotificationIdx] < chunkEnd
						) {
							activeNotificationStarts.push(notificationStarts[nextNotificationIdx]);
							nextNotificationIdx += 1;
						}

						const planarData = new Float32Array(curSize * 2);
						const left = planarData.subarray(0, curSize);
						const right = planarData.subarray(curSize);

						for (let i = 0; i < curSize; i += 1) {
							const sampleIndex = offset + i;
							let l = 0;
							let r = 0;

							if (musicLeft && musicRight && musicLength > 0) {
								const musicIndex = sampleIndex % musicLength;
								l += musicLeft[musicIndex] * musicGain;
								r += musicRight[musicIndex] * musicGain;
							}

							if (notifLeft && notifRight && notifLength > 0 && activeNotificationStarts.length > 0) {
								for (let idx = activeNotificationStarts.length - 1; idx >= 0; idx -= 1) {
									const notifIndex = sampleIndex - activeNotificationStarts[idx];
									if (notifIndex >= notifLength) {
										activeNotificationStarts.splice(idx, 1);
										continue;
									}
									if (notifIndex >= 0) {
										l += notifLeft[notifIndex];
										r += notifRight[notifIndex];
									}
								}
							}

							left[i] = Math.max(-1, Math.min(1, l));
							right[i] = Math.max(-1, Math.min(1, r));
						}

						const audioData = new AudioData({
							format: 'f32-planar',
							sampleRate: audioSampleRate,
							numberOfFrames: curSize,
							numberOfChannels: 2,
							timestamp: Math.round((offset / audioSampleRate) * 1e6),
							data: planarData
						});
						this.audioEncoder.encode(audioData);
						audioData.close();
						offset += curSize;
					}

					await this.audioEncoder.flush();

					// Drop references to decoded PCM buffers as soon as possible.
					musicBuffer = null;
					notifBuffer = null;
				} catch (err) {
					console.warn('Failed to generate offline audio track:', err);
				}
			}

			onProgress({
				phase: 'rendering',
				percent: 0,
				currentFrame: 0,
				totalFrames,
				elapsedMs: Date.now() - this.startTime
			});

			const progressEvery = Math.max(1, Math.floor(totalFrames / 100));
			const { domToCanvas, createContext, destroyContext } = await ensureDomToCanvas();
			// Preload static assets once; re-checking every frame is expensive.
			await waitForImages(previewElement);
			await waitForFonts();

			let previewRect = previewElement.getBoundingClientRect();
			let captureWidth = Math.max(1, Math.round(previewRect.width));
			let captureHeight = Math.max(1, Math.round(previewRect.height));
			let attempts = 0;
			while ((captureWidth <= 1 || captureHeight <= 1) && attempts < 120) {
				await waitForDomPaint();
				previewRect = previewElement.getBoundingClientRect();
				captureWidth = Math.max(1, Math.round(previewRect.width));
				captureHeight = Math.max(1, Math.round(previewRect.height));
				attempts += 1;
			}
			if (captureWidth <= 1 || captureHeight <= 1) {
				throw new Error('Preview element has invalid dimensions for export capture');
			}

			const sourceAspect = captureWidth / captureHeight;
			const targetAspect = width / height;
			let drawWidth = width;
			let drawHeight = height;
			let drawX = 0;
			let drawY = 0;

			// Fill the entire export frame (screen-recorded look) rather than letterboxing.
			if (sourceAspect > targetAspect) {
				drawHeight = height;
				drawWidth = Math.max(1, Math.round(height * sourceAspect));
				drawX = Math.round((width - drawWidth) / 2);
				drawY = 0;
			} else {
				drawWidth = width;
				drawHeight = Math.max(1, Math.round(width / sourceAspect));
				drawX = 0;
				drawY = Math.round((height - drawHeight) / 2);
			}

			const createCaptureContext = () =>
				createContext(previewElement, {
					width: captureWidth,
					height: captureHeight,
					scale: 1,
					backgroundColor,
					timeout: 15000,
					drawImageInterval: 0,
					features: {
						fixSvgXmlDecode: true,
						restoreScrollPosition: true
					},
					fetch: {
						bypassingCache: false,
						requestInit: { cache: 'force-cache' }
					},
					autoDestruct: false
				});
			const captureContextRefreshEvery = Math.max(safeFps * 3, 72);
			let captureContext: CaptureContext | null = await createCaptureContext();

			try {
				for (let frame = 0; frame < totalFrames; frame++) {
					currentFrame = frame;
					this.throwIfFatalError();

					if (this.isCancelled) {
						onProgress({
							phase: 'cancelled',
							percent: 100,
							currentFrame: frame,
							totalFrames,
							elapsedMs: Date.now() - this.startTime
						});
						return null;
					}

					const svelteTime = (frame / safeFps) * safeAnimationSpeed;
					await onTimeUpdate(svelteTime);
					await waitForDomPaint();

					if (this.videoEncoder.encodeQueueSize > safeFps * 2) {
						await this.videoEncoder.flush();
					}

					if (frame > 0 && frame % captureContextRefreshEvery === 0) {
						try {
							if (captureContext) {
								destroyContext(captureContext);
							}
						} catch {
							// Ignore context cleanup errors.
						}
						captureContext = await createCaptureContext();
					}

					const captured = await domToCanvas(captureContext!);

					this.ctx!.fillStyle = backgroundColor;
					this.ctx!.fillRect(0, 0, width, height);
					this.ctx!.drawImage(captured, drawX, drawY, drawWidth, drawHeight);

					// Help GC reclaim the transient capture canvas aggressively.
					captured.width = 0;
					captured.height = 0;

					const videoFrame = new VideoFrame(this.canvas!, {
						timestamp: frame * frameDurationUs,
						duration: frameDurationUs
					});

					// Keyframe every 2 seconds
					const keyFrame = frame % (safeFps * 2) === 0;
					try {
						this.videoEncoder.encode(videoFrame, { keyFrame });
					} catch (error) {
						videoFrame.close();
						this.setFatalError(error);
						this.throwIfFatalError();
					}
					videoFrame.close();

					// Keep encoder buffers bounded to avoid large tab memory spikes on long exports.
					if ((frame + 1) % safeFps === 0) {
						await this.videoEncoder.flush();
					}

					if (frame % progressEvery === 0 || frame === totalFrames - 1) {
						const percent = Math.round(((frame + 1) / totalFrames) * 100);
						onProgress({
							phase: 'rendering',
							percent: Math.min(percent, 99),
							currentFrame: frame + 1,
							totalFrames,
							elapsedMs: Date.now() - this.startTime
						});
					}
				}
			} finally {
				try {
					if (captureContext) {
						destroyContext(captureContext);
					}
				} catch {
					// Ignore context cleanup errors.
				}
			}

			this.throwIfFatalError();
			onProgress({
				phase: 'finalizing',
				percent: 95,
				currentFrame: totalFrames,
				totalFrames,
				elapsedMs: Date.now() - this.startTime
			});

			await this.videoEncoder.flush();
			this.throwIfFatalError();
			this.muxer.finalize();
			this.throwIfFatalError();
			try {
				this.videoEncoder.close();
			} catch {
				// Ignore close errors after successful finalize.
			}
			this.videoEncoder = null;
			try {
				this.audioEncoder?.close();
			} catch {
				// Ignore close errors after successful finalize.
			}
			this.audioEncoder = null;

			if (usingOutputFileStream && this.options.outputFileStream) {
				await this.options.outputFileStream.close();
				this.options.outputFileStream = null;
				const streamMode = this.options.outputFileStreamMode ?? 'save-picker';
				if (streamMode === 'opfs-temp' && this.options.outputFileHandle) {
					const exportedFile = await this.options.outputFileHandle.getFile();
					this.options.outputFileHandle = null;
					return exportedFile;
				}
				this.options.outputFileHandle = null;
				return null;
			}

			const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
			let blob: Blob;

			if (muxerChunks.length > 0) {
				const orderedChunks = muxerChunks.slice().sort((a, b) => a.position - b.position);
				let expectedPosition = 0;
				let isSequential = true;

				for (const chunk of orderedChunks) {
					if (chunk.position !== expectedPosition) {
						isSequential = false;
						break;
					}
					expectedPosition += chunk.data.byteLength;
				}

				if (isSequential) {
					blob = new Blob(orderedChunks.map((chunk) => chunk.data), { type: mimeType });
				} else {
					const assembled = new Uint8Array(muxerOutputSize);
					for (const chunk of orderedChunks) {
						assembled.set(chunk.data, chunk.position);
					}
					blob = new Blob([assembled], { type: mimeType });
				}

				muxerChunks.length = 0;
			} else {
				const buffer = this.muxer.target.buffer;
				blob = new Blob([buffer], { type: mimeType });
			}

			return blob;
		} catch (error) {
			if (this.options?.outputFileStream) {
				try {
					await this.options.outputFileStream.abort();
				} catch {
					// Ignore stream abort errors after export failure.
				}
				this.options.outputFileStream = null;
			}
			if (this.options) {
				this.options.outputFileHandle = null;
			}
			this.setFatalError(error);
			onProgress({
				phase: 'cancelled',
				percent: 100,
				currentFrame,
				totalFrames,
				elapsedMs: Date.now() - this.startTime
			});
			throw this.fatalError ?? (error instanceof Error ? error : new Error(String(error)));
		} finally {
			this.isRecording = false;
			this.muxer = null;
		}
	}

	cancel(): void {
		this.isCancelled = true;
		this.isRecording = false;
		if (this.options?.outputFileStream) {
			this.options.outputFileStream.abort().catch(() => {
				// Ignore stream abort errors during cancellation.
			});
			this.options.outputFileStream = null;
		}
		if (this.options) {
			this.options.outputFileHandle = null;
		}
		try {
			this.videoEncoder?.close();
		} catch {
			// Ignore close errors during cancellation.
		}
		try {
			this.audioEncoder?.close();
		} catch {
			// Ignore close errors during cancellation.
		}
	}

	destroy(): void {
		this.cancel();

		if (this.ctx && this.canvas) {
			try {
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			} catch {
				// Ignore canvas clear errors during teardown.
			}
		}
		if (this.canvas) {
			// Explicitly release backing store for large export canvases.
			this.canvas.width = 0;
			this.canvas.height = 0;
		}

		this.canvas = null;
		this.ctx = null;
		this.videoEncoder = null;
		this.audioEncoder = null;
		this.muxer = null;
		this.options = null;
		this.fatalError = null;
		this.startTime = 0;
	}

	getIsRecording(): boolean {
		return this.isRecording;
	}
}

export function downloadVideo(blob: Blob, channelName: string): void {
	const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const filename = `convly-${channelName}-${timestamp}.${extension}`;
	downloadBlob(blob, filename);
}

export function getResolutionPreset(resolution: string): { width: number; height: number; aspectRatio: string; platform: string } {
	const presets: Record<string, { width: number; height: number; aspectRatio: string; platform: string }> = {
		'vertical-1080x1920': { width: 1080, height: 1920, aspectRatio: '9:16', platform: 'vertical' },
		'vertical-720x1280': { width: 720, height: 1280, aspectRatio: '9:16', platform: 'vertical' },
		'vertical-540x960': { width: 540, height: 960, aspectRatio: '9:16', platform: 'vertical' }
	};
	return presets[resolution] || presets['vertical-1080x1920'];
}
