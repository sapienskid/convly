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

	// Build adjacency list for flow connections
	const flowConnections = connections.filter((c) => c.type === 'flow');
	const adjacencyList = new Map<string, string[]>();
	const inDegree = new Map<string, number>();

	// Initialize all messages
	messages.forEach((msg) => {
		adjacencyList.set(msg.id, []);
		inDegree.set(msg.id, 0);
	});

	// Build graph from flow connections
	flowConnections.forEach((conn) => {
		if (adjacencyList.has(conn.from) && adjacencyList.has(conn.to)) {
			adjacencyList.get(conn.from)!.push(conn.to);
			inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
		}
	});

	// Topological sort using Kahn's algorithm
	const queue: string[] = [];
	const sorted: string[] = [];
	const levels = new Map<string, number>();

	// Start with messages that have no incoming edges
	messages.forEach((msg) => {
		if (inDegree.get(msg.id) === 0) {
			queue.push(msg.id);
			levels.set(msg.id, 0);
		}
	});

	// Process queue
	while (queue.length > 0) {
		const current = queue.shift()!;
		sorted.push(current);
		const currentLevel = levels.get(current) || 0;

		const neighbors = adjacencyList.get(current) || [];
		neighbors.forEach((neighbor) => {
			const newDegree = (inDegree.get(neighbor) || 0) - 1;
			inDegree.set(neighbor, newDegree);

			if (newDegree === 0) {
				queue.push(neighbor);
				levels.set(neighbor, currentLevel + 1);
			}
		});
	}

	// Handle any remaining messages (cycles or disconnected)
	messages.forEach((msg) => {
		if (!sorted.includes(msg.id)) {
			sorted.push(msg.id);
			levels.set(msg.id, 999); // Put at end
		}
	});

	// Build result
	return sorted
		.map((id) => {
			const message = messages.find((m) => m.id === id);
			if (!message) return null;

			const hasIncoming = flowConnections.some((c) => c.to === id);
			const hasOutgoing = flowConnections.some((c) => c.from === id);
			const level = levels.get(id) || 0;

			return {
				message,
				level,
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
