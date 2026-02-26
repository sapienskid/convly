<script lang="ts">
	import type { Tool } from '$lib/types';
	import type { ComponentType } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MousePointer2 from 'lucide-svelte/icons/mouse-pointer-2';
	import Hand from 'lucide-svelte/icons/hand';
	import User from 'lucide-svelte/icons/user';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Code2 from 'lucide-svelte/icons/code-2';
	import { importConversationFromJSON } from '$lib/stores/appStore';

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
	}

	let { selectedTool, onToolSelect, selectedElement, readOnly = false, elementCount }: Props = $props();

	const allTools: Array<{ id: Tool; icon: ComponentType; label: string; shortcut: string }> = [
		{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
		{ id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
		{ id: 'character', icon: User, label: 'Character', shortcut: 'C' },
		{ id: 'message', icon: MessageSquare, label: 'Message', shortcut: 'M' }
	];
	const tools = $derived(readOnly ? allTools.filter((tool) => tool.id === 'select' || tool.id === 'pan') : allTools);

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
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-teal-500 text-xs font-black tracking-[0.12em] text-white shadow-lg"
			title="Convly Studio"
		>
			CS
		</div>
		<span class="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Studio</span>

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
