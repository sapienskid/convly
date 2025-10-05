<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		type Node,
		type Edge,
		type NodeTargetEventWithPointer,
		type NodeEventWithPointer,
		type PaneEvents,
		type Connection as FlowConnection
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Character, Message, Connection, Tool } from '$lib/types';
	import CharacterFlowNode from '$lib/components/canvas/CharacterFlowNode.svelte';
	import MessageFlowNode from '$lib/components/canvas/MessageFlowNode.svelte';
	import FloatingEdge from '$lib/components/canvas/FloatingEdge.svelte';
	import { 
		addCharacterAtPosition, 
		addMessageAtPosition, 
		createConnection,
		deleteElement,
		deleteConnection
	} from '$lib/stores/appStore';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from 'lucide-svelte/icons';

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		selectedTool: Tool;
		selectedElement: string | null;
		onCharacterMove: (id: string, position: { x: number; y: number }) => void;
		onMessageMove: (id: string, position: { x: number; y: number }) => void;
		onMessageTextUpdate: (id: string, text: string) => void;
		onElementSelect: (id: string | null) => void;
		onAddMessage: (characterId: string) => void;
		onCharacterEdit: (id: string) => void;
	}

	let {
		characters,
		messages,
		connections,
		selectedTool,
		selectedElement,
		onCharacterMove,
		onMessageMove,
		onMessageTextUpdate,
		onElementSelect,
		onAddMessage,
		onCharacterEdit
	}: Props = $props();

	let selectedEdge = $state<string | null>(null);
	let connectingFrom = $state<string | null>(null);
	let edgeButtonPosition = $state<{ x: number; y: number } | null>(null);
	let viewport = $state<{ x: number; y: number; zoom: number } | undefined>(undefined);

	// Convert characters to nodes
	const characterNodes = $derived(
		characters.map((char) => ({
			id: char.id,
			type: 'character',
			position: char.position,
			data: {
				character: char,
				isSelected: selectedElement === char.id,
				onEdit: () => onCharacterEdit(char.id),
				onAddMessage: () => onAddMessage(char.id),
				selectedTool
			},
			draggable: selectedTool === 'select'
		}))
	);

	// Convert messages to nodes
	const messageNodes = $derived(
		messages.map((msg) => {
			const character = characters.find((c) => c.id === msg.characterId);
			const replyToMessage = msg.replyTo ? messages.find((m) => m.id === msg.replyTo) : undefined;
			const replyCharacter = replyToMessage
				? characters.find((c) => c.id === replyToMessage.characterId)
				: undefined;
			return {
				id: msg.id,
				type: 'message',
				position: msg.position,
				data: {
					message: msg,
					character,
					replyToMessage,
					replyCharacter,
					isSelected: selectedElement === msg.id,
					onTextUpdate: onMessageTextUpdate,
					selectedTool
				},
				draggable: selectedTool === 'select'
			};
		})
	);

	// Combine all nodes, keeping raw array reference to avoid unnecessary instrumentation
	let nodes = $state.raw<Node[]>([]);

	$effect(() => {
		nodes = [...characterNodes, ...messageNodes];
	});

	// Convert connections to edges
	const edges = $derived<Edge[]>(
		connections.map((conn) => ({
			id: conn.id,
			source: conn.from,
			target: conn.to,
			sourceHandle: conn.sourceHandle,
			targetHandle: conn.targetHandle,
			type: 'floating',
			animated: conn.type === 'flow',
			style: `stroke: ${conn.color}; stroke-width: ${selectedEdge === conn.id ? '3px' : '2.5px'}; ${conn.type === 'reply' ? 'stroke-dasharray: 6 3;' : ''}`,
			selectable: true,
			data: {
				color: conn.color,
				type: conn.type
			}
		}))
	);

	function isCharacterNode(id: string) {
		return characters.some((c) => c.id === id);
	}

	function isMessageNode(id: string) {
		return messages.some((m) => m.id === id);
	}

	const validateConnection = (connection: { source?: string | null; target?: string | null }) => {
		const { source, target } = connection;
		if (!source || !target) return false;

		const sourceIsCharacter = isCharacterNode(source);
		const targetIsCharacter = isCharacterNode(target);
		const sourceIsMessage = isMessageNode(source);
		const targetIsMessage = isMessageNode(target);

		// Allow character -> message assignments
		if (sourceIsCharacter && targetIsMessage) {
			const targetMessage = messages.find((msg) => msg.id === target);
			if (targetMessage?.characterId && targetMessage.characterId !== source) {
				return false;
			}
			const hasDifferentAssignmentEdge = connections.some(
				(conn) => conn.type === 'assignment' && conn.to === target && conn.from !== source
			);
			if (hasDifferentAssignmentEdge) {
				return false;
			}
			return true;
		}

		// Allow message -> message flow connections
		if (sourceIsMessage && targetIsMessage) {
			return true;
		}

		return false;
	};

	// Node types mapping
	const nodeTypes = {
		character: CharacterFlowNode,
		message: MessageFlowNode
	};

	// Edge types mapping
	const edgeTypes = {
		floating: FloatingEdge
	};

	function syncNodePosition(node: Node) {
		const character = characters.find((c) => c.id === node.id);
		if (character) {
			onCharacterMove(node.id, node.position);
		} else {
			onMessageMove(node.id, node.position);
		}
	}

	// Handle node dragging updates for responsive edges
	const handleNodeDrag: NodeTargetEventWithPointer<MouseEvent | TouchEvent, Node> = ({
		targetNode
	}) => {
		if (!targetNode) return;
		syncNodePosition(targetNode);
	};

	// Handle node drag end
	const handleNodeDragStop: NodeTargetEventWithPointer<MouseEvent | TouchEvent, Node> = ({
		targetNode
	}) => {
		if (!targetNode) return;
		syncNodePosition(targetNode);
	};

	// Handle node click
	const handleNodeClick: NodeEventWithPointer<MouseEvent | TouchEvent, Node> = ({ node, event }) => {
		onElementSelect(node.id);
		selectedEdge = null;
	};

	// Handle pane click (deselect or add node)
	const handlePaneClick: NonNullable<PaneEvents['onpaneclick']> = ({ event }) => {
		if (selectedTool === 'character' || selectedTool === 'message') {
			const paneElement = event.currentTarget;
			if (!(paneElement instanceof HTMLElement)) return;
			const rect = paneElement.getBoundingClientRect();
			const currentViewport = viewport ?? { x: 0, y: 0, zoom: 1 };
			// Translate screen coordinates into flow space so keyboard users can add nodes accurately
			const flowPosition = {
				x: (event.clientX - rect.left - currentViewport.x) / currentViewport.zoom,
				y: (event.clientY - rect.top - currentViewport.y) / currentViewport.zoom
			};

			if (selectedTool === 'character') {
				addCharacterAtPosition(flowPosition);
			} else {
				addMessageAtPosition(flowPosition);
			}
		} else {
			onElementSelect(null);
			selectedEdge = null;
			connectingFrom = null;
		}
	};

	// Handle edge click
	const handleEdgeClick = ({ edge, event }: { edge: Edge; event: MouseEvent }) => {
		selectedEdge = edge.id;
		onElementSelect(null);
		
		// Position delete button near the click
		edgeButtonPosition = {
			x: event.clientX,
			y: event.clientY
		};
	};

	// Handle connection
	const handleConnect = (connection: FlowConnection) => {
		if (connection.source && connection.target) {
			createConnection(
				connection.source,
				connection.target,
				connection.sourceHandle || undefined,
				connection.targetHandle || undefined
			);
		}
	};

	// Handle delete edge button
	function handleDeleteEdge() {
		if (selectedEdge) {
			deleteConnection(selectedEdge);
			selectedEdge = null;
			edgeButtonPosition = null;
		}
	}

	// Handle escape to deselect edge
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selectedEdge = null;
			connectingFrom = null;
		}
	}

