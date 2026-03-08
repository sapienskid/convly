import { describe, expect, it } from 'vitest';

import type { Connection, Message } from '$lib/types';
import { buildMessageAnimationTimeline, resolvePlaybackState } from '../animationTimeline';

function makeMessage(id: string, characterId: string, text: string): Message {
	return {
		id,
		characterId,
		text,
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

describe('buildMessageAnimationTimeline', () => {
	it('creates deterministic timeline entries and durations', () => {
		const messages = [makeMessage('m1', 'c1', 'Hi'), makeMessage('m2', 'c2', 'Okay')];
		const timeline = buildMessageAnimationTimeline(messages, [makeFlow('m1', 'm2')], {
			messageDuration: 1,
			transitionDuration: 0.5,
			enableTransitions: true,
			messageAnimationStyle: 'typing'
		});

		expect(timeline.entries).toHaveLength(2);
		expect(timeline.entries[0].start).toBe(0);
		expect(timeline.entries[0].typingEnd).toBeCloseTo(0.2, 5);
		expect(timeline.entries[0].holdEnd).toBeCloseTo(1.2, 5);
		expect(timeline.entries[0].transitionEnd).toBeCloseTo(1.7, 5);
		expect(timeline.totalDuration).toBeCloseTo(2.9, 5);
	});
});

describe('resolvePlaybackState', () => {
	it('returns partial text and queued typing indicator during typing animation', () => {
		const messages = [makeMessage('m1', 'c1', 'Hi'), makeMessage('m2', 'c2', 'Okay')];
		const timeline = buildMessageAnimationTimeline(messages, [makeFlow('m1', 'm2')], {
			messageDuration: 1,
			transitionDuration: 0.5,
			enableTransitions: true,
			messageAnimationStyle: 'typing'
		});

		const playback = resolvePlaybackState(timeline, 0.1);

		expect(playback.visibleMessages).toHaveLength(1);
		expect(playback.visibleMessages[0].text).toBe('H');
		expect(playback.visibleMessages[0].isTyping).toBe(true);
		expect(playback.typingIndicatorCharacterIds).toEqual(['c2']);
		expect(playback.typingIndicatorCharacterId).toBe('c2');
	});

	it('shows only typing indicators for message-only mode while next message types', () => {
		const messages = [makeMessage('m1', 'c1', 'Alpha'), makeMessage('m2', 'c2', 'Beta')];
		const timeline = buildMessageAnimationTimeline(messages, [makeFlow('m1', 'm2')], {
			messageDuration: 1,
			transitionDuration: 0,
			enableTransitions: false,
			messageAnimationStyle: 'message-only'
		});

		const playback = resolvePlaybackState(timeline, 1.05);

		expect(playback.visibleMessages.map((entry) => entry.message.id)).toEqual(['m1']);
		expect(playback.typingIndicatorCharacterIds).toContain('c2');
		expect(playback.typingIndicatorCharacterId).toBe('c2');
	});

	it('returns fully-complete playback state after timeline end', () => {
		const messages = [makeMessage('m1', 'c1', 'Hi'), makeMessage('m2', 'c2', 'Okay')];
		const timeline = buildMessageAnimationTimeline(messages, [makeFlow('m1', 'm2')], {
			messageDuration: 1,
			transitionDuration: 0,
			enableTransitions: false,
			messageAnimationStyle: 'typing'
		});

		const playback = resolvePlaybackState(timeline, 99);

		expect(playback.visibleMessages).toHaveLength(2);
		expect(playback.visibleMessages.every((entry) => entry.isComplete)).toBe(true);
		expect(playback.typingIndicatorCharacterIds).toHaveLength(0);
	});
});
