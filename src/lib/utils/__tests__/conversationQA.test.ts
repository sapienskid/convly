import { describe, expect, it } from 'vitest';

import type { Character, Connection, Message } from '$lib/types';
import { analyzeConversationQA } from '../conversationQA';

function makeCharacter(id: string): Character {
	return {
		id,
		username: id,
		avatar: 'https://example.com/avatar.png',
		roleColor: '#ffffff',
		position: { x: 0, y: 0 }
	};
}

function makeMessage(id: string, characterId?: string, replyTo?: string | null): Message {
	return {
		id,
		characterId,
		text: id,
		position: { x: 0, y: 0 },
		timestamp: '2025-01-01T00:00:00.000Z',
		replyTo
	};
}

function makeConnection(
	id: string,
	type: Connection['type'],
	from: string,
	to: string
): Connection {
	return {
		id,
		type,
		from,
		to,
		color: '#ffffff'
	};
}

describe('analyzeConversationQA', () => {
	it('returns perfect readiness for a valid conversation graph', () => {
		const characters = [makeCharacter('c1'), makeCharacter('c2')];
		const messages = [makeMessage('m1', 'c1'), makeMessage('m2', 'c2')];
		const connections = [
			makeConnection('a1', 'assignment', 'm1', 'c1'),
			makeConnection('a2', 'assignment', 'm2', 'c2'),
			makeConnection('f1', 'flow', 'm1', 'm2'),
			makeConnection('r1', 'reply', 'm2', 'm1')
		];
		messages[1].replyTo = 'm1';

		const report = analyzeConversationQA(characters, messages, connections);

		expect(report.issues).toHaveLength(0);
		expect(report.errorCount).toBe(0);
		expect(report.warningCount).toBe(0);
		expect(report.readinessScore).toBe(100);
	});

	it('flags structural problems and computes readiness score', () => {
		const characters = [makeCharacter('c1'), makeCharacter('c2')];
		const messages = [
			makeMessage('m1', 'c1'),
			makeMessage('m2', 'c2', 'missing-message'),
			makeMessage('m3')
		];
		const connections = [
			makeConnection('a1', 'assignment', 'm1', 'c1'),
			makeConnection('a1-dup', 'assignment', 'm1', 'c1'),
			makeConnection('f1', 'flow', 'm1', 'm2'),
			makeConnection('f2', 'flow', 'm2', 'm1'),
			makeConnection('r1', 'reply', 'm2', 'm1')
		];

		const report = analyzeConversationQA(characters, messages, connections);
		const issueIds = new Set(report.issues.map((issue) => issue.id));

		expect(issueIds.has('duplicate-connections')).toBe(true);
		expect(issueIds.has('flow-cycle')).toBe(true);
		expect(issueIds.has('disconnected-flow')).toBe(true);
		expect(issueIds.has('invalid-replies')).toBe(true);
		expect(issueIds.has('missing-speaker')).toBe(true);
		expect(issueIds.has('missing-assignment-edges')).toBe(true);
		expect(issueIds.has('stale-reply-edges')).toBe(true);
		expect(report.errorCount).toBe(2);
		expect(report.warningCount).toBe(5);
		expect(report.readinessScore).toBe(34);
	});
});
