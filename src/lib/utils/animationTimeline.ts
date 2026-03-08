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
	messageAnimationStyle: NonNullable<CustomizationSettings['messageAnimationStyle']>;
}

export interface PlaybackMessageState {
	message: Message;
	text: string;
	isTyping: boolean;
	isComplete: boolean;
}

export interface PlaybackState {
	visibleMessages: PlaybackMessageState[];
	typingIndicatorCharacterIds: string[];
	typingIndicatorCharacterId: string | null;
}

function uniqueTypingIds(ids: Array<string | null | undefined>): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const id of ids) {
		if (!id || seen.has(id)) continue;
		seen.add(id);
		normalized.push(id);
	}

	return normalized;
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
	const messageAnimationStyle = settings.messageAnimationStyle ?? 'typing';

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
		totalDuration: cursor,
		messageAnimationStyle
	};
}

export function resolvePlaybackState(
	timeline: AnimationTimeline,
	currentTimeSeconds: number
): PlaybackState {
	const visibleMessages: PlaybackMessageState[] = [];
	const clampedTime = Math.max(0, Math.min(currentTimeSeconds, timeline.totalDuration));
	const participantIds = Array.from(
		new Set(
			timeline.orderedMessages
				.map((message) => message.characterId)
				.filter((characterId): characterId is string => Boolean(characterId))
		)
	);

	for (let i = 0; i < timeline.entries.length; i += 1) {
		const entry = timeline.entries[i];
		const fullText = entry.message.text ?? '';
		const currentCharacterId = entry.message.characterId ?? null;
		const nextCharacterId = timeline.entries[i + 1]?.message.characterId ?? null;

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
			const typingProgress =
				entry.typingDuration <= EPSILON
					? 1
					: Math.max(0, Math.min(1, (clampedTime - entry.start) / entry.typingDuration));
			const extraTypingCandidate =
				participantIds.length >= 3
					? participantIds.find((id) => id !== currentCharacterId) ?? null
					: null;
			const messageOnlyTypingCharacterIds = uniqueTypingIds([
				currentCharacterId,
				typingProgress > 0.28 && typingProgress < 0.78 ? extraTypingCandidate : null
			]);

			if (timeline.messageAnimationStyle === 'message-only') {
				return {
					visibleMessages,
					typingIndicatorCharacterIds: messageOnlyTypingCharacterIds,
					typingIndicatorCharacterId: messageOnlyTypingCharacterIds[0] ?? null
				};
			}

			const charCount = Math.max(
				0,
				Math.min(fullText.length, Math.floor(typingProgress * fullText.length))
			);
			visibleMessages.push({
				message: entry.message,
				text: fullText.slice(0, charCount),
				isTyping: true,
				isComplete: false
			});
			const queuedTypingCandidates = participantIds.filter(
				(characterId) => characterId !== currentCharacterId && characterId !== nextCharacterId
			);
			const queuedTypingCharacterIds =
				nextCharacterId && nextCharacterId !== currentCharacterId
					? uniqueTypingIds([
							nextCharacterId,
							typingProgress > 0.5 && queuedTypingCandidates.length > 0
								? queuedTypingCandidates[i % queuedTypingCandidates.length]
								: null
						])
					: [];
			return {
				visibleMessages,
				typingIndicatorCharacterIds: queuedTypingCharacterIds,
				typingIndicatorCharacterId: queuedTypingCharacterIds[0] ?? null
			};
		}

		visibleMessages.push({
			message: entry.message,
			text: fullText,
			isTyping: false,
			isComplete: true
		});

		if (clampedTime + EPSILON < entry.holdEnd) {
			if (nextCharacterId && nextCharacterId !== currentCharacterId && entry.holdDuration > EPSILON) {
				const holdProgress = Math.max(
					0,
					Math.min(1, (clampedTime - entry.typingEnd) / entry.holdDuration)
				);
				const holdAlternateCandidates = participantIds.filter(
					(characterId) => characterId !== nextCharacterId && characterId !== currentCharacterId
				);
				const holdTypingCharacterIds = uniqueTypingIds([
					nextCharacterId,
					holdProgress > 0.55 && holdAlternateCandidates.length > 0
						? holdAlternateCandidates[i % holdAlternateCandidates.length]
						: null
				]);
				return {
					visibleMessages,
					typingIndicatorCharacterIds: holdTypingCharacterIds,
					typingIndicatorCharacterId: holdTypingCharacterIds[0] ?? null
				};
			}
			return {
				visibleMessages,
				typingIndicatorCharacterIds: [],
				typingIndicatorCharacterId: null
			};
		}

		if (clampedTime + EPSILON < entry.transitionEnd) {
			if (!nextCharacterId || nextCharacterId === currentCharacterId) {
				return {
					visibleMessages,
					typingIndicatorCharacterIds: [],
					typingIndicatorCharacterId: null
				};
			}

			if (
				entry.transitionDuration > EPSILON &&
				participantIds.length >= 3
			) {
				const transitionProgress = Math.max(
					0,
					Math.min(1, (clampedTime - entry.holdEnd) / entry.transitionDuration)
				);
					const alternateCandidates = participantIds.filter(
						(characterId) =>
							characterId !== nextCharacterId && characterId !== currentCharacterId
					);
				const alternateTypingCharacterId =
					alternateCandidates.length > 0
						? alternateCandidates[i % alternateCandidates.length]
						: null;
				const typingCharacterIds = uniqueTypingIds([
					nextCharacterId,
					transitionProgress < 0.62 ? alternateTypingCharacterId : null
				]);
				return {
					visibleMessages,
					typingIndicatorCharacterIds: typingCharacterIds,
					typingIndicatorCharacterId: typingCharacterIds[0] ?? null
				};
			}
			const typingCharacterIds = uniqueTypingIds([nextCharacterId]);
			return {
				visibleMessages,
				typingIndicatorCharacterIds: typingCharacterIds,
				typingIndicatorCharacterId: typingCharacterIds[0] ?? null
			};
		}
	}

	return {
		visibleMessages,
		typingIndicatorCharacterIds: [],
		typingIndicatorCharacterId: null
	};
}
