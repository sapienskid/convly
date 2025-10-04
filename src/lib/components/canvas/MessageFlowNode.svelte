<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { Message, Character } from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import { MessageSquare, Clock, AlertCircle } from 'lucide-svelte';

	interface Props {
		data: {
			message: Message;
			character?: Character;
			isSelected: boolean;
			onTextUpdate?: (id: string, text: string) => void;
			selectedTool?: string;
		};
		selected?: boolean;
	}

	let { data, selected = false }: Props = $props();

	let isEditing = $state(false);
	let editText = $state(data.message.text);
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	const handleDoubleClick = (e: MouseEvent) => {
		e.stopPropagation();
		isEditing = true;
		editText = data.message.text;
	};

	const handleTextSubmit = () => {
		if (data.onTextUpdate) {
			data.onTextUpdate(data.message.id, editText);
		}
		isEditing = false;
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleTextSubmit();
		} else if (e.key === 'Escape') {
			isEditing = false;
			editText = data.message.text;
		}
	};

	$effect(() => {
		if (isEditing && textareaRef) {
			textareaRef.focus();
			textareaRef.select();
		}
	});

	const isConnectMode = $derived(data.selectedTool === 'connect');
	const handleOpacity = $derived(isConnectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100');
	const messageTime = $derived(
		new Date(data.message.timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
</script>

<div class="relative group {isConnectMode ? 'cursor-crosshair' : ''}">
	<!-- Connection Handles - Top -->
	<Handle
		type="source"
		position={Position.Top}
		id="top-source"
		class="!w-8 !h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>
	<Handle
		type="target"
		position={Position.Top}
		id="top-target"
		class="!w-8 !h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>

	<!-- Connection Handles - Right -->
	<Handle
		type="source"
		position={Position.Right}
		id="right-source"
		class="!w-8 !h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>
	<Handle
		type="target"
		position={Position.Right}
		id="right-target"
		class="!w-8 !h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>

	<!-- Connection Handles - Bottom -->
	<Handle
		type="source"
		position={Position.Bottom}
		id="bottom-source"
		class="!w-8 !h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>
	<Handle
		type="target"
		position={Position.Bottom}
		id="bottom-target"
		class="!w-8 !h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>

	<!-- Connection Handles - Left -->
	<Handle
		type="source"
		position={Position.Left}
		id="left-source"
		class="!w-8 !h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>
	<Handle
		type="target"
		position={Position.Left}
		id="left-target"
		class="!w-8 !h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>

	<!-- Message Node Card -->
	<div
		class="bg-card border rounded-lg p-4 max-w-xs shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer backdrop-blur-sm
			{isConnectMode ? 'hover:ring-2 hover:ring-green-300 hover:border-green-400' : ''}
			{selected ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg' : 'border-border hover:border-border/80'}"
		ondblclick={handleDoubleClick}
		role="button"
		tabindex="0"
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2">
				<div class="w-5 h-5 bg-purple-50 rounded flex items-center justify-center">
					<MessageSquare class="w-3 h-3 text-purple-600" />
				</div>
				<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Message
				</span>
			</div>
			{#if selected}
				<div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
			{/if}
		</div>

		<!-- Character Assignment -->
		{#if data.character}
			<div class="flex items-center gap-2 mb-3 p-2 bg-muted rounded-md">
				<Avatar class="w-5 h-5 shrink-0">
					<AvatarImage src={data.character.avatar} alt={data.character.username} />
					<AvatarFallback
						class="text-white text-xs font-medium"
						style="background-color: {data.character.roleColor}"
					>
						{data.character.username.slice(0, 1)}
					</AvatarFallback>
				</Avatar>
				<span class="text-xs font-medium truncate" style="color: {data.character.roleColor}">
					{data.character.username}
				</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-100 rounded-md">
				<AlertCircle class="w-4 h-4 text-red-500 shrink-0" />
				<span class="text-xs text-red-600 font-medium">No speaker assigned</span>
			</div>
		{/if}

		<!-- Message Content -->
		<div class="mb-3">
			{#if isEditing}
				<Textarea
					bind:value={editText}
					bind:this={textareaRef}
					onblur={handleTextSubmit}
					onkeydown={handleKeyDown}
					data-editing="true"
					class="min-h-[3rem] resize-none text-sm border-border focus:border-purple-500 focus:ring-purple-500/20"
					placeholder="Enter message content..."
					onclick={(e) => e.stopPropagation()}
				/>
			{:else}
				<div
					class="text-sm leading-relaxed break-words min-h-[3rem] p-3 bg-muted rounded-md cursor-text hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
					onclick={handleDoubleClick}
					role="button"
					tabindex="0"
				>
					{#if data.message.text}
						{data.message.text}
					{:else}
						<span class="text-muted-foreground italic">Double-click to edit...</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer Info -->
		<div class="flex items-center justify-between pt-3 border-t border-border">
			<div class="flex items-center gap-1 text-xs text-muted-foreground">
				<Clock class="w-3 h-3" />
				<span>{messageTime}</span>
			</div>
			<div class="text-xs text-muted-foreground font-mono">
				{data.message.text?.length || 0} chars
			</div>
		</div>
	</div>
</div>
