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
			const audioTrackCodec = format === 'mp4' ? 'aac' : 'A_OPUS';
			const audioEncoderCodec = format === 'mp4' ? 'mp4a.40.2' : 'opus';
			const audioConfig = {
				codec: audioEncoderCodec,
				sampleRate: 44100,
				numberOfChannels: 2,
				bitrate: 128000
			};
			let shouldEncodeAudio = false;

			if (wantsAudio) {
				if (typeof AudioEncoder === 'undefined') {
					console.warn('AudioEncoder not available in this browser, exporting without audio');
				} else {
					try {
						const support = await AudioEncoder.isConfigSupported(audioConfig);
						if (support.supported) {
							shouldEncodeAudio = true;
						} else {
							console.warn(`AudioEncoder codec ${audioEncoderCodec} not supported, exporting without audio`);
						}
					} catch (error) {
						console.warn('Failed to query AudioEncoder support, exporting without audio', error);
					}
				}
			}

			this.muxer = new MuxerClass({
				target: new ArrayBufferTargetClass(),
				video: {
					codec: videoTrackCodec,
					width,
					height,
					frameRate: safeFps
				},
				audio: shouldEncodeAudio ? {
					codec: audioTrackCodec,
					numberOfChannels: 2,
					sampleRate: 44100
				} : undefined,
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
						const muxDuration = frameDurationUs;
						muxedVideoChunkCount += 1;

						const data = new Uint8Array(chunk.byteLength);
						chunk.copyTo(data);
						this.muxer.addVideoChunkRaw(data, chunk.type, muxTimestamp, muxDuration, meta);
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

			// Setup Audio offline rendering if audio is needed
			const audioEvents = extractAudioEventsFromTimeline(timeline);
			if (shouldEncodeAudio) {
				try {
					const offlineCtx = new OfflineAudioContext(2, 44100 * adjustedDuration, 44100);
					let musicBuffer: AudioBuffer | null = null;
					let notifBuffer: AudioBuffer | null = null;

					// Fetch music
					if (this.options.audio.musicEnabled && this.options.audio.musicTrackUrl) {
						const res = await fetch(this.options.audio.musicTrackUrl);
						const arrayBuffer = await res.arrayBuffer();
						musicBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
						const source = offlineCtx.createBufferSource();
						source.buffer = musicBuffer;
						source.loop = true;
						const gain = offlineCtx.createGain();
						gain.gain.value = this.options.audio.musicVolume;
						source.connect(gain);
						gain.connect(offlineCtx.destination);
						source.start(0);
					}

					// Fetch notification
					if (this.options.audio.notificationEnabled && this.options.audio.notificationSoundUrl) {
						const res = await fetch(this.options.audio.notificationSoundUrl);
						const arrayBuffer = await res.arrayBuffer();
						notifBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
						
						for (const event of audioEvents) {
							if (event.type === 'notification' && event.time / animationSpeed <= adjustedDuration) {
								const source = offlineCtx.createBufferSource();
								source.buffer = notifBuffer;
								source.connect(offlineCtx.destination);
								source.start(event.time / animationSpeed);
							}
						}
					}

					const finalAudioBuffer = await offlineCtx.startRendering();

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

					this.audioEncoder.configure(audioConfig);
					
					const channelData = [finalAudioBuffer.getChannelData(0), finalAudioBuffer.getChannelData(1)];
					const numSamples = finalAudioBuffer.length;
					let offset = 0;
					const chunkSize = 44100;
					while (offset < numSamples) {
						const curSize = Math.min(chunkSize, numSamples - offset);
						const planarData = new Float32Array(curSize * 2);
						planarData.set(channelData[0].subarray(offset, offset + curSize), 0);
						planarData.set(channelData[1].subarray(offset, offset + curSize), curSize);
						
						const audioData = new AudioData({
							format: 'f32-planar',
							sampleRate: 44100,
							numberOfFrames: curSize,
							numberOfChannels: 2,
							timestamp: (offset / 44100) * 1e6,
							data: planarData
						});
						this.audioEncoder.encode(audioData);
						audioData.close();
						offset += curSize;
					}
					await this.audioEncoder.flush();
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

			if (sourceAspect > targetAspect) {
				drawHeight = Math.max(1, Math.round(width / sourceAspect));
				drawY = Math.max(0, Math.round((height - drawHeight) / 2));
			} else {
				drawWidth = Math.max(1, Math.round(height * sourceAspect));
				drawX = Math.max(0, Math.round((width - drawWidth) / 2));
			}

			const captureContext = await createContext(previewElement, {
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

					const captured = await domToCanvas(captureContext);

					this.ctx!.fillStyle = backgroundColor;
					this.ctx!.fillRect(0, 0, width, height);
					this.ctx!.drawImage(captured, drawX, drawY, drawWidth, drawHeight);

					// Help GC reclaim the transient capture canvas aggressively.
					captured.width = 1;
					captured.height = 1;

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
					destroyContext(captureContext);
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
			
			const buffer = this.muxer.target.buffer;
			const blob = new Blob([buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
			return blob;
		} catch (error) {
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
		}
	}

	cancel(): void {
		this.isCancelled = true;
		this.isRecording = false;
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

		this.canvas = null;
		this.ctx = null;
		this.videoEncoder = null;
		this.audioEncoder = null;
		this.muxer = null;
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
