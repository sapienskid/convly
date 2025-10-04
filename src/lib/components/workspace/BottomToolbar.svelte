<script lang="ts">
	import type { Tool } from '$lib/types';
	import type { Component } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
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
		elementCount: {
			characters: number;
			messages: number;
			connections: number;
		};
	}

	let { selectedTool, onToolSelect, selectedElement, elementCount }: Props = $props();

	const tools: Array<{ id: Tool; icon: Component; label: string; shortcut: string }> = [
		{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
		{ id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
		{ id: 'character', icon: User, label: 'Character', shortcut: 'C' },
		{ id: 'message', icon: MessageSquare, label: 'Message', shortcut: 'M' },
		{ id: 'connect', icon: Link2, label: 'Connect', shortcut: 'L' }
	];
</script>

<div class="border-t border-border bg-card px-4 py-2">
	<div class="flex items-center justify-between">
		<!-- Left: Tools -->
		<div class="flex items-center gap-1">
			{#each tools as tool}
				<Button
					variant={selectedTool === tool.id ? 'default' : 'ghost'}
					size="sm"
					onclick={() => onToolSelect(tool.id)}
					class="gap-2"
					title="{tool.label} ({tool.shortcut})"
				>
					{@const Icon = tool.icon}
					<Icon class="size-4" />
					<span class="hidden sm:inline">{tool.label}</span>
				</Button>
			{/each}
		</div>

		<!-- Center: Element Counts -->
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<User class="size-4 text-muted-foreground" />
				<Badge variant="secondary">{elementCount.characters}</Badge>
			</div>
			<div class="flex items-center gap-1.5">
				<MessageSquare class="size-4 text-muted-foreground" />
				<Badge variant="secondary">{elementCount.messages}</Badge>
			</div>
			<div class="flex items-center gap-1.5">
				<Link2 class="size-4 text-muted-foreground" />
				<Badge variant="secondary">{elementCount.connections}</Badge>
			</div>
		</div>

		<!-- Right: Quick Actions -->
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" disabled={!selectedElement} title="Copy">
				<Copy class="size-4" />
			</Button>
			<Button variant="ghost" size="sm" disabled={!selectedElement} title="Delete">
				<Trash2 class="size-4" />
			</Button>
		</div>
	</div>
</div>
