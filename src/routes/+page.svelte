<script lang="ts">
	import CanvasWorkspace from '$lib/components/workspace/CanvasWorkspace.svelte';
	import LeftSidebar from '$lib/components/workspace/LeftSidebar.svelte';
	import RightPanel from '$lib/components/workspace/RightPanel.svelte';
	import PhonePreview from '$lib/components/workspace/PhonePreview.svelte';
	import VideoControls from '$lib/components/workspace/VideoControls.svelte';
	import BottomToolbar from '$lib/components/workspace/BottomToolbar.svelte';
	import CharacterEditor from '$lib/components/workspace/CharacterEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, ChevronLeft } from 'lucide-svelte/icons';
	import { onMount } from 'svelte';
	import { initializeStore, isInitialized } from '$lib/stores/appStore';
	import { buildMessageAnimationTimeline } from '$lib/utils/animationTimeline';
	
	let isRightPanelCollapsed = $state(false);
	let editorView = $state<'graph' | 'json'>('graph');
	let jsonEditorValue = $state('');
	let jsonEditorError = $state<string | null>(null);
	let jsonEditorStatus = $state<string | null>(null);
	
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
	const videoDuration = $derived(animationTimeline.totalDuration);
	let lastPreviewMode = $state<'preview' | 'loading' | 'video'>('preview');
	const NOTIFICATION_EPSILON = 0.0001;

	function getResolutionPreset(resolution: string) {
		const presets: Record<string, { width: number; height: number; aspectRatio: string; platform: string }> = {
			'vertical-1080x1920': { width: 1080, height: 1920, aspectRatio: '9:16', platform: 'vertical' }
		};
		return presets[resolution] ?? presets['vertical-1080x1920'];
	}

	function resetNotificationCursor(timeSeconds: number) {
		if (timeSeconds <= NOTIFICATION_EPSILON) {
			nextNotificationIndex = 0;
			return;
		}

		const index = animationTimeline.entries.findIndex(
			(entry) => entry.start >= timeSeconds - NOTIFICATION_EPSILON
		);
		nextNotificationIndex = index === -1 ? animationTimeline.entries.length : index;
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
			isVideoPlaying = videoDuration > 0;
			resetNotificationCursor(0);
			if (backgroundMusicAudio) {
				backgroundMusicAudio.currentTime = 0;
			}
			isMusicPlaying = isVideoPlaying && Boolean(musicTrackUrl) && ($customizeSettings.musicEnabled ?? true);
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

		const entries = animationTimeline.entries;
		if (!($customizeSettings.notificationSoundEnabled ?? true)) {
			while (
				nextNotificationIndex < entries.length &&
				entries[nextNotificationIndex].start <= videoCurrentTime + NOTIFICATION_EPSILON
			) {
				nextNotificationIndex += 1;
			}
			return;
		}

		while (
			nextNotificationIndex < entries.length &&
			entries[nextNotificationIndex].start <= videoCurrentTime + NOTIFICATION_EPSILON
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

		const fps = Math.max($customizeSettings.fps, 1);
		const speed = Math.max($customizeSettings.animationSpeed, 0.1);
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
		if (videoDuration <= 0) return;
		previewState.set('video');
		isVideoPlaying = false;
		isMusicPlaying = false;
		videoCurrentTime = 0;
		resetNotificationCursor(0);
		handleVideoDownload();
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
		link.download = `convly-export-${channelSlug || 'channel'}-${Date.now()}.json`;
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
		selectedTool,
		selectedElement,
		editingCharacter,
		previewState,
		isGenerating,
		customizeSettings,
		updateCharacterPosition,
		updateMessagePosition,
		updateMessageText,
		updateCharacter,
		addMessageForCharacter,
		handleApplyCustomization,
		importConversationFromJSON,
		deleteElement,
		addCharacter,
		addMessage
	} from '$lib/stores/appStore';
	import type { Tool } from '$lib/types';

	function handleToolSelect(tool: Tool) {
		selectedTool.set(tool);
		// Deselect element when switching tools
		if (tool !== 'select') {
			selectedElement.set(null);
		}
	}

	function handleKeyboardShortcut(event: KeyboardEvent) {
		// Ignore if typing in an input/textarea
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		// Tool shortcuts
		switch (event.key.toLowerCase()) {
			case 'v':
				event.preventDefault();
				handleToolSelect('select');
				break;
			case 'h':
				event.preventDefault();
				handleToolSelect('pan');
				break;
			case 'c':
				event.preventDefault();
				handleToolSelect('character');
				break;
			case 'm':
				event.preventDefault();
				handleToolSelect('message');
				break;
			case 'escape':
				event.preventDefault();
				selectedElement.set(null);
				handleToolSelect('select');
				break;
		}
		
		// Delete shortcut
		if (event.key === 'Delete' || event.key === 'Backspace') {
			if ($selectedElement && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
				event.preventDefault();
				handleDelete();
			}
		}
		
		// Duplicate shortcut (Ctrl/Cmd + D)
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
			if ($selectedElement) {
				event.preventDefault();
				handleDuplicate();
			}
		}
	}

	function handleElementSelect(id: string | null) {
		selectedElement.set(id);
	}

	function handleCharacterEdit(id: string) {
		editingCharacter.set(id);
	}

	function handleCharacterUsernameUpdate(id: string, username: string) {
		updateCharacter(id, { username });
	}

	function handleCharacterEditorClose() {
		editingCharacter.set(null);
	}

	// Get the character being edited
	const editingCharacterData = $derived(
		$editingCharacter ? $characters.find(c => c.id === $editingCharacter) ?? null : null
	);

	function handleDelete() {
		const element = $selectedElement;
		if (!element) return;
		
		const char = $characters.find(c => c.id === element);
		const msg = $messages.find(m => m.id === element);
		
		if (char) {
			deleteElement(element, 'character');
		} else if (msg) {
			deleteElement(element, 'message');
		}
		selectedElement.set(null);
	}

	function handleDuplicate() {
		const element = $selectedElement;
		if (!element) return;
		
		const char = $characters.find(c => c.id === element);
		const msg = $messages.find(m => m.id === element);
		
		if (char) {
			const newChar = {
				username: char.username + ' (Copy)',
				avatar: char.avatar,
				roleColor: char.roleColor,
				position: { x: char.position.x + 50, y: char.position.y + 50 }
			};
			const newId = addCharacter(newChar);
			selectedElement.set(newId);
		} else if (msg) {
			const newMsg = {
				characterId: msg.characterId,
				text: msg.text,
				position: { x: msg.position.x + 50, y: msg.position.y + 50 },
				timestamp: new Date().toISOString()
			};
			const newId = addMessage(newMsg);
			selectedElement.set(newId);
		}
	}

	function buildConversationJson(): string {
		const characterById = new Map($characters.map((character) => [character.id, character.username]));
		const orderedMessages =
			animationTimeline.orderedMessages.length > 0 ? animationTimeline.orderedMessages : $messages;

		const conversation = orderedMessages.map((message) => {
			const payload: {
				id: string;
				speaker: string;
				text: string;
				timestamp: string;
				replyTo?: string;
			} = {
				id: message.id,
				speaker: characterById.get(message.characterId ?? '') ?? 'Speaker',
				text: message.text,
				timestamp: message.timestamp
			};

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

	function setEditorMode(mode: 'graph' | 'json') {
		editorView = mode;
		jsonEditorError = null;
		jsonEditorStatus = null;
		if (mode === 'json') {
			jsonEditorValue = buildConversationJson();
		}
	}

	function handleJsonApply() {
		try {
			const payload = JSON.parse(jsonEditorValue);
			importConversationFromJSON(payload);
			jsonEditorError = null;
			jsonEditorStatus = 'Conversation JSON applied successfully.';
		} catch (error) {
			jsonEditorStatus = null;
			jsonEditorError =
				error instanceof Error
					? error.message
					: 'Invalid JSON. Use an array (or conversation/messages array) with speaker + text.';
		}
	}

	function handleJsonReset() {
		jsonEditorValue = buildConversationJson();
		jsonEditorError = null;
		jsonEditorStatus = 'Conversation JSON reset from current graph.';
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
	<LeftSidebar
		selectedTool={$selectedTool}
		onToolSelect={handleToolSelect}
		selectedElement={$selectedElement}
		elementCount={{
			characters: $characters.length,
			messages: $messages.length,
			connections: $connections.length
		}}
	/>

	<!-- Main Content Area - Canvas Workspace -->
	<div class="flex flex-1 flex-col border-r border-border bg-background">
		<div class="flex items-center justify-between border-b border-border bg-card/60 px-3 py-2">
			<div class="inline-flex rounded-md border border-border bg-muted/30 p-1">
				<Button
					size="sm"
					variant={editorView === 'graph' ? 'default' : 'ghost'}
					onclick={() => setEditorMode('graph')}
				>
					Graph
				</Button>
				<Button
					size="sm"
					variant={editorView === 'json' ? 'default' : 'ghost'}
					onclick={() => setEditorMode('json')}
				>
					JSON
				</Button>
			</div>
			{#if editorView === 'json'}
				<div class="flex items-center gap-2">
					<Button size="sm" variant="outline" onclick={handleJsonReset}>Reset</Button>
					<Button size="sm" onclick={handleJsonApply}>Apply JSON</Button>
				</div>
			{/if}
		</div>

		<div class="flex-1">
			{#if editorView === 'graph'}
				<CanvasWorkspace
					characters={$characters}
					messages={$messages}
					connections={$connections}
					selectedTool={$selectedTool}
					selectedElement={$selectedElement}
					onCharacterMove={updateCharacterPosition}
					onMessageMove={updateMessagePosition}
					onMessageTextUpdate={updateMessageText}
					onCharacterUsernameUpdate={handleCharacterUsernameUpdate}
					onElementSelect={handleElementSelect}
					onAddMessage={addMessageForCharacter}
					onCharacterEdit={handleCharacterEdit}
				/>
				{:else}
					<div class="flex h-full flex-col gap-3 p-4">
						<p class="text-xs text-muted-foreground">
							Edit only conversation messages as JSON. Use
							<span class="font-semibold">Apply JSON</span> to rebuild the graph.
						</p>
					<textarea
						class="h-full min-h-0 w-full flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
						bind:value={jsonEditorValue}
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

		<!-- Bottom Toolbar -->
		{#if editorView === 'graph'}
			<BottomToolbar
				selectedTool={$selectedTool}
				onToolSelect={handleToolSelect}
				selectedElement={$selectedElement}
				elementCount={{
					characters: $characters.length,
					messages: $messages.length,
					connections: $connections.length
				}}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
			/>
		{/if}
	</div>

	<!-- Preview Panel -->
	<div class="w-[400px] flex-shrink-0 border-r border-border bg-gradient-to-b from-card to-card/50">
		<div class="flex h-full flex-col">
			<!-- Enhanced Header -->
			<div class="border-b border-border bg-card/80 backdrop-blur-sm p-5">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-bold">Live Preview</h2>
							<p class="text-xs text-muted-foreground">Real-time visualization</p>
						</div>
					</div>
				</div>
				<!-- Stats -->
				<div class="flex items-center gap-4 text-xs">
					<div class="flex items-center gap-1.5">
						<div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
						<span class="text-muted-foreground">{$characters.length} Characters</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-2 w-2 rounded-full bg-blue-500"></div>
						<span class="text-muted-foreground">{$messages.length} Messages</span>
					</div>
				</div>
			</div>
			<div class="flex flex-1 items-center justify-center p-8 bg-gradient-to-b from-transparent to-accent/5">
				<div class="flex flex-col items-center gap-4">
					<PhonePreview
						characters={$characters}
						messages={$messages}
						connections={$connections}
						previewState={$previewState}
						isGenerating={$isGenerating}
						customizeSettings={$customizeSettings}
						currentTime={videoCurrentTime}
					/>
					
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
				onPreviewAnimation={handlePreviewAnimation}
				onMusicUpload={handleMusicUpload}
				onMusicToggle={handleMusicToggle}
				onExportVideo={handleExportVideo}
				onCustomizationApply={handleApplyCustomization}
			/>
		</div>
	</div>

	<!-- Character Editor Modal -->
	<CharacterEditor
		character={editingCharacterData}
		open={$editingCharacter !== null}
		onClose={handleCharacterEditorClose}
	/>
</div>
{/if}
