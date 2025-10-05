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
	
	let isRightPanelCollapsed = $state(false);
	
	// Video Controls State
	let isVideoPlaying = $state(false);
	let videoCurrentTime = $state(0);
	let videoDuration = $state(100);

	function handleVideoPlayPause() {
		isVideoPlaying = !isVideoPlaying;
	}

	function handleVideoRestart() {
		videoCurrentTime = 0;
		isVideoPlaying = false;
	}

	function handleVideoDownload() {
		// TODO: Implement video download
		console.log('Downloading video...');
	}

	function handleVideoSeek(time: number) {
		videoCurrentTime = time;
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
		handleGenerateVideo,
		handleApplyCustomization,
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
</script>

<svelte:window onkeydown={handleKeyboardShortcut} />

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
		<div class="flex-1">
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
		</div>

		<!-- Bottom Toolbar -->
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
					/>
					
					{#if $previewState === 'video'}
						<VideoControls
							isPlaying={isVideoPlaying}
							currentTime={videoCurrentTime}
							duration={videoDuration}
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
	<div class="relative flex-shrink-0">
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
		<div class="{isRightPanelCollapsed ? 'w-0' : 'w-80'} overflow-hidden transition-all duration-300">
			<RightPanel
				characters={$characters}
				messages={$messages}
				connections={$connections}
				previewState={$previewState}
				isGenerating={$isGenerating}
				customizeSettings={$customizeSettings}
				onGenerateVideo={handleGenerateVideo}
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
