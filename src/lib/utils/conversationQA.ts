import type { Character, Connection, Message } from '$lib/types';

export type ConversationIssueSeverity = 'error' | 'warning';
export type ConversationFixAction =
	| 'assign_unassigned_messages'
	| 'remove_invalid_replies'
	| 'repair_assignment_edges'
	| 'dedupe_connections';

export interface ConversationIssue {
	id: string;
	severity: ConversationIssueSeverity;
	title: string;
	description: string;
	fixAction?: ConversationFixAction;
}

export interface ConversationQAReport {
	issues: ConversationIssue[];
	errorCount: number;
	warningCount: number;
	readinessScore: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function countDisconnectedFlowComponents(
	messageIds: string[],
	flowConnections: Connection[]
): number {
	if (messageIds.length <= 1) return 1;

	const neighbors = new Map<string, string[]>();
	for (const id of messageIds) {
		neighbors.set(id, []);
	}
	for (const connection of flowConnections) {
		neighbors.get(connection.from)?.push(connection.to);
		neighbors.get(connection.to)?.push(connection.from);
	}

	const visited = new Set<string>();
	let components = 0;

	for (const start of messageIds) {
		if (visited.has(start)) continue;
		components += 1;
		const queue = [start];
		visited.add(start);

		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const next of neighbors.get(current) ?? []) {
				if (visited.has(next)) continue;
				visited.add(next);
				queue.push(next);
			}
		}
	}

	return components;
}

function hasFlowCycle(messageIds: string[], flowConnections: Connection[]): boolean {
	const adjacency = new Map<string, string[]>();
	for (const id of messageIds) {
		adjacency.set(id, []);
	}
	for (const connection of flowConnections) {
		adjacency.get(connection.from)?.push(connection.to);
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();

	const dfs = (nodeId: string): boolean => {
		if (visiting.has(nodeId)) return true;
		if (visited.has(nodeId)) return false;
		visiting.add(nodeId);
		for (const next of adjacency.get(nodeId) ?? []) {
			if (dfs(next)) return true;
		}
		visiting.delete(nodeId);
		visited.add(nodeId);
		return false;
	};

	for (const id of messageIds) {
		if (dfs(id)) return true;
	}
	return false;
}

export function analyzeConversationQA(
	characters: Character[],
	messages: Message[],
	connections: Connection[]
): ConversationQAReport {
	const issues: ConversationIssue[] = [];
	const messageById = new Map(messages.map((message) => [message.id, message]));
	const characterById = new Map(characters.map((character) => [character.id, character]));
	const messageIds = messages.map((message) => message.id);

	const flowConnections = connections.filter(
		(connection) =>
			connection.type === 'flow' &&
			messageById.has(connection.from) &&
			messageById.has(connection.to) &&
			connection.from !== connection.to
	);
	const assignmentConnections = connections.filter(
		(connection) =>
			connection.type === 'assignment' &&
			messageById.has(connection.from) &&
			characterById.has(connection.to)
	);
	const replyConnections = connections.filter(
		(connection) =>
			connection.type === 'reply' &&
			messageById.has(connection.from) &&
			messageById.has(connection.to)
	);

	const duplicateConnectionCount =
		connections.length -
		new Set(connections.map((connection) => `${connection.type}:${connection.from}:${connection.to}`)).size;
	if (duplicateConnectionCount > 0) {
		issues.push({
			id: 'duplicate-connections',
			severity: 'warning',
			title: 'Duplicate connections',
			description: `${duplicateConnectionCount} duplicate connection(s) found.`,
			fixAction: 'dedupe_connections'
		});
	}

	if (hasFlowCycle(messageIds, flowConnections)) {
		issues.push({
			id: 'flow-cycle',
			severity: 'error',
			title: 'Flow contains a cycle',
			description: 'Message flow must be directional and acyclic for stable playback.'
		});
	}

	const disconnectedComponents = countDisconnectedFlowComponents(messageIds, flowConnections);
	if (messages.length > 1 && disconnectedComponents > 1) {
		issues.push({
			id: 'disconnected-flow',
			severity: 'warning',
			title: 'Flow is disconnected',
			description: `Detected ${disconnectedComponents} disconnected flow groups.`
		});
	}

	const invalidReplies = messages.filter((message) => {
		if (!message.replyTo) return false;
		if (message.replyTo === message.id) return true;
		return !messageById.has(message.replyTo);
	});
	if (invalidReplies.length > 0) {
		issues.push({
			id: 'invalid-replies',
			severity: 'error',
			title: 'Invalid reply links',
			description: `${invalidReplies.length} message(s) reply to a missing or invalid target.`,
			fixAction: 'remove_invalid_replies'
		});
	}

	const missingSpeakerMessages = messages.filter(
		(message) => !message.characterId || !characterById.has(message.characterId)
	);
	if (missingSpeakerMessages.length > 0) {
		issues.push({
			id: 'missing-speaker',
			severity: 'warning',
			title: 'Messages without speaker',
			description: `${missingSpeakerMessages.length} message(s) do not have a valid speaker assignment.`,
			fixAction: 'assign_unassigned_messages'
		});
	}

	const missingAssignmentEdges = messages.filter((message) => {
		if (!message.characterId || !characterById.has(message.characterId)) return false;
		return !assignmentConnections.some(
			(connection) => connection.from === message.id && connection.to === message.characterId
		);
	});
	if (missingAssignmentEdges.length > 0) {
		issues.push({
			id: 'missing-assignment-edges',
			severity: 'warning',
			title: 'Missing assignment edges',
			description: `${missingAssignmentEdges.length} message(s) are assigned to a speaker but not connected by assignment edge.`,
			fixAction: 'repair_assignment_edges'
		});
	}

	const invalidReplyEdges = replyConnections.filter((connection) => {
		const sourceMessage = messageById.get(connection.from);
		return sourceMessage?.replyTo !== connection.to;
	});
	if (invalidReplyEdges.length > 0) {
		issues.push({
			id: 'stale-reply-edges',
			severity: 'warning',
			title: 'Stale reply edges',
			description: `${invalidReplyEdges.length} reply edge(s) no longer match message reply targets.`,
			fixAction: 'remove_invalid_replies'
		});
	}

	let timestampMismatchCount = 0;
	for (const connection of flowConnections) {
		const fromTimestamp = Date.parse(messageById.get(connection.from)?.timestamp ?? '');
		const toTimestamp = Date.parse(messageById.get(connection.to)?.timestamp ?? '');
		if (!Number.isFinite(fromTimestamp) || !Number.isFinite(toTimestamp)) continue;
		if (fromTimestamp > toTimestamp) {
			timestampMismatchCount += 1;
		}
	}
	if (timestampMismatchCount > 0) {
		issues.push({
			id: 'flow-timestamp-mismatch',
			severity: 'warning',
			title: 'Flow timestamp mismatch',
			description: `${timestampMismatchCount} flow edge(s) move backward in time.`
		});
	}

	const errorCount = issues.filter((issue) => issue.severity === 'error').length;
	const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
	const readinessScore = clamp(100 - errorCount * 18 - warningCount * 6, 0, 100);

	return {
		issues,
		errorCount,
		warningCount,
		readinessScore
	};
}
