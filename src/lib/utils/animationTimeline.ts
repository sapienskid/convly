import type { Connection, CustomizationSettings, Message } from '$lib/types';
import { analyzeMessageFlow } from '$lib/utils/messageFlow';

const DEFAULT_TYPING_MS_PER_CHAR = 50;
const MIN_TYPING_SECONDS = 0.2;
const MAX_TYPING_SECONDS = 12;
const EPSILON = 0.0001;

export interface TimelineEntry {
	message: Message;
	start: number;
	typingEnd: number;
	holdEnd: number;
	transitionEnd: number;
	typingDuration: number;
	holdDuration: number;
	transitionDuration: number;
}

export interface AnimationTimeline {
	orderedMessages: Message[];
	entries: TimelineEntry[];
	totalDuration: number;
}

export interface PlaybackMessageState {
	message: Message;
	text: string;
	isTyping: boolean;
	isComplete: boolean;
}

export interface PlaybackState {
	visibleMessages: PlaybackMessageState[];
	typingIndicatorCharacterId: string | null;
}

function getOrderedMessages(messages: Message[], connections: Connection[]): Message[] {
	return analyzeMessageFlow(messages, connections).map((info) => info.message);
}

function getTypingDuration(message: Message): number {
	const textLength = message.text?.length ?? 0;
	const rawSeconds = (textLength * DEFAULT_TYPING_MS_PER_CHAR) / 1000;
	return Math.min(MAX_TYPING_SECONDS, Math.max(MIN_TYPING_SECONDS, rawSeconds));
}

export function buildMessageAnimationTimeline(
	messages: Message[],
	connections: Connection[],
	settings: Partial<CustomizationSettings> = {}
): AnimationTimeline {
	const orderedMessages = getOrderedMessages(messages, connections);
	const holdDuration = Math.max(settings.messageDuration ?? 2.5, 0);
	const transitionsEnabled = settings.enableTransitions ?? true;
	const baseTransitionDuration = transitionsEnabled ? Math.max(settings.transitionDuration ?? 0.3, 0) : 0;

	const entries: TimelineEntry[] = [];
	let cursor = 0;

	for (let i = 0; i < orderedMessages.length; i += 1) {
		const message = orderedMessages[i];
		const typingDuration = getTypingDuration(message);
		const transitionDuration = i < orderedMessages.length - 1 ? baseTransitionDuration : 0;
		const start = cursor;
		const typingEnd = start + typingDuration;
		const holdEnd = typingEnd + holdDuration;
		const transitionEnd = holdEnd + transitionDuration;

		entries.push({
			message,
			start,
			typingEnd,
			holdEnd,
			transitionEnd,
			typingDuration,
			holdDuration,
			transitionDuration
		});

		cursor = transitionEnd;
	}

	return {
		orderedMessages,
		entries,
		totalDuration: cursor
	};
}

export function resolvePlaybackState(
	timeline: AnimationTimeline,
	currentTimeSeconds: number
): PlaybackState {
	const visibleMessages: PlaybackMessageState[] = [];
	const clampedTime = Math.max(0, Math.min(currentTimeSeconds, timeline.totalDuration));

	for (let i = 0; i < timeline.entries.length; i += 1) {
		const entry = timeline.entries[i];
		const fullText = entry.message.text ?? '';

		if (clampedTime + EPSILON >= entry.transitionEnd) {
			visibleMessages.push({
				message: entry.message,
				text: fullText,
				isTyping: false,
				isComplete: true
			});
			continue;
		}

		if (clampedTime + EPSILON < entry.typingEnd) {
			const progress =
				entry.typingDuration <= EPSILON
					? 1
					: Math.max(0, Math.min(1, (clampedTime - entry.start) / entry.typingDuration));
			const charCount = Math.max(0, Math.min(fullText.length, Math.floor(progress * fullText.length)));
			visibleMessages.push({
				message: entry.message,
				text: fullText.slice(0, charCount),
				isTyping: true,
				isComplete: false
			});
			return { visibleMessages, typingIndicatorCharacterId: null };
		}

		visibleMessages.push({
			message: entry.message,
			text: fullText,
			isTyping: false,
			isComplete: true
		});

		if (clampedTime + EPSILON < entry.holdEnd) {
			return { visibleMessages, typingIndicatorCharacterId: null };
		}

		if (clampedTime + EPSILON < entry.transitionEnd) {
			const nextCharacterId = timeline.entries[i + 1]?.message.characterId ?? null;
			return {
				visibleMessages,
				typingIndicatorCharacterId: nextCharacterId
			};
		}
	}

	return { visibleMessages, typingIndicatorCharacterId: null };
}
