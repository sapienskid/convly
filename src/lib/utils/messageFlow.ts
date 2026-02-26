import type { Message, Connection } from '$lib/types';

export interface MessageFlowInfo {
	message: Message;
	level: number;
	hasIncoming: boolean;
	hasOutgoing: boolean;
}

/**
 * Analyzes message flow based on connections to determine proper ordering
 * Uses topological sort to handle conversation flow
 */
export function analyzeMessageFlow(messages: Message[], connections: Connection[]): MessageFlowInfo[] {
	if (messages.length === 0) return [];

	const messageMap = new Map(messages.map((message) => [message.id, message]));
	const orderIndex = new Map(messages.map((message, index) => [message.id, index]));
	const compareByOrder = (a: string, b: string) =>
		(orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER);

	// Keep only valid directional flow edges.
	const flowConnections = connections.filter(
		(connection) =>
			connection.type === 'flow' &&
			messageMap.has(connection.from) &&
			messageMap.has(connection.to) &&
			connection.from !== connection.to
	);
	const flowNodeIds = new Set<string>();
	for (const connection of flowConnections) {
		flowNodeIds.add(connection.from);
		flowNodeIds.add(connection.to);
	}

	const adjacencyList = new Map<string, string[]>();
	const inDegree = new Map<string, number>();
	const incomingCount = new Map<string, number>();
	const outgoingCount = new Map<string, number>();
	for (const nodeId of flowNodeIds) {
		adjacencyList.set(nodeId, []);
		inDegree.set(nodeId, 0);
	}

	// Build graph from directional flow connections
	for (const connection of flowConnections) {
		adjacencyList.get(connection.from)?.push(connection.to);
		inDegree.set(connection.to, (inDegree.get(connection.to) || 0) + 1);
		outgoingCount.set(connection.from, (outgoingCount.get(connection.from) || 0) + 1);
		incomingCount.set(connection.to, (incomingCount.get(connection.to) || 0) + 1);
	}

	// Topological sort (flow-first), preserving message list order for ties.
	const queue: string[] = [];
	const sortedFlow: string[] = [];
	const levels = new Map<string, number>();
	const enqueueByOrder = (nodeId: string) => {
		if (queue.length === 0) {
			queue.push(nodeId);
			return;
		}

		const nodeOrder = orderIndex.get(nodeId) ?? Number.MAX_SAFE_INTEGER;
		let insertAt = queue.length;
		for (let i = 0; i < queue.length; i += 1) {
			const queuedOrder = orderIndex.get(queue[i]) ?? Number.MAX_SAFE_INTEGER;
			if (nodeOrder < queuedOrder) {
				insertAt = i;
				break;
			}
		}
		queue.splice(insertAt, 0, nodeId);
	};

	for (const nodeId of flowNodeIds) {
		if ((inDegree.get(nodeId) || 0) === 0) {
			enqueueByOrder(nodeId);
			levels.set(nodeId, 0);
		}
	}

	while (queue.length > 0) {
		const current = queue.shift()!;
		sortedFlow.push(current);
		const currentLevel = levels.get(current) || 0;

		for (const neighbor of adjacencyList.get(current) || []) {
			const nextDegree = (inDegree.get(neighbor) || 0) - 1;
			inDegree.set(neighbor, nextDegree);
			levels.set(neighbor, Math.max(levels.get(neighbor) ?? 0, currentLevel + 1));

			if (nextDegree === 0) {
				enqueueByOrder(neighbor);
			}
		}
	}

	// Any remaining flow nodes (should only happen with malformed cyclic input).
	const visitedFlow = new Set(sortedFlow);
	const remainingFlowNodes = [...flowNodeIds].filter((id) => !visitedFlow.has(id)).sort(compareByOrder);
	for (const id of remainingFlowNodes) {
		sortedFlow.push(id);
		if (!levels.has(id)) {
			levels.set(id, 999);
		}
	}

	// Append disconnected messages after flow-sequenced messages.
	const disconnectedMessages = messages
		.map((message) => message.id)
		.filter((id) => !flowNodeIds.has(id))
		.sort(compareByOrder);

	const sorted = [...sortedFlow, ...disconnectedMessages];

	return sorted
		.map((id) => {
			const message = messageMap.get(id);
			if (!message) return null;

			const hasIncoming = (incomingCount.get(id) || 0) > 0;
			const hasOutgoing = (outgoingCount.get(id) || 0) > 0;

			return {
				message,
				level: levels.get(id) ?? 999,
				hasIncoming,
				hasOutgoing
			};
		})
		.filter((info): info is MessageFlowInfo => info !== null);
}

/**
 * Gets the next message in the flow
 */
export function getNextMessage(messageId: string, connections: Connection[]): string | null {
	const flowConn = connections.find((c) => c.type === 'flow' && c.from === messageId);
	return flowConn ? flowConn.to : null;
}

/**
 * Gets the previous message in the flow
 */
export function getPreviousMessage(messageId: string, connections: Connection[]): string | null {
	const flowConn = connections.find((c) => c.type === 'flow' && c.to === messageId);
	return flowConn ? flowConn.from : null;
}
