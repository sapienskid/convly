<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Code2 from '@lucide/svelte/icons/code-2';
	import { importConversationFromJSON } from '$lib/stores/appStore';

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
	<!-- Top -->
	<div class="flex flex-col items-center p-2">
		<div class="h-2"></div>
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
