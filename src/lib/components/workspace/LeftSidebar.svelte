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
	import MessageCircle from 'lucide-svelte/icons/message-circle';
	import FolderOpen from 'lucide-svelte/icons/folder-open';
	import Settings from 'lucide-svelte/icons/settings';
	import HelpCircle from 'lucide-svelte/icons/help-circle';
	import LogOut from 'lucide-svelte/icons/log-out';

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

	const tools: Array<{ id: Tool; icon: ComponentType; label: string; shortcut: string }> = [
		{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
		{ id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
		{ id: 'character', icon: User, label: 'Character', shortcut: 'C' },
		{ id: 'message', icon: MessageSquare, label: 'Message', shortcut: 'M' }
	];
</script>

<div class="flex h-full w-16 flex-col border-r border-border bg-card">
	<!-- Top - Logo/Brand Area -->
	<div class="flex flex-col items-center gap-1 p-2">
		<Button
			variant="ghost"
			size="icon"
			class="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
			title="Home"
		>
			<MessageCircle class="size-5" />
		</Button>

		<Separator class="my-2" />

		<!-- Tool Buttons -->
		{#each tools as tool}
			<Button
				variant={selectedTool === tool.id ? 'default' : 'ghost'}
				size="icon"
				class="h-10 w-10"
				onclick={() => onToolSelect(tool.id)}
				title="{tool.label} ({tool.shortcut})"
			>
				{@const Icon = tool.icon}
				<Icon class="size-5" />
			</Button>
		{/each}
	</div>

	<!-- Middle Spacer -->
	<div class="flex-1"></div>

	<!-- Bottom - User & Settings -->
	<div class="flex flex-col items-center gap-1 p-2">
		<Button variant="ghost" size="icon" class="h-10 w-10" title="Projects">
			<FolderOpen class="size-5" />
		</Button>

		<Button variant="ghost" size="icon" class="h-10 w-10" title="Help">
			<HelpCircle class="size-5" />
		</Button>

		<Button variant="ghost" size="icon" class="h-10 w-10" title="Settings">
			<Settings class="size-5" />
		</Button>

		<Separator class="my-2" />

		<Button variant="ghost" size="icon" class="h-10 w-10" title="Account">
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white">
				JD
			</div>
		</Button>

		<Button variant="ghost" size="icon" class="h-10 w-10 text-muted-foreground hover:text-destructive" title="Logout">
			<LogOut class="size-5" />
		</Button>
	</div>
</div>
