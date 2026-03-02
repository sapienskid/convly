<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import type { Character } from '$lib/types';
	import { updateCharacter } from '$lib/stores/appStore';
	import { User, Palette, Shield } from '@lucide/svelte';

	interface Props {
		character: Character | null;
		open: boolean;
		onClose: () => void;
	}

	let { character, open, onClose }: Props = $props();

	// Avatar generation state
	let avatarSeed = $state(character?.username || 'default');
	let avatarStyle = $state<'pixel-art' | 'bottts' | 'avataaars' | 'lorelei' | 'notionists'>('bottts');
	let username = $state(character?.username || '');
	let roleColor = $state(character?.roleColor || '#ff6f3b');
	let roleTitle = $state<string>('Member');

	// Predefined role colors and titles
	const roles = [
		{ title: 'Owner', color: '#ef4444' },
		{ title: 'Admin', color: '#ff6f3b' },
		{ title: 'Moderator', color: '#0ea5a4' },
		{ title: 'Member', color: '#2563eb' },
		{ title: 'VIP', color: '#f59e0b' },
		{ title: 'Guest', color: '#64748b' }
	];

	const avatarStyles = [
		{ value: 'bottts', label: 'Robots' },
		{ value: 'avataaars', label: 'Cartoon' },
		{ value: 'pixel-art', label: 'Pixel Art' },
		{ value: 'lorelei', label: 'Abstract' },
		{ value: 'notionists', label: 'Notion Style' }
	];

	// Generate avatar URL using DiceBear API (similar to Avatartion)
	const generateAvatarUrl = $derived(
		`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90`
	);

	// Update form when character changes
	$effect(() => {
		if (character) {
			username = character.username;
			roleColor = character.roleColor;
			avatarSeed = character.username;
			
			// Try to match existing role color to a predefined role
			const matchedRole = roles.find(r => r.color === character.roleColor);
			roleTitle = matchedRole?.title || 'Member';
		}
	});

	function handleSave() {
		if (!character) return;

		updateCharacter(character.id, {
			username: username.trim(),
			avatar: generateAvatarUrl,
			roleColor: roleColor
		});

		onClose();
	}

	function handleRoleSelect(title: string) {
		const role = roles.find(r => r.title === title);
		if (role) {
			roleTitle = title;
			roleColor = role.color;
		}
	}

	function randomizeAvatar() {
		avatarSeed = Math.random().toString(36).substring(7);
	}
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
	<DialogContent class="sm:max-w-[500px]">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<User class="w-5 h-5" />
				Edit Character
			</DialogTitle>
			<DialogDescription>
				Customize the character's appearance and role
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-6 py-4">
			<!-- Avatar Preview & Generation -->
			<div class="space-y-3">
				<Label class="flex items-center gap-2">
					<Palette class="w-4 h-4" />
					Avatar
				</Label>
				<div class="flex items-center gap-4">
					<Avatar class="w-24 h-24 border-4" style="border-color: {roleColor}">
						<AvatarImage src={generateAvatarUrl} alt={username} />
						<AvatarFallback class="text-2xl font-bold text-white" style="background-color: {roleColor}">
							{username.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div class="flex-1 space-y-2">
						<div class="flex gap-2">
							<Input
								bind:value={avatarSeed}
								placeholder="Avatar seed..."
								class="flex-1"
							/>
							<Button onclick={randomizeAvatar} variant="outline" size="icon">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</Button>
						</div>
						<Select
							type="single"
							bind:value={avatarStyle}
							items={avatarStyles}
							onValueChange={() => {}}
						>
							<SelectTrigger>
								<span data-slot="select-value">
									{avatarStyles.find(s => s.value === avatarStyle)?.label || 'Select style'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each avatarStyles as style}
									<SelectItem value={style.value} label={style.label}>{style.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
				<p class="text-xs text-muted-foreground">
					Change the seed or style to generate a new avatar
				</p>
			</div>

			<!-- Username -->
			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input
					id="username"
					bind:value={username}
					placeholder="Enter username..."
					class="font-medium"
				/>
			</div>

			<!-- Role Selection -->
			<div class="space-y-3">
				<Label class="flex items-center gap-2">
					<Shield class="w-4 h-4" />
					Role
				</Label>
				<div class="grid grid-cols-3 gap-2">
					{#each roles as role}
						<button
							type="button"
							onclick={() => handleRoleSelect(role.title)}
							class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 {roleTitle === role.title ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}"
						>
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
								style="background-color: {role.color}"
							>
								{role.title.slice(0, 1)}
							</div>
							<span class="text-xs font-medium">{role.title}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Custom Color -->
			<div class="space-y-2">
				<Label for="roleColor">Custom Role Color</Label>
				<div class="flex gap-2 items-center">
					<input
						id="roleColor"
						type="color"
						bind:value={roleColor}
						class="h-10 w-16 rounded border border-border cursor-pointer"
					/>
					<Input
						bind:value={roleColor}
						placeholder="#000000"
						class="flex-1 font-mono text-sm"
					/>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-4 border-t">
			<Button variant="outline" onclick={onClose}>
				Cancel
			</Button>
			<Button onclick={handleSave}>
				Save Changes
			</Button>
		</div>
	</DialogContent>
</Dialog>
