<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { Character } from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { User, MessageSquarePlus, Edit3 } from 'lucide-svelte';

	interface Props {
		data: {
			character: Character;
			isSelected: boolean;
			readOnly?: boolean;
			onEdit?: () => void;
			onAddMessage?: () => void;
			onUsernameUpdate?: (id: string, username: string) => void;
			selectedTool?: string;
		};
		selected?: boolean;
	}

	let { data, selected = false }: Props = $props();

	let isEditingUsername = $state(false);
	let editUsername = $state(data.character.username);
	let inputRef = $state<HTMLInputElement | null>(null);
	const isReadOnly = $derived(data.readOnly ?? false);

	const activateUsernameEditing = (event?: Event) => {
		if (isReadOnly) return;
		event?.stopPropagation();
		isEditingUsername = true;
		editUsername = data.character.username;
	};

	const handleUsernameSubmit = () => {
		if (data.onUsernameUpdate && editUsername.trim()) {
			data.onUsernameUpdate(data.character.id, editUsername.trim());
		}
		isEditingUsername = false;
	};

	const handleUsernameKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleUsernameSubmit();
		} else if (e.key === 'Escape') {
			isEditingUsername = false;
			editUsername = data.character.username;
		}
	};

	const handleEdit = (e: MouseEvent) => {
		if (isReadOnly) return;
		e.stopPropagation();
		data.onEdit?.();
	};

	const handleAddMessage = (e: MouseEvent) => {
		if (isReadOnly) return;
		e.stopPropagation();
		data.onAddMessage?.();
	};

	const handleDoubleClick = (e: MouseEvent) => {
		if (isReadOnly) return;
		e.stopPropagation();
		activateUsernameEditing(e);
	};

	$effect(() => {
		if (isEditingUsername && inputRef) {
			inputRef.focus();
			inputRef.select();
		}
	});

	const isSelectMode = $derived(data.selectedTool === 'select');
	const handleVisibility = $derived(
		isReadOnly
			? '!opacity-0 !pointer-events-none'
			: isSelectMode
				? 'opacity-80 group-hover:opacity-100'
				: 'opacity-60 group-hover:opacity-90'
	);
</script>

<div class="relative group {isSelectMode && !isReadOnly ? 'cursor-pointer' : ''}">
	<!-- Connection Handles - Source on right, Target on left -->
	<Handle
		type="source"
		position={Position.Right}
		id="source"
		class="!w-4 !h-4 !bg-blue-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="target"
		position={Position.Left}
		id="target"
		class="!w-4 !h-4 !bg-green-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>

	<!-- Character Node Card -->
	<div
		class="bg-card border rounded-lg p-4 min-w-[240px] shadow-sm hover:shadow-md transition-all duration-200 {isReadOnly ? 'cursor-default' : 'cursor-pointer'} backdrop-blur-sm
			{selected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-border hover:border-border/80'}"
		ondblclick={handleDoubleClick}
		role="button"
		tabindex="0"
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2">
				<div class="w-5 h-5 bg-blue-50 rounded flex items-center justify-center">
					<User class="w-3 h-3 text-blue-600" />
				</div>
				<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Speaker
				</span>
			</div>
			{#if selected}
				<div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
			{/if}
		</div>

		<!-- Character Info -->
		<div class="flex items-center gap-3 mb-4">
			<Avatar class="w-10 h-10 shrink-0">
				<AvatarImage src={data.character.avatar} alt={data.character.username} />
				<AvatarFallback
					class="text-white text-sm font-medium"
					style="background-color: {data.character.roleColor}"
				>
					{data.character.username.slice(0, 2).toUpperCase()}
				</AvatarFallback>
			</Avatar>

			<div class="flex-1 min-w-0">
				{#if isEditingUsername && !isReadOnly}
					<Input
						bind:value={editUsername}
						bind:ref={inputRef}
						onblur={handleUsernameSubmit}
						onkeydown={handleUsernameKeyDown}
						data-editing="true"
						class="h-7 text-sm font-semibold border-border focus:border-blue-500 focus:ring-blue-500/20"
						style="color: {data.character.roleColor}"
						placeholder="Enter username..."
						onclick={(e) => e.stopPropagation()}
					/>
				{:else if !isReadOnly}
					<div
						class="font-semibold truncate text-sm cursor-text hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
						style="color: {data.character.roleColor}"
						onclick={activateUsernameEditing}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								activateUsernameEditing(e);
							}
						}}
						role="button"
						tabindex="0"
						title="Double-click to edit username"
					>
						{data.character.username}
					</div>
				{:else}
					<div class="font-semibold truncate text-sm px-1 py-0.5" style="color: {data.character.roleColor}">
						{data.character.username}
					</div>
				{/if}
				<div class="text-xs text-muted-foreground">Ready to speak</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="flex items-center justify-between pt-3 border-t border-border">
			{#if !isReadOnly}
				<div class="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onclick={handleEdit}
						class="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
						title="Edit character"
					>
						<Edit3 class="w-3.5 h-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleAddMessage}
						class="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
						title="Add message"
					>
						<MessageSquarePlus class="w-3.5 h-3.5" />
					</Button>
				</div>
			{:else}
				<span class="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Read only</span>
			{/if}
			<div class="text-xs text-muted-foreground font-mono">
				#{data.character.id.slice(-4)}
			</div>
		</div>
	</div>
</div>
