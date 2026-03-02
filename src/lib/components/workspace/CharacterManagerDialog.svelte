<script lang="ts">
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import type { Character } from '$lib/types';
	import { Plus, Pencil, Trash2, Sparkles, Users } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		characters: Character[];
		messageCountByCharacter: Record<string, number>;
		onCreate: (payload: { username: string; avatar: string; roleColor: string }) => void;
		onEdit: (characterId: string) => void;
		onDelete: (characterId: string) => void;
	}

	let {
		open,
		onClose,
		characters,
		messageCountByCharacter,
		onCreate,
		onEdit,
		onDelete
	}: Props = $props();

	let username = $state('');
	let avatarSeed = $state('new-speaker');
	let avatarStyle = $state<'bottts' | 'avataaars' | 'pixel-art' | 'lorelei' | 'notionists'>('bottts');
	let roleColor = $state('#2563eb');

	const avatarStyles = [
		{ value: 'bottts', label: 'Robots' },
		{ value: 'avataaars', label: 'Cartoon' },
		{ value: 'pixel-art', label: 'Pixel' },
		{ value: 'lorelei', label: 'Abstract' },
		{ value: 'notionists', label: 'Notion' }
	];

	const rolePalette = ['#ef4444', '#ff6f3b', '#0ea5a4', '#2563eb', '#f59e0b', '#64748b'] as const;

	const draftAvatarUrl = $derived(
		`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(
			avatarSeed || username || 'new-speaker'
		)}&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90`
	);

	function randomizeSeed() {
		avatarSeed = Math.random().toString(36).slice(2, 9);
	}

	function resetDraft() {
		username = '';
		avatarSeed = 'new-speaker';
		avatarStyle = 'bottts';
		roleColor = '#2563eb';
	}

	function handleCreateCharacter() {
		const normalizedUsername = username.trim();
		if (!normalizedUsername) return;

		onCreate({
			username: normalizedUsername,
			avatar: draftAvatarUrl,
			roleColor
		});

		resetDraft();
	}

	function handleClose() {
		resetDraft();
		onClose();
	}
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-[760px]">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Character Manager
			</DialogTitle>
			<DialogDescription>
				Create and manage speakers from one place.
			</DialogDescription>
		</DialogHeader>

		<div class="grid gap-5 py-2 md:grid-cols-[1.1fr_1fr]">
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-foreground">Current Characters</h3>
				<div class="max-h-[360px] space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
					{#if characters.length === 0}
						<p class="px-2 py-8 text-center text-sm text-muted-foreground">
							No characters yet.
						</p>
					{:else}
						{#each characters as character (character.id)}
							<div class="flex items-center gap-3 rounded-md border border-border/60 bg-card px-2.5 py-2">
								<Avatar class="h-9 w-9 shrink-0">
									<AvatarImage src={character.avatar} alt={character.username} />
									<AvatarFallback
										class="text-xs font-semibold text-white"
										style="background-color: {character.roleColor}"
									>
										{character.username.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium" style="color: {character.roleColor}">
										{character.username}
									</p>
									<p class="text-xs text-muted-foreground">
										{messageCountByCharacter[character.id] ?? 0} messages
									</p>
								</div>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										title="Edit character"
										onclick={() => onEdit(character.id)}
									>
										<Pencil class="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
										title="Delete character"
										onclick={() => onDelete(character.id)}
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3.5">
				<h3 class="text-sm font-semibold text-foreground">Create Character</h3>

				<div class="space-y-2">
					<Label for="character-name">Username</Label>
					<Input
						id="character-name"
						bind:value={username}
						placeholder="Enter username..."
					/>
				</div>

				<div class="space-y-2">
					<Label for="avatar-seed">Avatar Seed</Label>
					<div class="flex items-center gap-2">
						<Input
							id="avatar-seed"
							bind:value={avatarSeed}
							placeholder="avatar seed"
						/>
						<Button type="button" variant="outline" size="icon" onclick={randomizeSeed}>
							<Sparkles class="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div class="space-y-2">
					<Label>Avatar Style</Label>
					<Select
						type="single"
						bind:value={avatarStyle}
						items={avatarStyles}
						onValueChange={(value) => {
							avatarStyle = value as typeof avatarStyle;
						}}
					>
						<SelectTrigger>
							<span data-slot="select-value">
								{avatarStyles.find((style) => style.value === avatarStyle)?.label ?? 'Choose style'}
							</span>
						</SelectTrigger>
						<SelectContent>
							{#each avatarStyles as style}
								<SelectItem value={style.value} label={style.label}>{style.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label>Role Color</Label>
					<div class="flex items-center gap-2">
						{#each rolePalette as swatch}
							<button
								type="button"
								class="h-6 w-6 rounded-full border transition-transform hover:scale-105 {roleColor === swatch ? 'ring-2 ring-ring ring-offset-1 ring-offset-background' : 'border-border'}"
								style="background-color: {swatch}"
								onclick={() => (roleColor = swatch)}
								aria-label="Set role color to {swatch}"
							></button>
						{/each}
						<input
							type="color"
							class="ml-auto h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							bind:value={roleColor}
							aria-label="Choose custom role color"
						/>
					</div>
				</div>

				<div class="flex items-center gap-3 rounded-md border border-border/70 bg-card px-3 py-2.5">
					<Avatar class="h-10 w-10">
						<AvatarImage src={draftAvatarUrl} alt={username || 'New character'} />
						<AvatarFallback class="text-xs font-semibold text-white" style="background-color: {roleColor}">
							{(username || 'NC').slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium" style="color: {roleColor}">
							{username || 'New Character'}
						</p>
						<p class="text-xs text-muted-foreground">Preview</p>
					</div>
				</div>

				<Button class="w-full" onclick={handleCreateCharacter} disabled={!username.trim()}>
					<Plus class="mr-2 h-4 w-4" />
					Add Character
				</Button>
			</div>
		</div>
	</DialogContent>
</Dialog>
