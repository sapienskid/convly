<script lang="ts">
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import type { Scene, Character } from '$lib/types';
	import { Plus, Pencil, Trash2, Play, Copy, Check, Sparkles, FolderOpen, Save, X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		scenes: Scene[];
		characters: Character[];
		activeSceneId: string | null;
		onCreateScene: (name: string, description: string, aura: string, characterIds: string[]) => void;
		onLoadScene: (sceneId: string) => void;
		onDeleteScene: (sceneId: string) => void;
		onGeneratePrompt: () => string;
	}

	let {
		open,
		onClose,
		scenes,
		characters,
		activeSceneId,
		onCreateScene,
		onLoadScene,
		onDeleteScene,
		onGeneratePrompt
	}: Props = $props();

	let mode = $state<'list' | 'create' | 'prompt'>('list');
	
	// Create form
	let sceneName = $state('');
	let sceneDescription = $state('');
	let sceneAura = $state('');
	let selectedCharacterIds = $state<string[]>([]);
	
	// Prompt view
	let generatedPrompt = $state('');
	let copied = $state(false);
	const activeScene = $derived.by(() => scenes.find((scene) => scene.id === activeSceneId) ?? null);
	const allCharactersSelected = $derived.by(
		() =>
			characters.length > 0 &&
			characters.every((character) => selectedCharacterIds.includes(character.id))
	);

	function resetForm() {
		sceneName = '';
		sceneDescription = '';
		sceneAura = '';
		selectedCharacterIds = [];
		mode = 'list';
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function handleCreate() {
		if (!sceneName.trim() || selectedCharacterIds.length === 0) return;
		onCreateScene(sceneName.trim(), sceneDescription.trim(), sceneAura.trim(), selectedCharacterIds);
		resetForm();
	}

	function handleLoadScene(sceneId: string) {
		onLoadScene(sceneId);
		handleClose();
	}

	function handleGeneratePrompt() {
		generatedPrompt = onGeneratePrompt();
		mode = 'prompt';
	}

	function handleRegeneratePrompt() {
		generatedPrompt = onGeneratePrompt();
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(generatedPrompt);
			copied = true;
			setTimeout(() => copied = false, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function toggleCharacter(charId: string) {
		if (selectedCharacterIds.includes(charId)) {
			selectedCharacterIds = selectedCharacterIds.filter(id => id !== charId);
		} else {
			selectedCharacterIds = [...selectedCharacterIds, charId];
		}
	}

	function toggleSelectAllCharacters() {
		if (allCharactersSelected) {
			selectedCharacterIds = [];
			return;
		}
		selectedCharacterIds = characters.map((character) => character.id);
	}

	function getSceneCharacters(scene: Scene): Character[] {
		return characters.filter(c => scene.characterIds.includes(c.id));
	}

	function formatSceneDate(value: string): string {
		try {
			return new Date(value).toLocaleString();
		} catch {
			return value;
		}
	}

	$effect(() => {
		const validCharacterIds = new Set(characters.map((character) => character.id));
		const filtered = selectedCharacterIds.filter((id) => validCharacterIds.has(id));
		if (filtered.length !== selectedCharacterIds.length) {
			selectedCharacterIds = filtered;
		}
	});
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-[600px]">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<FolderOpen class="w-5 h-5" />
				Scene Manager
			</DialogTitle>
			<DialogDescription>
				Save and load character groups with scene context
			</DialogDescription>
		</DialogHeader>

		<div class="py-2">
			{#if mode === 'list'}
				<div class="space-y-4">
					<!-- Actions -->
					<div class="flex gap-2">
						<Button variant="outline" onclick={() => mode = 'create'}>
							<Plus class="mr-2 h-4 w-4" />
							New Scene
						</Button>
						<Button variant="outline" onclick={handleGeneratePrompt} disabled={characters.length === 0}>
							<Sparkles class="mr-2 h-4 w-4" />
							Scene Prompt
						</Button>
					</div>

					<!-- Scene List -->
					<div class="max-h-[350px] space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
						{#if scenes.length === 0}
							<p class="px-2 py-8 text-center text-sm text-muted-foreground">
								No scenes yet. Create a scene to save your character group.
							</p>
						{:else}
							{#each scenes as scene (scene.id)}
								{@const sceneChars = getSceneCharacters(scene)}
								<div class="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2.5">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<p class="truncate text-sm font-medium">{scene.name}</p>
											{#if activeSceneId === scene.id}
												<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Active</span>
											{/if}
										</div>
										<p class="text-xs text-muted-foreground truncate">
											{scene.description || 'No description'}
										</p>
										{#if scene.aura}
											<p class="mt-1 truncate text-[11px] text-muted-foreground">
												Context: {scene.aura}
											</p>
										{/if}
										<div class="mt-1.5 flex items-center gap-1">
											{#each sceneChars.slice(0, 4) as char}
												<Avatar class="h-5 w-5 border border-background">
													<AvatarImage src={char.avatar} alt={char.username} />
													<AvatarFallback class="text-[8px]" style="background-color: {char.roleColor}">
														{char.username.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
											{/each}
											{#if sceneChars.length > 4}
												<span class="text-[10px] text-muted-foreground">+{sceneChars.length - 4}</span>
											{/if}
											<span class="text-[10px] text-muted-foreground ml-1">
												{sceneChars.length} char{sceneChars.length !== 1 ? 's' : ''}
											</span>
										</div>
										<p class="mt-1 text-[10px] text-muted-foreground">
											Updated: {formatSceneDate(scene.updatedAt)}
										</p>
									</div>
									<div class="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8"
											title="Load scene"
											onclick={() => handleLoadScene(scene.id)}
										>
											<Play class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
											title="Delete scene"
											onclick={() => onDeleteScene(scene.id)}
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>

			{:else if mode === 'create'}
				<div class="space-y-4">
					<div class="flex items-center gap-2 mb-4">
						<Button variant="ghost" size="icon" onclick={() => mode = 'list'}>
							<X class="h-4 w-4" />
						</Button>
						<span class="text-sm font-medium">Create New Scene</span>
					</div>

					<div class="space-y-3">
						<div class="space-y-2">
							<Label for="scene-name">Scene Name</Label>
							<Input
								id="scene-name"
								bind:value={sceneName}
								placeholder="e.g., Team Standup, Customer Support..."
							/>
						</div>

						<div class="space-y-2">
							<Label for="scene-description">Scene Description</Label>
							<Textarea
								id="scene-description"
								bind:value={sceneDescription}
								placeholder="Brief description of this scene context..."
								rows={2}
							/>
						</div>

						<div class="space-y-2">
							<Label for="scene-aura">Scene Aura / Context</Label>
							<Textarea
								id="scene-aura"
								bind:value={sceneAura}
								placeholder="Additional context about the scene, setting, or situation..."
								rows={2}
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label>Select Characters</Label>
								<Button variant="ghost" size="sm" onclick={toggleSelectAllCharacters} class="h-6 text-xs">
									{allCharactersSelected ? 'Deselect All' : 'Select All'}
								</Button>
							</div>
							<div class="max-h-[150px] space-y-1.5 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
								{#if characters.length === 0}
									<p class="text-xs text-muted-foreground text-center py-4">
										No characters available. Create characters first.
									</p>
								{:else}
									{#each characters as char (char.id)}
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors {selectedCharacterIds.includes(char.id) ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted'}"
											onclick={() => toggleCharacter(char.id)}
										>
											<input
												type="checkbox"
												checked={selectedCharacterIds.includes(char.id)}
												class="h-3.5 w-3.5 rounded border-border"
												onclick={(e) => e.stopPropagation()}
												onchange={() => toggleCharacter(char.id)}
											/>
											<Avatar class="h-6 w-6">
												<AvatarImage src={char.avatar} alt={char.username} />
												<AvatarFallback class="text-[8px]" style="background-color: {char.roleColor}">
													{char.username.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span class="text-sm truncate">{char.username}</span>
										</button>
									{/each}
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">
								{selectedCharacterIds.length} character{selectedCharacterIds.length !== 1 ? 's' : ''} selected
							</p>
						</div>

						<Button class="w-full" onclick={handleCreate} disabled={!sceneName.trim() || selectedCharacterIds.length === 0}>
							<Save class="mr-2 h-4 w-4" />
							Save Scene
						</Button>
					</div>
				</div>

			{:else if mode === 'prompt'}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Button variant="ghost" size="icon" onclick={() => mode = 'list'}>
								<X class="h-4 w-4" />
							</Button>
							<span class="text-sm font-medium">Scene Prompt</span>
						</div>
						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" onclick={handleRegeneratePrompt}>
								<Sparkles class="mr-2 h-4 w-4" />
								Regenerate
							</Button>
							<Button variant="outline" size="sm" onclick={copyToClipboard}>
								{#if copied}
									<Check class="mr-2 h-4 w-4" />
									Copied!
								{:else}
									<Copy class="mr-2 h-4 w-4" />
									Copy
								{/if}
							</Button>
						</div>
					</div>

					<div class="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
						<p class="font-medium text-foreground">Current Scene Details</p>
						<p class="mt-1">Name: {activeScene?.name ?? 'None selected'}</p>
						<p>Description: {activeScene?.description || 'N/A'}</p>
						<p>Context: {activeScene?.aura || 'N/A'}</p>
						<p>Characters: {activeScene ? activeScene.characterIds.length : characters.length}</p>
					</div>

					<div class="rounded-lg border border-border bg-muted/30 p-3">
						<Label for="scene-prompt-editor" class="mb-2 block text-xs font-medium text-foreground">
							Editable Prompt
						</Label>
						<Textarea
							id="scene-prompt-editor"
							bind:value={generatedPrompt}
							rows={16}
							class="font-mono text-xs leading-relaxed"
						/>
					</div>
				</div>
			{/if}
		</div>
	</DialogContent>
</Dialog>
