<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Character, CharacterAura } from '$lib/types';
	import { updateCharacter, updateCharacterAura } from '$lib/stores/appStore';
	import { User, Palette, Shield, Upload, Sparkles } from '@lucide/svelte';

	interface Props {
		character: Character | null;
		open: boolean;
		onClose: () => void;
	}

	let { character, open, onClose }: Props = $props();

	// Avatar generation state
	let avatarSeed = $state('default');
	let avatarStyle = $state<'pixel-art' | 'bottts' | 'avataaars' | 'lorelei' | 'notionists'>('bottts');
	let username = $state('');
	let roleColor = $state('#ff6f3b');
	let roleTitle = $state<string>('Member');
	let customAvatarUrl = $state<string | null>(null);
	let avatarMode = $state<'generated' | 'upload'>('generated');
	
	// Aura state
	let auraDescription = $state('');
	let auraTone = $state('neutral');
	let auraSpeakingStyle = $state('natural');
	let auraKeywords = $state('');

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

	const toneOptions = [
		{ value: 'friendly', label: 'Friendly' },
		{ value: 'professional', label: 'Professional' },
		{ value: 'casual', label: 'Casual' },
		{ value: 'sarcastic', label: 'Sarcastic' },
		{ value: 'serious', label: 'Serious' },
		{ value: 'energetic', label: 'Energetic' },
		{ value: 'calm', label: 'Calm' },
		{ value: 'neutral', label: 'Neutral' }
	];

	const speakingStyleOptions = [
		{ value: 'natural', label: 'Natural' },
		{ value: 'formal', label: 'Formal' },
		{ value: 'informal', label: 'Informal' },
		{ value: 'technical', label: 'Technical' },
		{ value: 'poetic', label: 'Poetic' },
		{ value: 'direct', label: 'Direct' },
		{ value: 'verbose', label: 'Verbose' },
		{ value: 'concise', label: 'Concise' }
	];

	// Generate avatar URL using DiceBear API
	const generateAvatarUrl = $derived(
		`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90`
	);

	const currentAvatarUrl = $derived(
		avatarMode === 'upload' && customAvatarUrl ? customAvatarUrl : generateAvatarUrl
	);

	// Update form when character changes
	$effect(() => {
		if (character) {
			username = character.username;
			roleColor = character.roleColor;
			avatarSeed = character.username;
			
			// Try to match existing role color to a predefined role
			const matchedRole = roles.find(r => r.color === character.roleColor);
			roleTitle = character.roleTitle || matchedRole?.title || 'Member';
			
			// Check if avatar is a custom URL
			if (character.avatar && !character.avatar.includes('dicebear.com')) {
				avatarMode = 'upload';
				customAvatarUrl = character.avatar;
			} else {
				avatarMode = 'generated';
				customAvatarUrl = null;
			}
			
			// Load aura
			if (character.aura) {
				auraDescription = character.aura.description;
				auraTone = character.aura.tone;
				auraSpeakingStyle = character.aura.speakingStyle;
				auraKeywords = character.aura.keywords.join(', ');
			} else {
				auraDescription = '';
				auraTone = 'neutral';
				auraSpeakingStyle = 'natural';
				auraKeywords = '';
			}
		}
	});

	function handleSave() {
		if (!character) return;

		const avatar = avatarMode === 'upload' && customAvatarUrl ? customAvatarUrl : generateAvatarUrl;
		
		updateCharacter(character.id, {
			username: username.trim(),
			avatar,
			roleColor: roleColor,
			roleTitle: roleTitle
		});

		const aura: CharacterAura = {
			description: auraDescription.trim(),
			tone: auraTone,
			speakingStyle: auraSpeakingStyle,
			keywords: auraKeywords.split(',').map(k => k.trim()).filter(Boolean)
		};
		updateCharacterAura(character.id, aura);

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

	function handleAvatarUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				customAvatarUrl = result;
				avatarMode = 'upload';
			}
		};
		reader.readAsDataURL(file);
	}
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
	<DialogContent class="sm:max-w-[600px]">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<User class="w-5 h-5" />
				Edit Character
			</DialogTitle>
			<DialogDescription>
				Customize the character's appearance, role and AI persona
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
			<!-- Avatar Preview & Generation -->
			<div class="space-y-3">
				<Label class="flex items-center gap-2">
					<Palette class="w-4 h-4" />
					Avatar
				</Label>
				<div class="flex items-center gap-4">
					<Avatar class="w-24 h-24 border-4" style="border-color: {roleColor}">
						<AvatarImage src={currentAvatarUrl} alt={username} />
						<AvatarFallback class="text-2xl font-bold text-white" style="background-color: {roleColor}">
							{username.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div class="flex-1 space-y-2">
						<div class="flex gap-2">
							<Select
								type="single"
								value={avatarMode}
								onValueChange={(value) => avatarMode = value as 'generated' | 'upload'}
							>
								<SelectTrigger>
									<span data-slot="select-value">
										{avatarMode === 'generated' ? 'Generate' : 'Upload'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="generated" label="Generate">Generate</SelectItem>
									<SelectItem value="upload" label="Upload">Upload</SelectItem>
								</SelectContent>
							</Select>
						</div>
						
						{#if avatarMode === 'generated'}
							<div class="flex gap-2">
								<Input
									bind:value={avatarSeed}
									placeholder="Avatar seed..."
									class="flex-1"
								/>
								<Button onclick={randomizeAvatar} variant="outline" size="icon">
									<Sparkles class="w-4 h-4" />
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
						{:else}
							<div class="flex items-center gap-2">
								<Input
									type="file"
									accept="image/*"
									class="flex-1"
									onchange={handleAvatarUpload}
								/>
								{#if customAvatarUrl}
									<Button variant="outline" size="sm" onclick={() => { customAvatarUrl = null; avatarMode = 'generated'; }}>
										Clear
									</Button>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">
								Upload a custom avatar image (PNG, JPG, GIF)
							</p>
						{/if}
					</div>
				</div>
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

			<!-- Aura / AI Persona -->
			<div class="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
				<div class="flex items-center gap-2">
					<Sparkles class="w-4 h-4" />
					<Label class="text-sm font-semibold">AI Persona (Aura)</Label>
				</div>
				
				<div class="space-y-2">
					<Label for="aura-description" class="text-xs">Description</Label>
					<Textarea
						id="aura-description"
						bind:value={auraDescription}
						placeholder="Describe this character's personality, background, and traits..."
						rows={3}
						class="text-sm"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label class="text-xs">Tone</Label>
						<Select
							type="single"
							bind:value={auraTone}
							items={toneOptions}
							onValueChange={() => {}}
						>
							<SelectTrigger>
								<span data-slot="select-value">
									{toneOptions.find(t => t.value === auraTone)?.label || 'Select tone'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each toneOptions as tone}
									<SelectItem value={tone.value} label={tone.label}>{tone.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					
					<div class="space-y-2">
						<Label class="text-xs">Speaking Style</Label>
						<Select
							type="single"
							bind:value={auraSpeakingStyle}
							items={speakingStyleOptions}
							onValueChange={() => {}}
						>
							<SelectTrigger>
								<span data-slot="select-value">
									{speakingStyleOptions.find(s => s.value === auraSpeakingStyle)?.label || 'Select style'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each speakingStyleOptions as style}
									<SelectItem value={style.value} label={style.label}>{style.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="aura-keywords" class="text-xs">Keywords (comma separated)</Label>
					<Input
						id="aura-keywords"
						bind:value={auraKeywords}
						placeholder="e.g., helpful, creative, technical, friendly..."
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
