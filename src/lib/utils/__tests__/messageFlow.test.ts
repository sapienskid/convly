import { describe, expect, it } from 'vitest';

import type { Connection, Message } from '$lib/types';
import { analyzeMessageFlow, getNextMessage, getPreviousMessage } from '../messageFlow';

function makeMessage(id: string): Message {
	return {
		id,
		characterId: 'char-1',
		text: id,
		position: { x: 0, y: 0 },
		timestamp: '2025-01-01T00:00:00.000Z'
	};
}

function makeFlow(from: string, to: string): Connection {
	return {
		id: `flow-${from}-${to}`,
		from,
		to,
		type: 'flow',
		color: '#ffffff'
	};
}

describe('analyzeMessageFlow', () => {
	it('orders connected messages by flow and appends disconnected ones', () => {
		const messages = [makeMessage('m1'), makeMessage('m2'), makeMessage('m3'), makeMessage('m4')];
		const connections = [makeFlow('m3', 'm1'), makeFlow('m1', 'm2')];

		const result = analyzeMessageFlow(messages, connections);

		expect(result.map((entry) => entry.message.id)).toEqual(['m3', 'm1', 'm2', 'm4']);
		expect(result.map((entry) => entry.level)).toEqual([0, 1, 2, 999]);
		expect(result[0].hasIncoming).toBe(false);
		expect(result[0].hasOutgoing).toBe(true);
		expect(result[1].hasIncoming).toBe(true);
		expect(result[1].hasOutgoing).toBe(true);
	});

	it('falls back safely when malformed cyclic flow exists', () => {
		const messages = [makeMessage('m1'), makeMessage('m2')];
		const connections = [makeFlow('m1', 'm2'), makeFlow('m2', 'm1')];

		const result = analyzeMessageFlow(messages, connections);

		expect(result.map((entry) => entry.message.id)).toEqual(['m1', 'm2']);
		expect(result.every((entry) => entry.level === 999)).toBe(true);
	});
});

describe('message flow navigation helpers', () => {
	const connections = [makeFlow('m1', 'm2'), makeFlow('m2', 'm3')];

	it('gets next message id', () => {
		expect(getNextMessage('m1', connections)).toBe('m2');
		expect(getNextMessage('missing', connections)).toBeNull();
	});

	it('gets previous message id', () => {
		expect(getPreviousMessage('m3', connections)).toBe('m2');
		expect(getPreviousMessage('missing', connections)).toBeNull();
	});
});
