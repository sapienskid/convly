<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { Message, Character } from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { MessageSquare, Clock, AlertCircle, Reply } from 'lucide-svelte';
	import { nodeConnectionModes, setNodeConnectionMode } from '$lib/stores/appStore';

		interface Props {
		data: {
			message: Message;
			character?: Character;
			isSelected: boolean;
			replyToMessage?: Message;
			replyCharacter?: Character;
			onTextUpdate?: (id: string, text: string) => void;
			selectedTool?: string;
			onCreateConnection?: (fromId: string, toId: string, type: 'flow' | 'reply') => void;
		};
		selected?: boolean;
	}	let { data, selected = false }: Props = $props();

	let isEditing = $state(false);
	let editText = $state(data.message.text);
	let textareaRef: HTMLTextAreaElement | null = $state(null);
	
	// Subscribe to nodeConnectionModes store and get this node's mode
	let nodeConnectionMode = $state<'flow' | 'reply'>('flow');
	
	// Subscribe to store changes for this specific node
	$effect(() => {
		const unsubscribe = nodeConnectionModes.subscribe((modes) => {
			nodeConnectionMode = modes[data.message.id] || 'flow';
		});
		return unsubscribe;
	});

	const activateEditing = (event?: Event) => {
		event?.stopPropagation();
		isEditing = true;
		editText = data.message.text;
	};

	const handleDoubleClick = (e: MouseEvent) => {
		activateEditing(e);
	};

	const handleKeyActivate = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activateEditing(e);
		}
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

	const isSelectMode = $derived(data.selectedTool === 'select');
	const handleVisibility = $derived(
		isSelectMode && data.isSelected
			? 'opacity-100'
			: isSelectMode
				? 'opacity-70 group-hover:opacity-100'
				: 'opacity-50 group-hover:opacity-80'
	);
	const replyPreview = $derived.by(() => {
		const text = data.replyToMessage?.text ?? '';
		return text.length > 80 ? `${text.slice(0, 77)}...` : text;
	});
	const messageTime = $derived(
		new Date(data.message.timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
</script>

<div class="relative group {isSelectMode ? 'cursor-pointer' : ''}">
	<!-- Connection Handles - 4 points (top, right, bottom, left) -->
	<Handle
		type="source"
		position={Position.Top}
		id="source-top"
		class="!w-4 !h-4 !bg-orange-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="source"
		position={Position.Right}
		id="source-right"
		class="!w-4 !h-4 !bg-orange-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="source"
		position={Position.Bottom}
		id="source-bottom"
		class="!w-4 !h-4 !bg-orange-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="source"
		position={Position.Left}
		id="source-left"
		class="!w-4 !h-4 !bg-orange-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="target"
		position={Position.Top}
		id="target-top"
		class="!w-4 !h-4 !bg-green-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="target"
		position={Position.Right}
		id="target-right"
		class="!w-4 !h-4 !bg-green-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="target"
		position={Position.Bottom}
		id="target-bottom"
		class="!w-4 !h-4 !bg-green-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>
	<Handle
		type="target"
		position={Position.Left}
		id="target-left"
		class="!w-4 !h-4 !bg-green-500 !border-2 !border-white shadow-lg hover:!scale-150 transition-all duration-200 !rounded-full {handleVisibility} z-10"
		isConnectable={true}
	/>

	<!-- Message Node Card -->
	<div
		class="bg-card border rounded-lg p-4 max-w-xs shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer backdrop-blur-sm
			{selected ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg' : 'border-border hover:border-border/80'}"
		ondblclick={handleDoubleClick}
		role="button"
		tabindex="0"
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2">
				<div class="w-5 h-5 bg-orange-50 rounded flex items-center justify-center">
					<MessageSquare class="w-3 h-3 text-orange-600" />
				</div>
				<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Message
				</span>
			</div>
			<div class="flex items-center gap-2">
				{#if selected}
					<div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
				{/if}
			</div>
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

		<!-- Reply Mode Switch - Always visible -->
		<div class="mb-3 p-2 rounded-md border {nodeConnectionMode === 'reply' ? 'border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20' : 'border-border/60 bg-muted/30'}">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<Reply class="w-3.5 h-3.5 {nodeConnectionMode === 'reply' ? 'text-teal-600' : 'text-muted-foreground'}" />
					<span class="text-xs font-medium {nodeConnectionMode === 'reply' ? 'text-teal-600' : 'text-muted-foreground'}">Reply Mode</span>
					{#if nodeConnectionMode === 'reply'}
						<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 font-medium">ON</span>
					{/if}
				</div>
				<Switch
					checked={nodeConnectionMode === 'reply'}
					onCheckedChange={(checked) => {
						setNodeConnectionMode(data.message.id, checked ? 'reply' : 'flow');
					}}
					class="scale-75"
				/>
			</div>
			<p class="text-[10px] text-muted-foreground/80 mt-1 leading-tight">
				{nodeConnectionMode === 'reply'
					? 'Reply Mode: drag FROM this message TO the message being replied to.'
					: 'Flow Mode: drag FROM this message TO the next message in sequence.'}
			</p>
		</div>

		{#if data.replyToMessage}
			<div class="mb-3 rounded-md border-l-4 bg-teal-50/60 dark:bg-teal-950/20 px-3 py-2 text-xs" style="border-left-color: {data.replyCharacter?.roleColor ?? '#0ea5a4'}">
				<div class="flex items-start gap-2">
					<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
					</svg>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5 mb-0.5">
							<span class="text-[10px] uppercase tracking-wider font-semibold text-teal-600 dark:text-teal-400">Replying to</span>
							<span class="font-semibold text-[0.7rem]" style="color: {data.replyCharacter?.roleColor ?? '#0ea5a4'}">
								{data.replyCharacter ? data.replyCharacter.username : 'Unknown User'}
							</span>
						</div>
						<div class="text-muted-foreground text-[0.68rem] truncate leading-snug">
							{replyPreview || 'Original message'}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Message Content -->
		<div class="mb-3">
			{#if isEditing}
				<Textarea
					bind:value={editText}
					bind:ref={textareaRef}
					onblur={handleTextSubmit}
					onkeydown={handleKeyDown}
					data-editing="true"
					class="min-h-[3rem] resize-none text-sm border-border focus:border-orange-500 focus:ring-orange-500/20"
					placeholder="Enter message content..."
					onclick={(e) => e.stopPropagation()}
				/>
			{:else}
				<div
					class="text-sm leading-relaxed break-words min-h-[3rem] p-3 bg-muted rounded-md cursor-text hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
					onclick={handleDoubleClick}
					onkeydown={handleKeyActivate}
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
