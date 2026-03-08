<script lang="ts">
	import LeftSidebar from '$lib/components/workspace/LeftSidebar.svelte';
	import RightPanel from '$lib/components/workspace/RightPanel.svelte';
	import PhonePreview from '$lib/components/workspace/PhonePreview.svelte';
	import VideoControls from '$lib/components/workspace/VideoControls.svelte';
	import CharacterEditor from '$lib/components/workspace/CharacterEditor.svelte';
	import CharacterManagerDialog from '$lib/components/workspace/CharacterManagerDialog.svelte';
	import SceneManagerDialog from '$lib/components/workspace/SceneManagerDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { ChevronRight, ChevronLeft, Plus, Trash2, GripVertical, Reply, FolderOpen } from '@lucide/svelte/icons';
	import { onMount, tick } from 'svelte';
	import { initializeStore, isInitialized } from '$lib/stores/appStore';
	import { buildMessageAnimationTimeline } from '$lib/utils/animationTimeline';
	import { extractAudioEventsFromTimeline } from '$lib/utils/audioMixer';
	import { VideoExporter, downloadVideo, getResolutionPreset, type ExportProgress } from '$lib/utils/videoExport';
	
	let isRightPanelCollapsed = $state(true);
	let isCharacterManagerOpen = $state(false);
	let isSceneManagerOpen = $state(false);
	let editorView = $state<'conversation' | 'json'>('conversation');
	let jsonEditorValue = $state('');
	let jsonEditorError = $state<string | null>(null);
	let jsonEditorStatus = $state<string | null>(null);
	let jsonEditorDirty = $state(false);
	let dragSourceIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	
	// Video Controls State
	let isVideoPlaying = $state(false);
	let videoCurrentTime = $state(0);
	let backgroundMusicAudio = $state<HTMLAudioElement | null>(null);
	let notificationAudio = $state<HTMLAudioElement | null>(null);
	let musicObjectUrl = $state<string | null>(null);
	let musicTrackUrl = $state<string | null>(null);
	let musicTrackName = $state('No music selected');
	let isMusicPlaying = $state(false);
	let nextNotificationIndex = $state(0);
	const animationTimeline = $derived.by(() =>
		buildMessageAnimationTimeline($messages, $connections, $customizeSettings)
	);
	const notificationEvents = $derived.by(() => extractAudioEventsFromTimeline(animationTimeline));
	const videoDuration = $derived(animationTimeline.totalDuration);
	const normalizedAnimationSpeed = $derived.by(() => {
		const speed = Number($customizeSettings.animationSpeed);
		if (!Number.isFinite(speed)) return 1;
		return Math.min(2, Math.max(0.5, speed));
	});
	const normalizedFps = $derived.by(() => {
		const fps = Math.round(Number($customizeSettings.fps));
		if (!Number.isFinite(fps)) return 30;
		return Math.min(60, Math.max(24, fps));
	});
	let lastPreviewMode = $state<'preview' | 'loading' | 'video'>('preview');
	const NOTIFICATION_EPSILON = 0.0001;

	// Video Export State
	let videoExporter = $state<VideoExporter | null>(null);
	let isExporting = $state(false);
	let exportProgress = $state<ExportProgress | null>(null);
	let livePreviewCaptureElement = $state<HTMLDivElement | null>(null);

	function resetNotificationCursor(timeSeconds: number) {
		if (timeSeconds <= NOTIFICATION_EPSILON) {
			nextNotificationIndex = 0;
			return;
		}

		const index = notificationEvents.findIndex(
			(event) => event.time >= timeSeconds - NOTIFICATION_EPSILON
		);
		nextNotificationIndex = index === -1 ? notificationEvents.length : index;
	}

	onMount(() => {
		initializeStore();

		const music = new Audio();
		music.loop = true;
		music.preload = 'auto';
		backgroundMusicAudio = music;

		const notification = new Audio('/sounds/message.mp3');
		notification.preload = 'auto';
		notification.volume = 0.45;
		notificationAudio = notification;

		return () => {
			music.pause();
			notification.pause();
			if (musicObjectUrl) {
				URL.revokeObjectURL(musicObjectUrl);
			}
		};
	});

	$effect(() => {
		if (videoCurrentTime > videoDuration) {
			videoCurrentTime = videoDuration;
		}
	});

	$effect(() => {
		const nextMode = $previewState;
		if (nextMode === lastPreviewMode) return;

		if (nextMode === 'video') {
			videoCurrentTime = 0;
			isVideoPlaying = !isExporting && videoDuration > 0;
			resetNotificationCursor(0);
			if (backgroundMusicAudio) {
				backgroundMusicAudio.currentTime = 0;
			}
			isMusicPlaying =
				!isExporting &&
				isVideoPlaying &&
				Boolean(musicTrackUrl) &&
				($customizeSettings.musicEnabled ?? true);
		} else {
			isVideoPlaying = false;
			isMusicPlaying = false;
			resetNotificationCursor(0);
		}

		lastPreviewMode = nextMode;
	});

	$effect(() => {
		if (!backgroundMusicAudio) return;
		backgroundMusicAudio.volume = Math.max(0, Math.min($customizeSettings.musicVolume ?? 0.3, 1));
	});

	$effect(() => {
		if (!backgroundMusicAudio) return;
		const shouldPlay = isMusicPlaying && Boolean(musicTrackUrl) && ($customizeSettings.musicEnabled ?? true);

		if (shouldPlay) {
			const playPromise = backgroundMusicAudio.play();
			if (playPromise) {
				playPromise.catch(() => {
					isMusicPlaying = false;
				});
			}
		} else {
			backgroundMusicAudio.pause();
		}
	});

	$effect(() => {
		if (!notificationAudio || !isVideoPlaying || $previewState !== 'video') return;

		const events = notificationEvents;
		if (!($customizeSettings.notificationSoundEnabled ?? true)) {
			while (
				nextNotificationIndex < events.length &&
				events[nextNotificationIndex].time <= videoCurrentTime + NOTIFICATION_EPSILON
			) {
				nextNotificationIndex += 1;
			}
			return;
		}

		while (
			nextNotificationIndex < events.length &&
			events[nextNotificationIndex].time <= videoCurrentTime + NOTIFICATION_EPSILON
		) {
			notificationAudio.currentTime = 0;
			const playPromise = notificationAudio.play();
			if (playPromise) {
				playPromise.catch(() => {});
			}
			nextNotificationIndex += 1;
		}
	});

	$effect(() => {
		if (!isVideoPlaying || $previewState !== 'video' || videoDuration <= 0) return;

		const fps = normalizedFps;
		const speed = normalizedAnimationSpeed;
		const frameDurationMs = 1000 / fps;
		const stepSeconds = frameDurationMs / 1000;
		let frameId = 0;
		let lastTimestamp = 0;
		let accumulator = 0;

		const tick = (timestamp: number) => {
			if (!isVideoPlaying) return;

			if (lastTimestamp === 0) {
				lastTimestamp = timestamp;
			}

			const delta = Math.min(timestamp - lastTimestamp, frameDurationMs * 8);
			lastTimestamp = timestamp;
			accumulator += delta;

			while (accumulator >= frameDurationMs) {
				videoCurrentTime = Math.min(videoCurrentTime + stepSeconds * speed, videoDuration);
				accumulator -= frameDurationMs;

				if (videoCurrentTime >= videoDuration) {
					isVideoPlaying = false;
					isMusicPlaying = false;
					break;
				}
			}

			if (isVideoPlaying) {
				frameId = requestAnimationFrame(tick);
			}
		};

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});

	function handleVideoPlayPause() {
		if (videoDuration <= 0) return;
		if (videoCurrentTime >= videoDuration) {
			videoCurrentTime = 0;
			resetNotificationCursor(0);
			if (backgroundMusicAudio) {
				backgroundMusicAudio.currentTime = 0;
			}
		}
		const nextIsPlaying = !isVideoPlaying;
		isVideoPlaying = nextIsPlaying;
		isMusicPlaying = nextIsPlaying && Boolean(musicTrackUrl) && ($customizeSettings.musicEnabled ?? true);
	}

	function handleVideoRestart() {
		videoCurrentTime = 0;
		isVideoPlaying = false;
		isMusicPlaying = false;
		resetNotificationCursor(0);
		if (backgroundMusicAudio) {
			backgroundMusicAudio.currentTime = 0;
		}
	}

	function handlePreviewAnimation() {
		if (videoDuration <= 0) return;
		previewState.set('video');
		videoCurrentTime = 0;
		isVideoPlaying = true;
		resetNotificationCursor(0);
		if (backgroundMusicAudio) {
			backgroundMusicAudio.currentTime = 0;
		}
		isMusicPlaying = Boolean(musicTrackUrl) && ($customizeSettings.musicEnabled ?? true);
	}

	function handleMusicUpload(file: File) {
		const objectUrl = URL.createObjectURL(file);
		if (musicObjectUrl) {
			URL.revokeObjectURL(musicObjectUrl);
		}
		musicObjectUrl = objectUrl;
		musicTrackUrl = objectUrl;
		musicTrackName = file.name;
		isMusicPlaying = false;
		if (backgroundMusicAudio) {
			backgroundMusicAudio.src = objectUrl;
			backgroundMusicAudio.load();
		}
	}

	function handleMusicToggle() {
		if (!musicTrackUrl) return;
		isMusicPlaying = !isMusicPlaying;
	}

	function handleExportVideo() {
		if (videoDuration <= 0 || isExporting) return;
		startVideoExport();
	}

	function buildExportFilename(format: 'mp4' | 'webm', channelName: string): string {
		const safeName = (channelName || 'video')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'video';
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		return `convly-studio-${safeName}-${timestamp}.${format}`;
	}

	type ExportOutputTarget = {
		stream: FileSystemWritableFileStream | null;
		handle: FileSystemFileHandle | null;
		mode: 'save-picker' | 'opfs-temp' | 'none';
		cleanup: (() => Promise<void>) | null;
	};

	async function prepareOutputFileTarget(
		format: 'mp4' | 'webm',
		channelName: string
	): Promise<ExportOutputTarget> {
		if (typeof window === 'undefined') {
			return { stream: null, handle: null, mode: 'none', cleanup: null };
		}

		const pickerWindow = window as Window & {
			showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<FileSystemFileHandle>;
		};

		if (typeof pickerWindow.showSaveFilePicker === 'function') {
			try {
				const fileHandle = await pickerWindow.showSaveFilePicker({
					suggestedName: buildExportFilename(format, channelName),
					types: [
						{
							description: format === 'mp4' ? 'MP4 Video' : 'WebM Video',
							accept:
								format === 'mp4'
									? { 'video/mp4': ['.mp4'] }
									: { 'video/webm': ['.webm'] }
						}
					]
				});
				const stream = await fileHandle.createWritable();
				return { stream, handle: fileHandle, mode: 'save-picker', cleanup: null };
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError')) {
					console.warn('Failed to open file save picker, trying OPFS fallback.', error);
				}
			}
		}

		const storageWithDirectory = navigator.storage as
			| (StorageManager & {
					getDirectory?: () => Promise<FileSystemDirectoryHandle>;
			  })
			| undefined;
		if (storageWithDirectory && typeof storageWithDirectory.getDirectory === 'function') {
			try {
				// Disk-backed fallback avoids large in-memory mux buffers when save picker is unavailable.
				const rootDirectory = await storageWithDirectory.getDirectory();
				const tempFilename = `convly-studio-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;
				const fileHandle = await rootDirectory.getFileHandle(tempFilename, { create: true });
				const stream = await fileHandle.createWritable();
				return {
					stream,
					handle: fileHandle,
					mode: 'opfs-temp',
					cleanup: async () => {
						try {
							await rootDirectory.removeEntry(tempFilename);
						} catch (cleanupError) {
							console.warn('Failed to cleanup temporary OPFS export file.', cleanupError);
						}
					}
				};
			} catch (error) {
				console.warn('Failed to prepare OPFS export target, falling back to in-memory download.', error);
			}
		}

		return { stream: null, handle: null, mode: 'none', cleanup: null };
	}

	async function waitForLivePreviewElement(timeoutMs = 5000): Promise<HTMLDivElement> {
		const waitForRenderTurn = () =>
			new Promise<void>((resolve) => {
				const canUseAnimationFrame =
					typeof requestAnimationFrame === 'function' &&
					(typeof document === 'undefined' || document.visibilityState === 'visible');
				if (canUseAnimationFrame) {
					requestAnimationFrame(() => resolve());
					return;
				}
				if (typeof queueMicrotask === 'function') {
					queueMicrotask(resolve);
					return;
				}
				Promise.resolve().then(resolve);
			});

		const start = performance.now();

		while (!livePreviewCaptureElement) {
			await tick();
			await waitForRenderTurn();

			if (performance.now() - start >= timeoutMs) {
				throw new Error('Live preview capture element failed to initialize');
			}
		}

		return livePreviewCaptureElement;
	}

	async function startVideoExport() {
		if (isExporting) return;

		const previousPreviewState = $previewState;
		const previousCurrentTime = videoCurrentTime;
		const previousIsVideoPlaying = isVideoPlaying;
		const previousIsMusicPlaying = isMusicPlaying;

		isExporting = true;
		exportProgress = {
			phase: 'initializing',
			percent: 0,
			currentFrame: 0,
			totalFrames: 0,
			elapsedMs: 0
		};

		const resolution = getResolutionPreset($customizeSettings.resolution);
		const exportFormat = $customizeSettings.exportFormat;
		const exportChannelName = $customizeSettings.channelName || 'general';
		const outputTarget = await prepareOutputFileTarget(exportFormat, exportChannelName);
		let outputTargetCleanup = outputTarget.cleanup;
		let deferredOutputCleanup: Promise<void> | null = null;

		videoExporter = new VideoExporter();

		try {
			previewState.set('video');
			isVideoPlaying = false;
			isMusicPlaying = false;
			videoCurrentTime = 0;
			resetNotificationCursor(0);
			if (backgroundMusicAudio) {
				backgroundMusicAudio.currentTime = 0;
			}
			await tick();

			const previewContainer = await waitForLivePreviewElement();
			const screenCaptureElement =
				previewContainer.querySelector<HTMLElement>('[data-export-capture="screen"]') ??
				previewContainer.querySelector<HTMLElement>('[data-export-capture="app-content"]') ??
				previewContainer;
			const captureBackground =
				getComputedStyle(screenCaptureElement).backgroundColor ||
				$customizeSettings.backgroundColor ||
				'#313338';

			await videoExporter.initialize({
				width: resolution.width,
				height: resolution.height,
				fps: normalizedFps,
				format: exportFormat,
				codec: $customizeSettings.codec,
				animationSpeed: normalizedAnimationSpeed,
				quality: $customizeSettings.quality,
				channelName: exportChannelName,
				backgroundColor: captureBackground,
				outputFileStream: outputTarget.stream,
				outputFileHandle: outputTarget.handle,
				outputFileStreamMode: outputTarget.mode === 'none' ? undefined : outputTarget.mode,
				audio: {
					musicEnabled: $customizeSettings.musicEnabled && Boolean(musicTrackUrl),
					musicVolume: $customizeSettings.musicVolume,
					musicTrackUrl: musicTrackUrl,
					notificationEnabled: $customizeSettings.notificationSoundEnabled,
					notificationSoundUrl: '/sounds/message.mp3'
				}
			});

			let blob = await videoExporter.startRecording(
				animationTimeline,
				screenCaptureElement,
				(progress) => {
					exportProgress = progress;
				},
				async (time: number) => {
					videoCurrentTime = time;
					await tick();
				}
			);

			const didCancel = exportProgress?.phase === 'cancelled';
			if (!didCancel) {
				exportProgress = {
					...exportProgress,
					phase: 'finalizing',
					percent: 99
				};
			}

				if (blob) {
					const downloadRelease = downloadVideo(blob, $customizeSettings.channelName || 'video', {
						revokeAfterMs: outputTarget.mode === 'opfs-temp' ? 5_000 : undefined
					}).catch((downloadError) => {
						console.warn('Failed to trigger video download.', downloadError);
					});

					if (outputTarget.mode === 'opfs-temp' && outputTargetCleanup) {
						// Keep OPFS file alive until blob URL has had time to be consumed by the browser.
						const cleanupFn = outputTargetCleanup;
						outputTargetCleanup = null;
					deferredOutputCleanup = downloadRelease.then(async () => {
						await cleanupFn();
					});
				}

				blob = null;
			}

			if (!didCancel) {
				exportProgress = {
					...exportProgress,
					phase: 'complete',
					percent: 100
				};
			}
		} catch (error) {
			console.error('Export failed:', error);
			exportProgress = {
				phase: 'cancelled',
				percent: 0,
				currentFrame: 0,
				totalFrames: 0,
				elapsedMs: 0
			};
		} finally {
			if (videoExporter) {
				videoExporter.destroy();
				videoExporter = null;
			}

			if (outputTargetCleanup) {
				try {
					await outputTargetCleanup();
				} catch (cleanupError) {
					console.warn('Failed to cleanup temporary OPFS export file.', cleanupError);
				}
				outputTargetCleanup = null;
			}

			if (deferredOutputCleanup) {
				deferredOutputCleanup.catch((cleanupError) => {
					console.warn('Failed to cleanup temporary OPFS export file.', cleanupError);
				});
				deferredOutputCleanup = null;
			}

			previewState.set(previousPreviewState);
			videoCurrentTime = previousCurrentTime;
			isVideoPlaying = previousPreviewState === 'video' ? previousIsVideoPlaying : false;
			isMusicPlaying =
				previousPreviewState === 'video' &&
				previousIsMusicPlaying &&
				Boolean(musicTrackUrl) &&
				($customizeSettings.musicEnabled ?? true);

			setTimeout(() => {
				isExporting = false;
				exportProgress = null;
			}, 1500);
		}
	}

	function handleCancelExport() {
		if (videoExporter) {
			videoExporter.cancel();
		}
		isExporting = false;
		exportProgress = null;
	}

	function handleVideoDownload() {
		const resolutionPreset = getResolutionPreset($customizeSettings.resolution);
		const timeline = animationTimeline.entries.map((entry, index) => ({
			index: index + 1,
			messageId: entry.message.id,
			characterId: entry.message.characterId ?? null,
			replyTo: entry.message.replyTo ?? null,
			text: entry.message.text,
			start: entry.start,
			typingEnd: entry.typingEnd,
			holdEnd: entry.holdEnd,
			transitionEnd: entry.transitionEnd,
			typingDuration: entry.typingDuration,
			holdDuration: entry.holdDuration,
			transitionDuration: entry.transitionDuration
		}));

		const orderedConversation = animationTimeline.orderedMessages.map((message, index) => ({
			index: index + 1,
			id: message.id,
			characterId: message.characterId ?? null,
			replyTo: message.replyTo ?? null,
			timestamp: message.timestamp,
			text: message.text
		}));

		const exportData = {
			version: 2,
			exportedAt: new Date().toISOString(),
			renderPlan: {
				format: $customizeSettings.exportFormat,
				codec: $customizeSettings.codec,
				resolution: $customizeSettings.resolution,
				width: resolutionPreset.width,
				height: resolutionPreset.height,
				aspectRatio: resolutionPreset.aspectRatio,
				platformPreset: resolutionPreset.platform,
				fps: $customizeSettings.fps,
				quality: $customizeSettings.quality,
				durationSeconds: videoDuration
			},
				audio: {
					musicEnabled: $customizeSettings.musicEnabled,
					musicVolume: $customizeSettings.musicVolume,
					trackName: musicTrackName,
					hasTrack: Boolean(musicTrackUrl),
					notificationEnabled: $customizeSettings.notificationSoundEnabled,
					notificationSound: '/sounds/message.mp3'
				},
			timeline,
			conversation: orderedConversation,
			project: {
				characters: $characters,
				messages: $messages,
				connections: $connections,
				customizeSettings: $customizeSettings
			}
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const channelSlug = ($customizeSettings.channelName || 'channel')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
		link.href = url;
		link.download = `convly-studio-export-${channelSlug || 'channel'}-${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function handleVideoSeek(time: number) {
		videoCurrentTime = Math.max(0, Math.min(time, videoDuration));
		resetNotificationCursor(videoCurrentTime);
		if (backgroundMusicAudio && musicTrackUrl) {
			try {
				backgroundMusicAudio.currentTime = videoCurrentTime;
			} catch {
				// Ignore seek errors while metadata is still loading.
			}
		}
		if (videoCurrentTime >= videoDuration) {
			isVideoPlaying = false;
			isMusicPlaying = false;
		}
	}

	import {
		characters,
		messages,
		connections,
		editingCharacter,
		previewState,
		isGenerating,
		customizeSettings,
		updateMessageText,
		updateMessage,
		updateCharacter,
		addMessageForCharacter,
		importConversationFromJSON,
		importProjectData,
		sendMessageFromPreview,
		applyConversationQAFix,
		handleApplyCustomization,
		deleteElement,
		addCharacter,
		addMessage,
		deleteMessage,
		deleteConnection,
		addConnection,
		scenes,
		activeSceneId,
		addScene,
		loadSceneCharacters,
		deleteScene,
		saveCurrentAsScene,
		generateScenePrompt
	} from '$lib/stores/appStore';
	import type { ConversationFixAction } from '$lib/utils/conversationQA';
	import { analyzeMessageFlow } from '$lib/utils/messageFlow';

	// Ordered messages for the conversation list editor
	const orderedMessages = $derived.by(() => {
		const flowInfo = analyzeMessageFlow($messages, $connections);
		return flowInfo.map((info) => info.message);
	});
	const characterMap = $derived(new Map($characters.map((c) => [c.id, c])));

	function updateJsonFromConversation() {
		if (editorView === 'json' && !jsonEditorDirty) {
			jsonEditorValue = buildConversationJson();
		}
	}

	function handleAddMessage() {
		const firstCharacter = $characters[0];
		if (!firstCharacter) return;
		addMessageForCharacter(firstCharacter.id);
	}

	function handleDeleteMessage(messageId: string) {
		deleteMessage(messageId);
	}

	function handleMessageCharacterChange(messageId: string, characterId: string) {
		updateMessage(messageId, { characterId });
	}

	function handleMessageReplyChange(messageId: string, replyTo: string | null) {
		updateMessage(messageId, { replyTo });
	}

	function handleMoveMessage(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		const ordered = orderedMessages;
		if (fromIndex < 0 || fromIndex >= ordered.length || toIndex < 0 || toIndex >= ordered.length) return;

		// Rebuild flow connections to reflect the new order
		const newOrder = [...ordered];
		const [moved] = newOrder.splice(fromIndex, 1);
		newOrder.splice(toIndex, 0, moved);

		// Remove all existing flow connections
		const flowConnections = $connections.filter((c) => c.type === 'flow');
		for (const conn of flowConnections) {
			deleteConnection(conn.id);
		}

		// Create new flow connections based on the new order
		for (let i = 0; i < newOrder.length - 1; i++) {
			addConnection({
				from: newOrder[i].id,
				to: newOrder[i + 1].id,
				type: 'flow',
				color: '#6b7280'
			});
		}
	}

	function handleDragStart(index: number) {
		dragSourceIndex = index;
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		dragOverIndex = index;
	}

	function handleDrop(index: number) {
		if (dragSourceIndex !== null && dragSourceIndex !== index) {
			handleMoveMessage(dragSourceIndex, index);
		}
		dragSourceIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		dragSourceIndex = null;
		dragOverIndex = null;
	}

	function handleKeyboardShortcut(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
		}
	}

	function handleCharacterEditorClose() {
		editingCharacter.set(null);
	}

	// Get the character being edited
	const editingCharacterData = $derived(
		$editingCharacter ? $characters.find(c => c.id === $editingCharacter) ?? null : null
	);
	const messageCountByCharacter = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const message of $messages) {
			if (!message.characterId) continue;
			counts[message.characterId] = (counts[message.characterId] ?? 0) + 1;
		}
		return counts;
	});

	function buildConversationJson(): string {
		const characterById = new Map($characters.map((character) => [character.id, character.username]));
		const orderedMessages =
			animationTimeline.orderedMessages.length > 0 ? animationTimeline.orderedMessages : $messages;

			const conversation = orderedMessages.map((message) => {
				const payload: {
					id: string;
					speaker: string;
					characterId?: string;
					text: string;
					timestamp: string;
					replyTo?: string;
				} = {
					id: message.id,
					speaker: characterById.get(message.characterId ?? '') ?? 'Speaker',
					text: message.text,
					timestamp: message.timestamp
				};

				if (message.characterId) {
					payload.characterId = message.characterId;
				}

				if (message.replyTo) {
					payload.replyTo = message.replyTo;
				}

			return payload;
		});

		return JSON.stringify(
			{
				conversation
			},
			null,
			2
		);
	}

	function buildConversationSignature(): string {
		const characterSignature = $characters
			.map((character) => `${character.id}:${character.username}`)
			.join('|');
		const orderedMessages =
			animationTimeline.orderedMessages.length > 0 ? animationTimeline.orderedMessages : $messages;
		const messageSignature = orderedMessages
			.map(
				(message) =>
					`${message.id}:${message.characterId ?? ''}:${message.replyTo ?? ''}:${message.timestamp}:${message.text}`
			)
			.join('|');
		return `${characterSignature}::${messageSignature}`;
	}

	const conversationSyncSignature = $derived.by(() => buildConversationSignature());

	$effect(() => {
		conversationSyncSignature;
		updateJsonFromConversation();
	});

	function asRecord(value: unknown): Record<string, unknown> | null {
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	}

	function applyJsonPayload(payload: unknown) {
		const record = asRecord(payload);
		const hasProjectShape =
			record &&
			(Array.isArray(record.characters) ||
				Array.isArray(record.messages) ||
				Array.isArray(record.connections));

		if (hasProjectShape) {
			importProjectData(record);
			return;
		}

		const nestedProject = record ? asRecord(record.project) : null;
		const hasNestedProjectShape =
			nestedProject &&
			(Array.isArray(nestedProject.characters) ||
				Array.isArray(nestedProject.messages) ||
				Array.isArray(nestedProject.connections));

		if (hasNestedProjectShape) {
			importProjectData(nestedProject);
			return;
		}

		importConversationFromJSON(payload);
	}

	function applyJsonEditorChanges(options: { switchToConversation: boolean }): boolean {
		try {
			const payload = JSON.parse(jsonEditorValue);
			applyJsonPayload(payload);
			jsonEditorError = null;
			jsonEditorStatus = 'Conversation JSON applied successfully.';
			jsonEditorDirty = false;
			jsonEditorValue = buildConversationJson();
			if (options.switchToConversation) {
				editorView = 'conversation';
			}
			return true;
		} catch (error) {
			jsonEditorStatus = null;
			jsonEditorError =
				error instanceof Error
					? error.message
					: 'Invalid JSON. Use an array (or conversation/messages array) with speaker + text.';
			return false;
		}
	}

	function setEditorMode(mode: 'conversation' | 'json') {
		if (mode === 'conversation' && editorView === 'json' && jsonEditorDirty) {
			applyJsonEditorChanges({ switchToConversation: true });
			return;
		}

		editorView = mode;
		jsonEditorError = null;
		jsonEditorStatus = null;
		if (mode === 'json') {
			jsonEditorValue = buildConversationJson();
			jsonEditorDirty = false;
		}
	}

	function handleJsonApply() {
		applyJsonEditorChanges({ switchToConversation: true });
	}

	function handleJsonReset() {
		jsonEditorValue = buildConversationJson();
		jsonEditorError = null;
		jsonEditorStatus = 'Conversation JSON reset from current state.';
		jsonEditorDirty = false;
	}

	function handleJsonEditorInput() {
		jsonEditorDirty = true;
		jsonEditorError = null;
		jsonEditorStatus = null;
	}

	function handlePreviewSendMessage(payload: {
		text: string;
		characterId?: string | null;
		replyTo?: string | null;
	}) {
		const createdId = sendMessageFromPreview(payload);
		if (!createdId) return;
		if (editorView === 'json' && jsonEditorDirty) {
			jsonEditorStatus =
				'Preview added a message. Use Reset to sync JSON or Apply JSON to replace conversation.';
		} else {
			jsonEditorStatus = null;
		}
		jsonEditorError = null;
	}

	function handleCharacterManagerCreate(payload: {
		username: string;
		avatar: string;
		roleColor: string;
	}) {
		addCharacter({
			username: payload.username,
			avatar: payload.avatar,
			roleColor: payload.roleColor,
			position: { x: 0, y: 0 }
		});
	}

	function handleCharacterManagerEdit(characterId: string) {
		editingCharacter.set(characterId);
		isCharacterManagerOpen = false;
	}

	function handleCharacterManagerDelete(characterId: string) {
		deleteElement(characterId, 'character');
		if ($editingCharacter === characterId) {
			editingCharacter.set(null);
		}
	}

	function handleSceneCreate(name: string, description: string, aura: string, characterIds: string[]) {
		saveCurrentAsScene(name, description, aura, characterIds);
	}

	function handleSceneLoad(sceneId: string) {
		loadSceneCharacters(sceneId);
	}

	function handleSceneDelete(sceneId: string) {
		deleteScene(sceneId);
	}

	function handleConversationFix(action: ConversationFixAction): number {
		return applyConversationQAFix(action);
	}

