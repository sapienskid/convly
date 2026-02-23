<script lang="ts">
	import type { Tool } from '$lib/types';
	import type { ComponentType } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MousePointer2 from 'lucide-svelte/icons/mouse-pointer-2';
	import Hand from 'lucide-svelte/icons/hand';
	import User from 'lucide-svelte/icons/user';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import MessageCircle from 'lucide-svelte/icons/message-circle';
	import Code2 from 'lucide-svelte/icons/code-2';
	import { importConversationFromJSON } from '$lib/stores/appStore';

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

	function handleImportJson() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,.txt';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const payload = JSON.parse(text);
				importConversationFromJSON(payload);
			} catch (error) {
				console.error('Invalid conversation JSON:', error);
				window.alert('Could not import JSON. Use an array (or conversation/messages array) with speaker + text.');
			}
		};
		input.click();
	}
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

	<!-- Bottom - JSON Import -->
	<div class="flex flex-col items-center gap-1 p-2">
		<Button
			variant="ghost"
			size="icon"
			class="h-10 w-10"
			title="Import JSON"
			onclick={handleImportJson}
		>
			<Code2 class="size-5" />
		</Button>
	</div>
</div>
