<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { Character } from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { User, MessageSquarePlus, Edit3 } from 'lucide-svelte';

	interface Props {
		data: {
			character: Character;
			isSelected: boolean;
			onEdit?: () => void;
			onAddMessage?: () => void;
			selectedTool?: string;
		};
		selected?: boolean;
	}

	let { data, selected = false }: Props = $props();

	const handleEdit = (e: MouseEvent) => {
		e.stopPropagation();
		data.onEdit?.();
	};

	const handleAddMessage = (e: MouseEvent) => {
		e.stopPropagation();
		data.onAddMessage?.();
	};

	const handleDoubleClick = (e: MouseEvent) => {
		e.stopPropagation();
		data.onEdit?.();
	};

	const isConnectMode = $derived(data.selectedTool === 'connect');
	const handleOpacity = $derived(isConnectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100');
</script>

<div class="relative group {isConnectMode ? 'cursor-crosshair' : ''}">
	<!-- Connection Handles - Top -->
	<Handle
		type="source"
		position={Position.Top}
		id="top-source"
		class="!w-8 !h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
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
		class="!w-8 !h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
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
		class="!w-8 !h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
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
		class="!w-8 !h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>
	<Handle
		type="target"
		position={Position.Left}
		id="left-target"
		class="!w-8 !h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full {handleOpacity} z-10"
	/>

	<!-- Character Node Card -->
	<div
		class="bg-card border rounded-lg p-4 min-w-[240px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer backdrop-blur-sm
			{isConnectMode ? 'hover:ring-2 hover:ring-green-300 hover:border-green-400' : ''}
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
				<div class="font-semibold truncate text-sm" style="color: {data.character.roleColor}">
					{data.character.username}
				</div>
				<div class="text-xs text-muted-foreground">Ready to speak</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="flex items-center justify-between pt-3 border-t border-border">
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
			<div class="text-xs text-muted-foreground font-mono">
				#{data.character.id.slice(-4)}
			</div>
		</div>
	</div>
</div>