</script>

<svelte:window onkeydown={handleKeyboardShortcut} />

{#if !$isInitialized}
	<div class="flex h-screen w-full items-center justify-center bg-background">
		<div class="flex flex-col items-center gap-4">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground">Loading project...</p>
		</div>
	</div>
{:else}
	<div class="flex h-screen w-full overflow-hidden bg-background">
	<!-- Left Sidebar -->
	<LeftSidebar />

	<!-- Main Content Area - Conversation Editor -->
	<div class="flex flex-1 flex-col border-r border-border bg-background">
		<div class="flex items-center justify-between border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur-sm">
			<div class="flex items-center gap-3">
				<Button size="sm" variant="outline" onclick={() => (isSceneManagerOpen = true)}>
					<FolderOpen class="h-4 w-4 mr-1" />
					Scenes
				</Button>
				<Button size="sm" variant="outline" onclick={() => (isCharacterManagerOpen = true)}>
					Characters
				</Button>
				<div class="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
					<Button
						size="sm"
						variant={editorView === 'conversation' ? 'default' : 'ghost'}
						class="h-7 text-xs"
						onclick={() => setEditorMode('conversation')}
					>
						Conversation
					</Button>
					<Button
						size="sm"
						variant={editorView === 'json' ? 'default' : 'ghost'}
						class="h-7 text-xs"
						onclick={() => setEditorMode('json')}
					>
						JSON
					</Button>
				</div>
			</div>
			{#if editorView === 'json'}
				<div class="flex items-center gap-2">
					<Button size="sm" variant="outline" onclick={handleJsonReset}>Reset</Button>
					<Button size="sm" onclick={handleJsonApply}>Apply JSON</Button>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground">{orderedMessages.length} messages</span>
					<Button size="sm" onclick={handleAddMessage} disabled={$characters.length === 0}>
						<Plus class="h-4 w-4 mr-1" />
						Add
					</Button>
				</div>
			{/if}
		</div>

		<div class="flex-1 overflow-hidden">
			{#if editorView === 'conversation'}
				<div class="h-full overflow-y-auto">
					{#if $characters.length === 0}
						<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
							<p class="text-sm text-muted-foreground">
								No characters yet. Create characters first to start building your conversation.
							</p>
							<Button size="sm" onclick={() => (isCharacterManagerOpen = true)}>
								Create Character
							</Button>
						</div>
					{:else if orderedMessages.length === 0}
						<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
							<p class="text-sm text-muted-foreground">
								No messages yet. Add a message to start building your conversation.
							</p>
							<Button size="sm" onclick={handleAddMessage}>
								<Plus class="h-4 w-4 mr-1" />
								Add Message
							</Button>
						</div>
					{:else}
						<div class="flex flex-col gap-0.5 p-2">
							{#each orderedMessages as message, index (message.id)}
								{@const character = characterMap.get(message.characterId ?? '')}
								{@const replyToMessage = message.replyTo ? orderedMessages.find(m => m.id === message.replyTo) : null}
								{@const replyCharacter = replyToMessage?.characterId ? characterMap.get(replyToMessage.characterId) : null}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="group relative rounded-lg border border-transparent transition-colors hover:border-border hover:bg-accent/40 {dragOverIndex === index ? 'border-primary bg-primary/10' : ''}"
									role="listitem"
									draggable="true"
									ondragstart={() => handleDragStart(index)}
									ondragover={(e) => handleDragOver(e, index)}
									ondrop={() => handleDrop(index)}
									ondragend={handleDragEnd}
								>
									<!-- Top row: drag handle, number, speaker, reply picker, delete -->
									<div class="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
										<div class="flex-shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-50 active:cursor-grabbing">
											<GripVertical class="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										<span class="flex-shrink-0 text-[10px] font-medium text-muted-foreground/60 w-4 text-center">
											{index + 1}
										</span>
										<Select
											type="single"
											value={message.characterId ?? ''}
											onValueChange={(value) => handleMessageCharacterChange(message.id, value)}
										>
											<SelectTrigger class="h-6 w-auto min-w-[5rem] max-w-[8rem] border-0 bg-transparent px-1.5 py-0 text-[11px] font-semibold shadow-none focus-visible:ring-0">
												{#if character}
													<div class="flex items-center gap-1.5 truncate">
														<div
															class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
															style="background-color: {character.roleColor};"
														></div>
														<span class="truncate">{character.username}</span>
													</div>
												{:else}
													<span class="text-muted-foreground">Speaker</span>
												{/if}
											</SelectTrigger>
											<SelectContent>
												{#each $characters as char (char.id)}
													<SelectItem value={char.id}>
														<div class="flex items-center gap-1.5">
															<div
																class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
																style="background-color: {char.roleColor};"
															></div>
															{char.username}
														</div>
													</SelectItem>
												{/each}
											</SelectContent>
										</Select>
										<div class="flex-1"></div>
										<!-- Reply picker -->
										{#if index > 0}
											<div class="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
												<Select
													type="single"
													value={message.replyTo ?? ''}
													onValueChange={(value) => handleMessageReplyChange(message.id, value || null)}
												>
													<SelectTrigger class="h-6 w-6 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" title="Reply to...">
														<Reply class="h-3 w-3 text-muted-foreground" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="">No reply</SelectItem>
														{#each orderedMessages.slice(0, index) as prevMsg, prevIndex (prevMsg.id)}
															{@const prevChar = characterMap.get(prevMsg.characterId ?? '')}
															<SelectItem value={prevMsg.id}>
																<span class="text-xs">
																	#{prevIndex + 1} {prevChar?.username ?? 'Unknown'}: {prevMsg.text.slice(0, 30)}{prevMsg.text.length > 30 ? '...' : ''}
																</span>
															</SelectItem>
														{/each}
													</SelectContent>
												</Select>
											</div>
										{/if}
										<!-- Delete -->
										<button
											class="flex-shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
											title="Delete message"
											onclick={() => handleDeleteMessage(message.id)}
										>
											<Trash2 class="h-3 w-3" />
										</button>
									</div>

									<!-- Message text row -->
									<div class="px-2 pb-1.5 pl-[3.25rem]">
										{#if replyToMessage}
											<div class="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
												<Reply class="h-2.5 w-2.5 flex-shrink-0" />
												<span class="truncate">
													{replyCharacter?.username ?? 'Unknown'}: {replyToMessage.text.slice(0, 40)}{replyToMessage.text.length > 40 ? '...' : ''}
												</span>
												<button
													class="ml-0.5 rounded text-muted-foreground hover:text-destructive"
													onclick={() => handleMessageReplyChange(message.id, null)}
												>
													&times;
												</button>
											</div>
										{/if}
										<textarea
											class="w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 text-sm leading-snug outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-border focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring"
											rows="1"
											value={message.text}
											oninput={(e) => {
												const target = e.target as HTMLTextAreaElement;
												updateMessageText(message.id, target.value);
												target.style.height = 'auto';
												target.style.height = target.scrollHeight + 'px';
											}}
											onfocus={(e) => {
												const target = e.target as HTMLTextAreaElement;
												target.style.height = 'auto';
												target.style.height = target.scrollHeight + 'px';
											}}
											placeholder="Type message..."
										></textarea>
									</div>
								</div>
							{/each}

							<!-- Add message button at bottom -->
							<div class="flex justify-center py-2">
								<Button size="sm" variant="ghost" class="h-7 text-xs text-muted-foreground" onclick={handleAddMessage} disabled={$characters.length === 0}>
									<Plus class="h-3.5 w-3.5 mr-1" />
									Add message
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex h-full flex-col gap-3 p-4">
					<p class="text-xs text-muted-foreground">
						Use JSON for bulk creation/import. Apply replaces current conversation.
					</p>
					<textarea
						class="h-full min-h-0 w-full flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
						bind:value={jsonEditorValue}
						oninput={handleJsonEditorInput}
						spellcheck="false"
					></textarea>
					{#if jsonEditorError}
						<p class="text-xs text-destructive">{jsonEditorError}</p>
					{:else if jsonEditorStatus}
						<p class="text-xs text-emerald-600">{jsonEditorStatus}</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Preview Panel -->
	<div class="w-[400px] flex-shrink-0 border-r border-border bg-gradient-to-b from-card to-card/50">
		<div class="flex h-full flex-col">
			<div class="flex flex-1 items-center justify-center p-8 bg-gradient-to-b from-transparent to-accent/5">
				<div class="flex flex-col items-center gap-4">
					<div bind:this={livePreviewCaptureElement}>
							<PhonePreview
								characters={$characters}
								messages={$messages}
								connections={$connections}
								previewState={$previewState}
								isGenerating={$isGenerating}
								isExporting={isExporting}
								customizeSettings={$customizeSettings}
								currentTime={videoCurrentTime}
								interactive={true}
								onSendMessage={handlePreviewSendMessage}
						/>
					</div>
					
					{#if $previewState === 'video'}
						<VideoControls
							isPlaying={isVideoPlaying}
							currentTime={videoCurrentTime}
							duration={videoDuration}
							fps={$customizeSettings.fps}
							onPlayPause={handleVideoPlayPause}
							onRestart={handleVideoRestart}
							onDownload={handleVideoDownload}
							onSeek={handleVideoSeek}
						/>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Right Panel - Customization -->
	<div class="relative h-full flex-shrink-0">
		<!-- Toggle Button -->
		<Button
			variant="ghost"
			size="icon"
			class="absolute left-0 top-1/2 z-10 h-12 w-6 -translate-x-full -translate-y-1/2 rounded-l-md rounded-r-none border border-r-0 border-border bg-card hover:bg-accent"
			onclick={() => isRightPanelCollapsed = !isRightPanelCollapsed}
		>
			{#if isRightPanelCollapsed}
				<ChevronLeft class="h-4 w-4" />
			{:else}
				<ChevronRight class="h-4 w-4" />
			{/if}
		</Button>

		<!-- Panel Content -->
		<div class="{isRightPanelCollapsed ? 'w-0' : 'w-80'} h-full overflow-hidden transition-all duration-300">
			<RightPanel
				characters={$characters}
				messages={$messages}
				connections={$connections}
				previewState={$previewState}
				isGenerating={$isGenerating}
				customizeSettings={$customizeSettings}
				musicTrackName={musicTrackName}
				hasMusicTrack={Boolean(musicTrackUrl)}
				isMusicPlaying={isMusicPlaying}
				isExporting={isExporting}
				exportProgress={exportProgress}
				onPreviewAnimation={handlePreviewAnimation}
				onMusicUpload={handleMusicUpload}
				onMusicToggle={handleMusicToggle}
				onExportVideo={handleExportVideo}
				onCancelExport={handleCancelExport}
				onCustomizationApply={handleApplyCustomization}
				onConversationFix={handleConversationFix}
			/>
		</div>
	</div>

	<!-- Character Editor Modal -->
	<CharacterManagerDialog
		open={isCharacterManagerOpen}
		onClose={() => (isCharacterManagerOpen = false)}
		characters={$characters}
		messageCountByCharacter={messageCountByCharacter}
		onCreate={handleCharacterManagerCreate}
		onEdit={handleCharacterManagerEdit}
		onDelete={handleCharacterManagerDelete}
	/>

	<SceneManagerDialog
		open={isSceneManagerOpen}
		onClose={() => (isSceneManagerOpen = false)}
		scenes={$scenes}
		characters={$characters}
		activeSceneId={$activeSceneId}
		onCreateScene={handleSceneCreate}
		onLoadScene={handleSceneLoad}
		onDeleteScene={handleSceneDelete}
		onGeneratePrompt={generateScenePrompt}
	/>

	<CharacterEditor
		character={editingCharacterData}
		open={$editingCharacter !== null}
		onClose={handleCharacterEditorClose}
	/>

</div>
{/if}
