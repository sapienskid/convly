<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		MarkerType,
		type Node,
		type Edge,
		type NodeTargetEventWithPointer,
		type NodeEventWithPointer,
		type PaneEvents,
		type Connection as FlowConnection,
		type OnConnectStart,
		type OnConnectEnd
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Character, Message, Connection, Tool } from '$lib/types';
	import CharacterFlowNode from '$lib/components/canvas/CharacterFlowNode.svelte';
	import MessageFlowNode from '$lib/components/canvas/MessageFlowNode.svelte';
	import FloatingEdge from '$lib/components/canvas/FloatingEdge.svelte';
	import { createConnection, nodeConnectionModes } from '$lib/stores/appStore';
	import { get } from 'svelte/store';

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		selectedTool: Tool;
		selectedElement: string | null;
		readOnly?: boolean;
		onCharacterMove: (id: string, position: { x: number; y: number }) => void;
		onMessageMove: (id: string, position: { x: number; y: number }) => void;
		onMessageTextUpdate: (id: string, text: string) => void;
		onCharacterUsernameUpdate: (id: string, username: string) => void;
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
		readOnly = false,
		onCharacterMove,
		onMessageMove,
		onMessageTextUpdate,
		onCharacterUsernameUpdate,
		onElementSelect,
		onAddMessage,
		onCharacterEdit
	}: Props = $props();

	let selectedEdge = $state<string | null>(null);
	let connectingFrom = $state<string | null>(null);
	let connectStartNodeId = $state<string | null>(null);
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
				readOnly,
				onEdit: () => onCharacterEdit(char.id),
				onAddMessage: () => onAddMessage(char.id),
				onUsernameUpdate: onCharacterUsernameUpdate,
				selectedTool
			},
			draggable: !readOnly && selectedTool === 'select'
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
					readOnly,
					onTextUpdate: onMessageTextUpdate,
					selectedTool
				},
				draggable: !readOnly && selectedTool === 'select'
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
			markerEnd:
				conn.type === 'flow'
					? {
							type: MarkerType.Arrow,
							color: conn.color,
							width: 18,
							height: 18
						}
					: undefined,
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

	function wouldCreateFlowCycle(source: string, target: string) {
		if (source === target) return true;

		const adjacency = new Map<string, string[]>();
		for (const conn of connections) {
			if (conn.type !== 'flow') continue;
			if (!adjacency.has(conn.from)) adjacency.set(conn.from, []);
			adjacency.get(conn.from)!.push(conn.to);
		}

		const visited = new Set<string>();
		const stack = [target];
		while (stack.length > 0) {
			const current = stack.pop()!;
			if (current === source) return true;
			if (visited.has(current)) continue;
			visited.add(current);
			for (const next of adjacency.get(current) ?? []) {
				if (!visited.has(next)) stack.push(next);
			}
		}

		return false;
	}

	const validateConnection = (connection: { source?: string | null; target?: string | null }) => {
		if (readOnly) return false;
		const { source, target } = connection;
		if (!source || !target) return false;

		const sourceIsCharacter = isCharacterNode(source);
		const targetIsCharacter = isCharacterNode(target);
		const sourceIsMessage = isMessageNode(source);
		const targetIsMessage = isMessageNode(target);

		// Assignment is undirected in interaction: message <-> speaker.
		if ((sourceIsCharacter && targetIsMessage) || (sourceIsMessage && targetIsCharacter)) {
			const messageId = sourceIsMessage ? source : target;
			const characterId = sourceIsCharacter ? source : target;
			const message = messages.find((msg) => msg.id === messageId);
			if (message?.characterId && message.characterId !== characterId) {
				return false;
			}
			const hasDifferentAssignmentEdge = connections.some(
				(conn) =>
					conn.type === 'assignment' &&
					conn.from === messageId &&
					conn.to !== characterId
			);
			if (hasDifferentAssignmentEdge) {
				return false;
			}
			return true;
		}

		// Message -> message remains directional.
		if (sourceIsMessage && targetIsMessage) {
			if (source === target) return false;
			const nodeModes = get(nodeConnectionModes);
			const mode = nodeModes[source] || 'flow';

			if (mode === 'reply') {
				const sourceMessage = messages.find((msg) => msg.id === source);
				if (sourceMessage?.replyTo && sourceMessage.replyTo !== target) {
					return false;
				}
				const hasDifferentReplyEdge = connections.some(
					(conn) => conn.type === 'reply' && conn.from === source && conn.to !== target
				);
				return !hasDifferentReplyEdge;
			}

			const hasSameFlow = connections.some(
				(conn) => conn.type === 'flow' && conn.from === source && conn.to === target
			);
			if (hasSameFlow) return false;
			if (wouldCreateFlowCycle(source, target)) return false;
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

	function getNodeBox(node: Node) {
		const isCharacter = node.id.startsWith('char');
		const width = isCharacter ? 260 : 360;
		const height = isCharacter ? 170 : 300;
		return {
			left: node.position.x - width / 2,
			right: node.position.x + width / 2,
			top: node.position.y - height / 2,
			bottom: node.position.y + height / 2,
			width,
			height
		};
	}

	function resolveNodeCollisions(targetNode: Node): { x: number; y: number } {
		let x = targetNode.position.x;
		let y = targetNode.position.y;
		let iteration = 0;
		const maxIterations = 14;
		const buffer = 20;

		while (iteration < maxIterations) {
			let moved = false;
			const candidateNode = { ...targetNode, position: { x, y } } as Node;
			const candidateBox = getNodeBox(candidateNode);

			for (const otherNode of nodes) {
				if (otherNode.id === targetNode.id) continue;
				const otherBox = getNodeBox(otherNode);

				const overlapsHorizontally =
					candidateBox.left < otherBox.right && candidateBox.right > otherBox.left;
				const overlapsVertically =
					candidateBox.top < otherBox.bottom && candidateBox.bottom > otherBox.top;
				if (!overlapsHorizontally || !overlapsVertically) continue;

				const overlapX =
					Math.min(candidateBox.right, otherBox.right) -
					Math.max(candidateBox.left, otherBox.left);
				const overlapY =
					Math.min(candidateBox.bottom, otherBox.bottom) -
					Math.max(candidateBox.top, otherBox.top);

				if (overlapX <= 0 || overlapY <= 0) continue;

				if (overlapX < overlapY) {
					x += (x >= otherNode.position.x ? 1 : -1) * (overlapX + buffer);
				} else {
					y += (y >= otherNode.position.y ? 1 : -1) * (overlapY + buffer);
				}

				moved = true;
			}

			if (!moved) break;
			iteration += 1;
		}
		return { x: Math.round(x), y: Math.round(y) };
	}

	// Handle node drag end
	const handleNodeDragStop: NodeTargetEventWithPointer<MouseEvent | TouchEvent, Node> = ({
		targetNode
	}) => {
		if (readOnly) return;
		if (!targetNode) return;
		const resolvedPosition = resolveNodeCollisions(targetNode);
		syncNodePosition({
			...targetNode,
			position: resolvedPosition
		});
	};

	// Handle node click
	const handleNodeClick: NodeEventWithPointer<MouseEvent | TouchEvent, Node> = ({ node }) => {
		onElementSelect(node.id);
		selectedEdge = null;
	};

	// Handle pane click (deselect or add node)
	const handlePaneClick: NonNullable<PaneEvents['onpaneclick']> = () => {
		onElementSelect(null);
		selectedEdge = null;
		connectingFrom = null;
	};

	// Handle edge click
	const handleEdgeClick = ({ edge }: { edge: Edge; event: MouseEvent }) => {
		selectedEdge = edge.id;
		onElementSelect(null);
	};

	// Handle connection
	const handleConnect = (connection: FlowConnection) => {
		if (readOnly) return;
		if (!connection.source || !connection.target) return;

		let source = connection.source;
		let target = connection.target;
		let sourceHandle = connection.sourceHandle || undefined;
		let targetHandle = connection.targetHandle || undefined;

		// Keep drag direction aligned to the node where the connect gesture started.
		if (connectStartNodeId && source !== connectStartNodeId && target === connectStartNodeId) {
			[source, target] = [target, source];
			// Reset handles when swapping so store logic recomputes canonical handle directions.
			sourceHandle = undefined;
			targetHandle = undefined;
		}

		createConnection(source, target, sourceHandle, targetHandle);
		connectStartNodeId = null;
	};

	const handleConnectStart: OnConnectStart = (_event, params) => {
		if (readOnly) return;
		connectStartNodeId = params.nodeId;
	};

	const handleConnectEnd: OnConnectEnd = () => {
		if (readOnly) return;
		connectStartNodeId = null;
	};

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
		onnodedragstop={handleNodeDragStop}
		onnodeclick={handleNodeClick}
		onpaneclick={handlePaneClick}
		onedgeclick={handleEdgeClick}
		onconnect={handleConnect}
		onconnectstart={handleConnectStart}
		onconnectend={handleConnectEnd}
		isValidConnection={validateConnection}
		panOnDrag={readOnly ? [0, 1, 2] : selectedTool === 'pan' ? [0, 1, 2] : false}
		selectionOnDrag={readOnly ? false : selectedTool === 'select'}
		elementsSelectable={true}
		nodesConnectable={!readOnly}
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

	<!-- Tool Instructions -->
	{#if !readOnly && selectedTool === 'character'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Click anywhere on the canvas to add a character</p>
		</div>
	{:else if !readOnly && selectedTool === 'message'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Click anywhere on the canvas to add a message</p>
		</div>
	{:else if !readOnly && selectedTool === 'pan'}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg z-10">
			<p class="text-sm text-muted-foreground">Drag to pan around the canvas</p>
		</div>
	{/if}
</div>
