<script lang="ts">
	import type { Tool } from '$lib/types';
	import type { ComponentType } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MousePointer2 from 'lucide-svelte/icons/mouse-pointer-2';
	import Hand from 'lucide-svelte/icons/hand';
	import User from 'lucide-svelte/icons/user';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Link2 from 'lucide-svelte/icons/link-2';
	import Copy from 'lucide-svelte/icons/copy';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	interface Props {
		selectedTool: Tool;
		onToolSelect: (tool: Tool) => void;
		selectedElement: string | null;
		readOnly?: boolean;
		elementCount: {
			characters: number;
			messages: number;
			connections: number;
		};
		onDelete?: () => void;
		onDuplicate?: () => void;
	}

	let {
		selectedTool,
		onToolSelect,
		selectedElement,
		readOnly = false,
		elementCount,
		onDelete,
		onDuplicate
	}: Props = $props();

	function handleDelete() {
		if (selectedElement && onDelete) {
			onDelete();
		}
	}

	function handleDuplicate() {
		if (selectedElement && onDuplicate) {
			onDuplicate();
		}
	}

	const tools: Array<{ id: Tool; icon: ComponentType; label: string; shortcut: string }> = [
		{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
		{ id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
		{ id: 'character', icon: User, label: 'Character', shortcut: 'C' },
		{ id: 'message', icon: MessageSquare, label: 'Message', shortcut: 'M' }
	];
</script>

<div class="border-t border-border bg-card px-4 py-3">
	<div class="flex items-center justify-between">
		<!-- Left: Selection Info -->
		<div class="flex items-center gap-3">
			{#if selectedElement}
				<div class="text-sm text-muted-foreground">
					<span class="font-medium text-foreground">Selected:</span>
					{selectedElement.startsWith('char') ? 'Character' : 'Message'}
				</div>
			{:else}
				<div class="text-sm text-muted-foreground">
					No selection
				</div>
			{/if}
		</div>

		<!-- Center: Element Counts -->
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<User class="size-4 text-muted-foreground" />
				<span class="text-sm font-medium">{elementCount.characters}</span>
				<span class="text-xs text-muted-foreground">Characters</span>
			</div>
			<div class="flex items-center gap-2">
				<MessageSquare class="size-4 text-muted-foreground" />
				<span class="text-sm font-medium">{elementCount.messages}</span>
				<span class="text-xs text-muted-foreground">Messages</span>
			</div>
			<div class="flex items-center gap-2">
				<Link2 class="size-4 text-muted-foreground" />
				<span class="text-sm font-medium">{elementCount.connections}</span>
				<span class="text-xs text-muted-foreground">Connections</span>
			</div>
		</div>

		<!-- Right: Quick Actions -->
		<div class="flex items-center gap-1">
			<Button 
				variant="ghost" 
				size="sm" 
				disabled={readOnly || !selectedElement} 
				title="Duplicate (Ctrl+D)"
				onclick={handleDuplicate}
				class="hover:bg-blue-50 hover:text-blue-600"
			>
				<Copy class="size-4" />
			</Button>
			<Button 
				variant="ghost" 
				size="sm" 
				disabled={readOnly || !selectedElement} 
				title="Delete (Del)"
				onclick={handleDelete}
				class="hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 class="size-4" />
			</Button>
		</div>
	</div>
</div>