</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="h-full w-full relative">
	<SvelteFlow
		bind:viewport={viewport}
		{nodes}
		{edges}
		{nodeTypes}
		{edgeTypes}
		fitView
		onnodedrag={handleNodeDrag}
		onnodedragstop={handleNodeDragStop}
		onnodeclick={handleNodeClick}
		onpaneclick={handlePaneClick}
		onedgeclick={handleEdgeClick}
		onconnect={handleConnect}
		isValidConnection={validateConnection}
		panOnDrag={selectedTool === 'pan' ? [0, 1, 2] : false}
		selectionOnDrag={selectedTool === 'select'}
		elementsSelectable={true}
		zoomOnDoubleClick={false}
		defaultEdgeOptions={{
			type: 'floating',
			animated: false
		}}
	>
		<Background />
		<Controls />
		<MiniMap />
	</SvelteFlow>

	<!-- Delete Edge Button (on edge) -->
	{#if selectedEdge && edgeButtonPosition}
		<div 
			class="fixed z-50"
			style="left: {edgeButtonPosition.x}px; top: {edgeButtonPosition.y}px; transform: translate(-50%, -50%);"
		>
			<Button
				variant="destructive"
				size="icon"
				onclick={handleDeleteEdge}
				class="h-9 w-9 rounded-full shadow-xl hover:scale-110 transition-transform animate-in zoom-in-50 duration-200"
				title="Delete Connection"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	{/if}

	<!-- Tool Instructions -->
	{#if selectedTool === 'character'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Click anywhere on the canvas to add a character</p>
		</div>
	{:else if selectedTool === 'message'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Click anywhere on the canvas to add a message</p>
		</div>
	{:else if selectedTool === 'pan'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Drag to pan around the canvas</p>
		</div>
	{/if}
</div>
