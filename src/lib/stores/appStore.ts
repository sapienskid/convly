import { writable, derived, get } from 'svelte/store';
import {
	defaultCustomizationSettings,
	type Character,
	type Message,
	type Connection,
	type Tool,
	type PreviewState,
	type CustomizationSettings
} from '$lib/types';
import { loadFromIndexedDB, saveToIndexedDB } from '$lib/utils/indexedDB';
import { analyzeMessageFlow } from '$lib/utils/messageFlow';
import {
	analyzeConversationQA,
	type ConversationFixAction
} from '$lib/utils/conversationQA';

const demoCharacters: Character[] = [
	{
		id: 'char-demo-1',
		username: 'Alex Chen',
		avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlexChen&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90',
		roleColor: '#2563eb',
		position: { x: 100, y: 100 }
	},
	{
		id: 'char-demo-2',
		username: 'Sarah Wilson',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahWilson&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90',
		roleColor: '#ff6f3b',
		position: { x: 100, y: 300 }
	},
	{
		id: 'char-demo-3',
		username: 'Priya Nair',
		avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=PriyaNair&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90',
		roleColor: '#0ea5a4',
		position: { x: 100, y: 500 }
	}
];

const demoConversation: Array<{
	id: string;
	characterId: string;
	text: string;
	replyTo?: string;
}> = [
	{ id: 'msg-demo-1', characterId: 'char-demo-1', text: 'Morning team, kickoff in five minutes.' },
	{ id: 'msg-demo-2', characterId: 'char-demo-2', text: "I'm in. Uploading the first storyboard now." },
	{ id: 'msg-demo-3', characterId: 'char-demo-3', text: 'Got it. I will prep captions and timestamps.' },
	{
		id: 'msg-demo-4',
		characterId: 'char-demo-1',
		text: 'Nice, can you also add the alternate intro?',
		replyTo: 'msg-demo-2'
	},
	{ id: 'msg-demo-5', characterId: 'char-demo-2', text: 'Yes. I will share version A and version B.' },
	{
		id: 'msg-demo-6',
		characterId: 'char-demo-3',
		text: 'I connected the first six messages in flow.'
	},
	{
		id: 'msg-demo-7',
		characterId: 'char-demo-1',
		text: 'Great. Make version B the default for preview.',
		replyTo: 'msg-demo-5'
	},
	{
		id: 'msg-demo-8',
		characterId: 'char-demo-2',
		text: 'Done. Added transitions and adjusted pacing.'
	},
	{
		id: 'msg-demo-9',
		characterId: 'char-demo-3',
		text: 'Scrolling test: adding more lines so we can validate overflow behavior.'
	},
	{
		id: 'msg-demo-10',
		characterId: 'char-demo-1',
		text: 'Perfect. If this sequence plays smoothly, we are ready to export.',
		replyTo: 'msg-demo-8'
	},
	{
		id: 'msg-demo-11',
		characterId: 'char-demo-2',
		text: 'QA pass done. No clipping on 1080x1920, 720x1280, or 540x960.'
	},
	{
		id: 'msg-demo-12',
		characterId: 'char-demo-3',
		text: 'I also checked contrast and avatar visibility on dark and light backgrounds.'
	},
	{
		id: 'msg-demo-13',
		characterId: 'char-demo-1',
		text: 'Great. Ship this draft and queue the short teaser variant next.',
		replyTo: 'msg-demo-11'
	},
	{
		id: 'msg-demo-14',
		characterId: 'char-demo-2',
		text: 'Queued. Final export starts now with music at 30 percent and notifications enabled.'
	}
];

const demoStartTime = Date.now() - demoConversation.length * 60_000;
const demoMessages: Message[] = demoConversation.map((entry, index) => ({
	id: entry.id,
	characterId: entry.characterId,
	text: entry.text,
	position: { x: 420 + (index % 2) * 44, y: 80 + index * 132 },
	timestamp: new Date(demoStartTime + index * 60_000).toISOString(),
	replyTo: entry.replyTo
}));

const demoFlowColors = ['#ff6f3b', '#0ea5a4', '#2563eb', '#f59e0b', '#ef4444'];
const demoCharacterColors = Object.fromEntries(demoCharacters.map((character) => [character.id, character.roleColor]));

const demoConnections: Connection[] = [
	...demoMessages.map((message) => ({
		id: `conn-demo-assign-${message.id}-${message.characterId ?? 'none'}`,
		from: message.id,
		to: message.characterId ?? '',
		type: 'assignment' as const,
		color: demoCharacterColors[message.characterId ?? ''] ?? '#99aab5'
	})),
	...demoMessages.slice(0, -1).map((message, index) => ({
		id: `conn-demo-flow-${index + 1}`,
		from: message.id,
		to: demoMessages[index + 1].id,
		type: 'flow' as const,
		color: demoFlowColors[index % demoFlowColors.length]
	}))
];

export const isInitialized = writable(false);

export const characters = writable<Character[]>([]);
export const messages = writable<Message[]>([]);
export const connections = writable<Connection[]>([]);

function mergeCustomizationSettings(
	settings?: Partial<CustomizationSettings> | Record<string, unknown> | null
): CustomizationSettings {
	return {
		...defaultCustomizationSettings,
		...(settings ?? {}),
		resolution: 'vertical-1080x1920'
	} as CustomizationSettings;
}

const flowColors = ['#ff6f3b', '#0ea5a4', '#2563eb', '#f59e0b', '#ef4444', '#14b8a6', '#0f766e', '#64748b'];

const GRAPH_LAYOUT = {
	characterColumnX: 100,
	columnGap: 540,
	characterVerticalSpacing: 260,
	messageBaseGap: 96,
	newMessageVerticalSpacing: 340,
	speakerLaneOffset: 120,
	replyIndent: 86,
	minMessageHeight: 230,
	maxMessageHeight: 860,
	messageNodeWidth: 360,
	overlapPadding: 18
} as const;

function estimateMessageNodeHeight(message: Message): number {
	const text = message.text.trim();
	const approxCharsPerLine = 34;
	const explicitLineBreaks = Math.max(0, text.split(/\r?\n/).length - 1);
	const estimatedLines = Math.max(1, Math.ceil(text.length / approxCharsPerLine) + explicitLineBreaks);
	const cappedLines = Math.min(estimatedLines, 32);
	const textHeight = cappedLines * 22;
	const replyHeight = message.replyTo ? 84 : 0;
	const rawHeight = 162 + textHeight + replyHeight;
	return Math.max(
		GRAPH_LAYOUT.minMessageHeight,
		Math.min(GRAPH_LAYOUT.maxMessageHeight, rawHeight)
	);
}

function hasOverlappingMessages(allMessages: Message[]): boolean {
	const getMessageBounds = (message: Message) => ({
		left: message.position.x - GRAPH_LAYOUT.overlapPadding,
		right:
			message.position.x +
			GRAPH_LAYOUT.messageNodeWidth +
			GRAPH_LAYOUT.overlapPadding,
		top: message.position.y - GRAPH_LAYOUT.overlapPadding,
		bottom:
			message.position.y +
			estimateMessageNodeHeight(message) +
			GRAPH_LAYOUT.overlapPadding
	});

	for (let i = 0; i < allMessages.length; i += 1) {
		for (let j = i + 1; j < allMessages.length; j += 1) {
			const currentBounds = getMessageBounds(allMessages[i]);
			const compareBounds = getMessageBounds(allMessages[j]);
			const overlapsHorizontally =
				currentBounds.left < compareBounds.right &&
				currentBounds.right > compareBounds.left;
			const overlapsVertically =
				currentBounds.top < compareBounds.bottom &&
				currentBounds.bottom > compareBounds.top;

			if (overlapsHorizontally && overlapsVertically) {
				return true;
			}
		}
	}

	return false;
}

function buildAutoLayout(
	allCharacters: Character[],
	allMessages: Message[],
	allConnections: Connection[]
): { characters: Character[]; messages: Message[] } {
	if (allCharacters.length === 0 && allMessages.length === 0) {
		return { characters: allCharacters, messages: allMessages };
	}

	const sortedCharacters = [...allCharacters].sort((a, b) => a.position.y - b.position.y);
	const minCharacterX =
		sortedCharacters.length > 0
			? Math.min(...sortedCharacters.map((character) => character.position.x))
			: GRAPH_LAYOUT.characterColumnX;
	const characterColumnX = Math.max(60, Math.round(minCharacterX));
	const messageColumnX = characterColumnX + GRAPH_LAYOUT.columnGap;

	const minYSource = [...sortedCharacters.map((character) => character.position.y), ...allMessages.map((message) => message.position.y)];
	const startY = Math.max(70, Math.round((minYSource.length > 0 ? Math.min(...minYSource) : 80) - 10));

	const arrangedCharacterList = sortedCharacters.map((character, index) => ({
		...character,
		position: {
			x: characterColumnX,
			y: startY + index * GRAPH_LAYOUT.characterVerticalSpacing
		}
	}));
	const characterIndexById = new Map(
		arrangedCharacterList.map((character, index) => [character.id, index])
	);
	const laneCenter =
		arrangedCharacterList.length > 1 ? (arrangedCharacterList.length - 1) / 2 : 0;

	const flowOrderedMessages = analyzeMessageFlow(allMessages, allConnections).map(
		(info) => info.message
	);
	const seenMessageIds = new Set(flowOrderedMessages.map((message) => message.id));
	const orderedMessages = [
		...flowOrderedMessages,
		...allMessages.filter((message) => !seenMessageIds.has(message.id))
	];

	let nextMessageY = startY;
	const arrangedMessageList = orderedMessages.map((message) => {
		const laneIndex = message.characterId
			? (characterIndexById.get(message.characterId) ?? 0)
			: 0;
		const laneOffset =
			arrangedCharacterList.length > 1
				? (laneIndex - laneCenter) * GRAPH_LAYOUT.speakerLaneOffset
				: 0;
		const replyOffset = message.replyTo ? GRAPH_LAYOUT.replyIndent : 0;
		const yPosition = Math.round(nextMessageY);
		nextMessageY += estimateMessageNodeHeight(message) + GRAPH_LAYOUT.messageBaseGap;

		return {
			...message,
			position: {
				x: Math.round(messageColumnX + laneOffset + replyOffset),
				y: yPosition
			}
		};
	});

	const arrangedCharacterById = new Map(
		arrangedCharacterList.map((character) => [character.id, character])
	);
	const arrangedMessageById = new Map(arrangedMessageList.map((message) => [message.id, message]));

	return {
		characters: allCharacters.map(
			(character) => arrangedCharacterById.get(character.id) ?? character
		),
		messages: allMessages.map((message) => arrangedMessageById.get(message.id) ?? message)
	};
}

function getMessageToMessageHandles(fromMessage: Message, toMessage: Message) {
	const dx = toMessage.position.x - fromMessage.position.x;
	const dy = toMessage.position.y - fromMessage.position.y;
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);

	if (absDx >= absDy) {
		return {
			sourceHandle: 'source-' + (dx >= 0 ? 'right' : 'left'),
			targetHandle: 'target-' + (dx >= 0 ? 'left' : 'right')
		};
	}

	return {
		sourceHandle: 'source-' + (dy >= 0 ? 'bottom' : 'top'),
		targetHandle: 'target-' + (dy >= 0 ? 'top' : 'bottom')
	};
}

function getMessageToCharacterHandles(message: Message, character: Character) {
	const dx = character.position.x - message.position.x;
	const dy = character.position.y - message.position.y;
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);

	const sourceHandle =
		absDx >= absDy
			? 'source-' + (dx >= 0 ? 'right' : 'left')
			: 'source-' + (dy >= 0 ? 'bottom' : 'top');

	return {
		sourceHandle,
		targetHandle: 'target'
	};
}

function wouldCreateFlowCycle(from: string, to: string, existingConnections: Connection[]): boolean {
	if (from === to) return true;

	const adjacency = new Map<string, string[]>();
	for (const conn of existingConnections) {
		if (conn.type !== 'flow') continue;
		if (!adjacency.has(conn.from)) adjacency.set(conn.from, []);
		adjacency.get(conn.from)!.push(conn.to);
	}

	const visited = new Set<string>();
	const stack = [to];

	while (stack.length > 0) {
		const current = stack.pop()!;
		if (current === from) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		for (const next of adjacency.get(current) ?? []) {
			if (!visited.has(next)) stack.push(next);
		}
	}

	return false;
}

function normalizeConnections(
	rawConnections: Connection[],
	allCharacters: Character[],
	allMessages: Message[]
): Connection[] {
	const characterMap = new Map(allCharacters.map((character) => [character.id, character]));
	const messageMap = new Map(allMessages.map((message) => [message.id, message]));
	const normalized: Connection[] = [];
	const seen = new Set<string>();

	const addNormalizedConnection = (connection: Connection) => {
		const key = `${connection.type}:${connection.from}:${connection.to}`;
		if (seen.has(key)) return;
		seen.add(key);
		normalized.push(connection);
	};

	for (const conn of rawConnections) {
		if (conn.type === 'assignment') {
			const fromMessage = messageMap.get(conn.from);
			const toCharacter = characterMap.get(conn.to);
			if (fromMessage && toCharacter) {
				const handles = getMessageToCharacterHandles(fromMessage, toCharacter);
				addNormalizedConnection({
					...conn,
					from: fromMessage.id,
					to: toCharacter.id,
					sourceHandle: conn.sourceHandle ?? handles.sourceHandle,
					targetHandle: conn.targetHandle ?? handles.targetHandle,
					color: conn.color || toCharacter.roleColor
				});
				continue;
			}

			// Legacy migration: character -> message to message -> character.
			const legacyFromCharacter = characterMap.get(conn.from);
			const legacyToMessage = messageMap.get(conn.to);
			if (legacyFromCharacter && legacyToMessage) {
				const handles = getMessageToCharacterHandles(legacyToMessage, legacyFromCharacter);
				addNormalizedConnection({
					...conn,
					from: legacyToMessage.id,
					to: legacyFromCharacter.id,
					sourceHandle: handles.sourceHandle,
					targetHandle: handles.targetHandle,
					color: conn.color || legacyFromCharacter.roleColor
				});
			}
			continue;
		}

		if (conn.type === 'flow' || conn.type === 'reply') {
			const fromMessage = messageMap.get(conn.from);
			const toMessage = messageMap.get(conn.to);
			if (!fromMessage || !toMessage || fromMessage.id === toMessage.id) continue;
			if (conn.type === 'flow' && wouldCreateFlowCycle(fromMessage.id, toMessage.id, normalized)) {
				continue;
			}
			const handles = getMessageToMessageHandles(fromMessage, toMessage);
			addNormalizedConnection({
				...conn,
				from: fromMessage.id,
				to: toMessage.id,
				sourceHandle: conn.sourceHandle ?? handles.sourceHandle,
				targetHandle: conn.targetHandle ?? handles.targetHandle
			});
		}
	}

	// Ensure every explicitly assigned message has a visible assignment edge.
	for (const message of allMessages) {
		if (!message.characterId) continue;
		const character = characterMap.get(message.characterId);
		if (!character) continue;
		const handles = getMessageToCharacterHandles(message, character);
		addNormalizedConnection({
			id: `conn-assign-${message.id}-${character.id}`,
			from: message.id,
			to: character.id,
			type: 'assignment',
			color: character.roleColor,
			sourceHandle: handles.sourceHandle,
			targetHandle: handles.targetHandle
		});
	}

	// Keep reply edges in sync with replyTo metadata.
	for (const message of allMessages) {
		if (!message.replyTo || !messageMap.has(message.replyTo) || message.replyTo === message.id) continue;
		const targetMessage = messageMap.get(message.replyTo)!;
		const handles = getMessageToMessageHandles(message, targetMessage);
		addNormalizedConnection({
			id: `conn-reply-${message.id}-${targetMessage.id}`,
			from: message.id,
			to: targetMessage.id,
			type: 'reply',
			color: '#94a3b8',
			sourceHandle: handles.sourceHandle,
			targetHandle: handles.targetHandle
		});
	}

	return normalized;
}

export async function initializeStore() {
	if (typeof window === 'undefined') return;
	
	try {
		const data = await loadFromIndexedDB();

		const loadedCharacters =
			data.characters && data.characters.length > 0 ? data.characters : demoCharacters;
		const loadedMessages =
			data.messages && data.messages.length > 0 ? data.messages : demoMessages;
		const loadedConnections =
			data.connections && data.connections.length > 0 ? data.connections : demoConnections;
		const arrangedLoadedGraph = buildAutoLayout(
			loadedCharacters,
			loadedMessages,
			loadedConnections
		);
		const normalizedConnections = normalizeConnections(
			loadedConnections,
			arrangedLoadedGraph.characters,
			arrangedLoadedGraph.messages
		);

		characters.set(arrangedLoadedGraph.characters);
		messages.set(arrangedLoadedGraph.messages);
		connections.set(normalizedConnections);
		
		customizeSettings.set(mergeCustomizationSettings(data.customizeSettings));
	} catch (error) {
		console.error('Failed to load from IndexedDB, using demo data:', error);
		const arrangedDemoGraph = buildAutoLayout(demoCharacters, demoMessages, demoConnections);
		characters.set(arrangedDemoGraph.characters);
		messages.set(arrangedDemoGraph.messages);
		connections.set(
			normalizeConnections(
				demoConnections,
				arrangedDemoGraph.characters,
				arrangedDemoGraph.messages
			)
		);
		customizeSettings.set(defaultCustomizationSettings);
	}
	
	isInitialized.set(true);
}

export function loadLongDemoConversation() {
	const clonedCharacters = demoCharacters.map((character) => ({
		...character,
		position: { ...character.position }
	}));
	const clonedMessages = demoMessages.map((message) => ({
		...message,
		position: { ...message.position }
	}));
	const arrangedDemoGraph = buildAutoLayout(clonedCharacters, clonedMessages, demoConnections);
	const normalizedConnections = normalizeConnections(
		demoConnections,
		arrangedDemoGraph.characters,
		arrangedDemoGraph.messages
	);

	characters.set(arrangedDemoGraph.characters);
	messages.set(arrangedDemoGraph.messages);
	connections.set(normalizedConnections);
	nodeConnectionModes.set({});
	selectedElement.set(clonedMessages[0]?.id ?? null);
	previewState.set('preview');
}

// UI state stores
export const selectedTool = writable<Tool>('select');
export const selectedElement = writable<string | null>(null);
export const editingCharacter = writable<string | null>(null);
export const connectionMode = writable<'flow' | 'reply'>('flow');

// Per-node connection modes
export const nodeConnectionModes = writable<Record<string, 'flow' | 'reply'>>({});

// Preview state stores
export const previewState = writable<PreviewState>('preview');
export const isGenerating = writable<boolean>(false);

export const customizeSettings = writable<CustomizationSettings>(defaultCustomizationSettings);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(key: string, value: any) {
	if (saveTimeout) {
		clearTimeout(saveTimeout);
	}
	saveTimeout = setTimeout(() => {
		saveToIndexedDB(key as any, value).catch(console.error);
	}, 300);
}

if (typeof window !== 'undefined') {
	characters.subscribe((value) => {
		if (get(isInitialized)) {
			debouncedSave('characters', value);
		}
	});
	
	messages.subscribe((value) => {
		if (get(isInitialized)) {
			debouncedSave('messages', value);
		}
	});
	
	connections.subscribe((value) => {
		if (get(isInitialized)) {
			debouncedSave('connections', value);
		}
	});
	
	customizeSettings.subscribe((value) => {
		if (get(isInitialized)) {
			debouncedSave('customizeSettings', value);
		}
	});
}

// Derived stores for optimized lookups
export const getCharacterById = (id: string) =>
	derived(characters, ($characters) => $characters.find((c) => c.id === id));

export const getMessageById = (id: string) =>
	derived(messages, ($messages) => $messages.find((m) => m.id === id));

export const getMessagesForCharacter = (characterId: string) =>
	derived(messages, ($messages) => $messages.filter((m) => m.characterId === characterId));

export const getConnectionsForElement = (elementId: string) =>
	derived(connections, ($connections) =>
		$connections.filter((c) => c.from === elementId || c.to === elementId)
	);

export function autoArrangeGraph(options: { force?: boolean } = { force: true }): boolean {
	const allCharacters = get(characters);
	const allMessages = get(messages);
	const allConnections = get(connections);
	const force = options.force ?? true;

	if (allCharacters.length === 0 && allMessages.length === 0) {
		return false;
	}

	if (!force && !hasOverlappingMessages(allMessages)) {
		return false;
	}

	const arrangedGraph = buildAutoLayout(allCharacters, allMessages, allConnections);
	const normalizedConnections = normalizeConnections(
		allConnections,
		arrangedGraph.characters,
		arrangedGraph.messages
	);

	characters.set(arrangedGraph.characters);
	messages.set(arrangedGraph.messages);
	connections.set(normalizedConnections);
	return true;
}

function normalizeCurrentGraph() {
	const allCharacters = get(characters);
	const allMessages = get(messages);
	const allConnections = get(connections);
	const normalizedConnections = normalizeConnections(
		allConnections,
		allCharacters,
		allMessages
	);
	connections.set(normalizedConnections);
}

export function applyConversationQAFix(action: ConversationFixAction): number {
	const beforeReport = analyzeConversationQA(
		get(characters),
		get(messages),
		get(connections)
	);
	const beforeCount = beforeReport.errorCount + beforeReport.warningCount;

	if (action === 'assign_unassigned_messages') {
		const allCharacters = get(characters);
		const fallbackCharacter =
			allCharacters.length > 0
				? allCharacters.reduce((best, current) =>
						current.position.y < best.position.y ? current : best
					)
				: null;
		if (fallbackCharacter) {
			messages.update((existingMessages) =>
				existingMessages.map((message) => {
					if (message.characterId && allCharacters.some((character) => character.id === message.characterId)) {
						return message;
					}
					return { ...message, characterId: fallbackCharacter.id };
				})
			);
		}
		normalizeCurrentGraph();
		propagateSpeakerAssignments();
	} else if (action === 'remove_invalid_replies') {
		const existingMessageMap = new Map(get(messages).map((message) => [message.id, message]));
		messages.update((existingMessages) =>
			existingMessages.map((message) => {
				if (!message.replyTo) return message;
				if (message.replyTo === message.id || !existingMessageMap.has(message.replyTo)) {
					return { ...message, replyTo: undefined };
				}
				return message;
			})
		);
		normalizeCurrentGraph();
	} else if (action === 'repair_assignment_edges' || action === 'dedupe_connections') {
		normalizeCurrentGraph();
	}

	const afterReport = analyzeConversationQA(
		get(characters),
		get(messages),
		get(connections)
	);
	const afterCount = afterReport.errorCount + afterReport.warningCount;
	return Math.max(0, beforeCount - afterCount);
}

export function sendMessageFromPreview(input: {
	text: string;
	characterId?: string | null;
	replyTo?: string | null;
}): string | null {
	const text = input.text.trim();
	if (!text) return null;

	const allCharacters = get(characters);
	if (allCharacters.length === 0) return null;

	const allMessages = get(messages);
	const allConnections = get(connections);
	const characterById = new Map(allCharacters.map((character) => [character.id, character]));
	const resolvedCharacterId =
		(input.characterId && characterById.has(input.characterId)
			? input.characterId
			: allMessages[allMessages.length - 1]?.characterId ?? allCharacters[0]?.id) ?? null;

	const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	const message: Message = {
		id,
		characterId: resolvedCharacterId ?? undefined,
		text,
		position: {
			x: GRAPH_LAYOUT.characterColumnX + GRAPH_LAYOUT.columnGap,
			y: 100 + allMessages.length * GRAPH_LAYOUT.newMessageVerticalSpacing
		},
		timestamp: new Date().toISOString()
	};

	if (
		input.replyTo &&
		input.replyTo !== id &&
		allMessages.some((existingMessage) => existingMessage.id === input.replyTo)
	) {
		message.replyTo = input.replyTo;
	}

	const nextMessages = [...allMessages, message];
	const nextConnections = [...allConnections];

	if (message.characterId) {
		const character = characterById.get(message.characterId);
		if (character) {
			nextConnections.push({
				id: `conn-preview-assign-${id}-${character.id}`,
				from: id,
				to: character.id,
				type: 'assignment',
				color: character.roleColor
			});
		}
	}

	if (allMessages.length > 0) {
		const orderedMessages = analyzeMessageFlow(allMessages, allConnections).map(
			(info) => info.message
		);
		const previousMessage =
			orderedMessages[orderedMessages.length - 1] ?? allMessages[allMessages.length - 1];
		if (
			previousMessage &&
			!nextConnections.some(
				(connection) =>
					connection.type === 'flow' &&
					connection.from === previousMessage.id &&
					connection.to === id
			)
		) {
			nextConnections.push({
				id: `conn-preview-flow-${previousMessage.id}-${id}`,
				from: previousMessage.id,
				to: id,
				type: 'flow',
				color: flowColors[nextMessages.length % flowColors.length]
			});
		}
	}

	if (message.replyTo) {
		nextConnections.push({
			id: `conn-preview-reply-${id}-${message.replyTo}`,
			from: id,
			to: message.replyTo,
			type: 'reply',
			color: '#94a3b8'
		});
	}

	const normalizedConnections = normalizeConnections(
		nextConnections,
		allCharacters,
		nextMessages
	);

	messages.set(nextMessages);
	connections.set(normalizedConnections);
	selectedElement.set(id);
	propagateSpeakerAssignments();
	autoArrangeGraph({ force: true });
	return id;
}

// Character actions
export function addCharacter(character: Omit<Character, 'id'>): string {
	const id = `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const newCharacter = { ...character, id };
	characters.update((chars) => [...chars, newCharacter]);
	return id;
}

export function updateCharacter(id: string, updates: Partial<Character>) {
	characters.update((chars) =>
		chars.map((char) => (char.id === id ? { ...char, ...updates } : char))
	);
}

export function updateCharacterPosition(id: string, position: { x: number; y: number }) {
	let changed = false;
	characters.update((chars) =>
		chars.map((char) => {
			if (char.id !== id) return char;
			if (char.position.x === position.x && char.position.y === position.y) {
				return char;
			}
			changed = true;
			return { ...char, position };
		})
	);
	if (changed) {
		// Recalculate connection handles for edges involving this character.
		recalculateHandlesForNode(id);
	}
}

export function updateCharacterRotation(id: string, rotation: number) {
	characters.update((chars) =>
		chars.map((char) => (char.id === id ? { ...char, rotation } : char))
	);
}

export function deleteCharacter(id: string) {
	const msgs = get(messages);
	const messageIdsToRemove = msgs.filter((msg) => msg.characterId === id).map((msg) => msg.id);
	for (const messageId of messageIdsToRemove) {
		deleteMessage(messageId);
	}
	characters.update((chars) => chars.filter((char) => char.id !== id));
	connections.update((conns) => conns.filter((conn) => conn.from !== id && conn.to !== id));
}

// Message actions
export function addMessage(message: Omit<Message, 'id'>): string {
	const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const newMessage = { ...message, id };
	messages.update((msgs) => [...msgs, newMessage]);
	return id;
}

export function updateMessage(id: string, updates: Partial<Message>, skipPropagation = false) {
	const shouldPropagate = !skipPropagation && 'characterId' in updates;
	messages.update((msgs) => msgs.map((msg) => {
		if (msg.id === id) {
			const updatedMsg = { ...msg, ...updates };
			// Remove undefined values
			Object.keys(updatedMsg).forEach(key => {
				if (updatedMsg[key as keyof Message] === undefined) {
					delete updatedMsg[key as keyof Message];
				}
			});
			return updatedMsg;
		}
		return msg;
	}));
	if (shouldPropagate) {
		propagateSpeakerAssignments();
	}
}

export function updateMessagePosition(id: string, position: { x: number; y: number }) {
	let changed = false;
	messages.update((msgs) =>
		msgs.map((msg) => {
			if (msg.id !== id) return msg;
			if (msg.position.x === position.x && msg.position.y === position.y) {
				return msg;
			}
			changed = true;
			return { ...msg, position };
		})
	);
	if (changed) {
		recalculateHandlesForNode(id);
	}
}

export function updateMessageRotation(id: string, rotation: number) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, rotation } : msg)));
}

// Helper to recompute optimal handles for existing connections when nodes move
function recalculateHandlesForNode(nodeId: string) {
	const chars = get(characters);
	const msgs = get(messages);
	const charsById = new Map(chars.map((character) => [character.id, character]));
	const msgsById = new Map(msgs.map((message) => [message.id, message]));

	connections.update((conns) => {
		let changed = false;
		const nextConnections = conns.map((conn) => {
			// Only adjust flow edges or assignment edges where dynamic positioning matters
			if (conn.type === 'flow' && (conn.from === nodeId || conn.to === nodeId)) {
				const fromMsg = msgsById.get(conn.from);
				const toMsg = msgsById.get(conn.to);
				if (fromMsg && toMsg) {
					const { sourceHandle: newSourceHandle, targetHandle: newTargetHandle } =
						getMessageToMessageHandles(fromMsg, toMsg);
					if (newSourceHandle !== conn.sourceHandle || newTargetHandle !== conn.targetHandle) {
						changed = true;
						return { ...conn, sourceHandle: newSourceHandle, targetHandle: newTargetHandle };
					}
				}
			} else if (conn.type === 'assignment' && (conn.from === nodeId || conn.to === nodeId)) {
				// Assignment is normalized as message -> character.
				const msg = msgsById.get(conn.from);
				const char = charsById.get(conn.to);
				if (msg && char) {
					const { sourceHandle, targetHandle } = getMessageToCharacterHandles(msg, char);
					if (sourceHandle !== conn.sourceHandle || targetHandle !== conn.targetHandle) {
						changed = true;
						return { ...conn, sourceHandle, targetHandle };
					}
				}
			}
			return conn;
		});
		return changed ? nextConnections : conns;
	});
}

// Automatically propagate speaker assignments along flow connections
function propagateSpeakerAssignments() {
	const allConnections = get(connections);
	const allMessages = get(messages);
	const allCharacters = get(characters);

	if (allMessages.length === 0) {
		return;
	}

	// Direct assignments are explicit message -> speaker assignment edges.
	const directAssignments = new Set<string>();
	for (const conn of allConnections) {
		if (conn.type === 'assignment') {
			directAssignments.add(conn.from); // normalized as from=message to=character
		}
	}

	// Build directed adjacency list from flow edges (from -> to).
	const adjacency = new Map<string, string[]>();
	const inDegree = new Map<string, number>();
	for (const message of allMessages) {
		inDegree.set(message.id, 0);
	}

	for (const conn of allConnections) {
		if (conn.type !== 'flow') continue;
		if (!adjacency.has(conn.from)) adjacency.set(conn.from, []);
		adjacency.get(conn.from)!.push(conn.to);
		inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
	}

	const messageMap = new Map(allMessages.map((msg) => [msg.id, msg]));
	const finalAssignments = new Map<string, string>();

	const topmostCharacter = allCharacters.reduce<Character | null>(
		(topmost, current) =>
			!topmost || current.position.y < topmost.position.y ? current : topmost,
		null
	);
	const topmostCharacterId = topmostCharacter?.id;

	// Queue starts with explicitly assigned messages.
	const propagationQueue: Array<{ id: string; charId: string }> = [];
	for (const messageId of directAssignments) {
		const message = messageMap.get(messageId);
		if (message?.characterId) {
			finalAssignments.set(messageId, message.characterId);
			propagationQueue.push({ id: messageId, charId: message.characterId });
		}
	}

	// If no explicit assignment exists for a flow root, seed with fallback character.
	if (propagationQueue.length === 0 && topmostCharacterId) {
		for (const message of allMessages) {
			const outgoing = adjacency.get(message.id);
			const hasOutgoing = Boolean(outgoing && outgoing.length > 0);
			const hasIncoming = (inDegree.get(message.id) || 0) > 0;
			if (hasOutgoing && !hasIncoming) {
				finalAssignments.set(message.id, topmostCharacterId);
				propagationQueue.push({ id: message.id, charId: topmostCharacterId });
			}
		}
	}

	while (propagationQueue.length > 0) {
		const { id, charId } = propagationQueue.shift()!;
		for (const nextId of adjacency.get(id) ?? []) {
			const nextMessage = messageMap.get(nextId);
			if (!nextMessage) continue;

			if (directAssignments.has(nextId) && nextMessage.characterId) {
				if (finalAssignments.get(nextId) !== nextMessage.characterId) {
					finalAssignments.set(nextId, nextMessage.characterId);
					propagationQueue.push({ id: nextId, charId: nextMessage.characterId });
				}
				continue;
			}

			if (finalAssignments.get(nextId) !== charId) {
				finalAssignments.set(nextId, charId);
				propagationQueue.push({ id: nextId, charId });
			}
		}
	}

	// Apply assignments. Direct assignments remain untouched.
	messages.update((existing) =>
		existing.map((msg) => {
			if (directAssignments.has(msg.id)) {
				return msg;
			}
			if (finalAssignments.has(msg.id)) {
				return { ...msg, characterId: finalAssignments.get(msg.id) };
			}
			if (msg.characterId) {
				return { ...msg, characterId: undefined };
			}
			return msg;
		})
	);
}

export function updateMessageText(id: string, text: string) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
}

export function deleteMessage(id: string) {
	messages.update((msgs) =>
		msgs
			.map((msg) => (msg.replyTo === id ? { ...msg, replyTo: undefined } : msg))
			.filter((msg) => msg.id !== id)
	);
	connections.update((conns) => conns.filter((conn) => conn.from !== id && conn.to !== id));
}

// Connection actions
export function addConnection(connection: Omit<Connection, 'id'>): string {
	const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	const newConnection = { ...connection, id };
	connections.update((conns) => [...conns, newConnection]);
	return id;
}

export function deleteConnection(id: string) {
	const conns = get(connections);
	const connection = conns.find((c) => c.id === id);

	if (connection && connection.type === 'assignment') {
		const msgs = get(messages);
		const message = msgs.find((m) => m.id === connection.from);
		if (message) {
			updateMessage(message.id, { characterId: undefined });
		}
	}

	if (connection && connection.type === 'reply') {
		const msgs = get(messages);
		const message = msgs.find((m) => m.id === connection.from);
		if (message?.replyTo === connection.to) {
			updateMessage(message.id, { replyTo: undefined }, true);
		}
	}

	// Remove the connection
	connections.update((conns) => conns.filter((conn) => conn.id !== id));

	// If it was a flow connection, re-evaluate speaker assignments
	// as the deletion might disconnect speaker propagation paths
	if (connection && connection.type === 'flow') {
		propagateSpeakerAssignments();
	}
}

// Utility actions
export function addCharacterAtPosition(position: { x: number; y: number }): string {
	const chars = get(characters);
	const adjustedPosition = {
		x: Math.max(50, position.x + (Math.random() - 0.5) * 40),
		y: Math.max(50, position.y + (Math.random() - 0.5) * 40)
	};

	const colors = ['#ff6f3b', '#0ea5a4', '#2563eb', '#f59e0b', '#ef4444', '#14b8a6', '#0f766e', '#64748b'];
	const avatarStyles = ['bottts', 'avataaars', 'pixel-art', 'lorelei', 'notionists'];
	const username = `User ${chars.length + 1}`;
	const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
	const randomSeed = Math.random().toString(36).substring(7);
	
	const newCharacter = {
		username,
		avatar: `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90`,
		roleColor: colors[Math.floor(Math.random() * colors.length)],
		position: adjustedPosition
	};

	const id = addCharacter(newCharacter);
	selectedElement.set(id);
	autoArrangeGraph({ force: false });
	return id;
}

export function addMessageAtPosition(position: { x: number; y: number }): string {
	const msgs = get(messages);
	const adjustedPosition = {
		x: Math.max(50, position.x + (Math.random() - 0.5) * 40),
		y: Math.max(50, position.y + (Math.random() - 0.5) * 40)
	};

	const newMessage = {
		characterId: undefined,
		text: `Hello, this is message ${msgs.length + 1}!`,
		position: adjustedPosition,
		timestamp: new Date().toISOString()
	};

	const id = addMessage(newMessage);
	selectedElement.set(id);
	autoArrangeGraph({ force: false });
	return id;
}

export function addMessageForCharacter(characterId: string): string {
	const chars = get(characters);
	const msgs = get(messages);
	const character = chars.find((c) => c.id === characterId);
	if (!character) return '';

	const characterMessages = msgs.filter((m) => m.characterId === characterId);
	const baseX = character.position.x + 360;
	const baseY =
		character.position.y + characterMessages.length * GRAPH_LAYOUT.newMessageVerticalSpacing;

	const newMessage = {
		characterId,
		text: 'New message...',
		position: { x: baseX, y: baseY },
		timestamp: new Date().toISOString()
	};

	const id = addMessage(newMessage);
	const { sourceHandle, targetHandle } = getMessageToCharacterHandles(
		{ ...newMessage, id },
		character
	);
	addConnection({
		from: id,
		to: character.id,
		type: 'assignment',
		color: character.roleColor,
		sourceHandle,
		targetHandle
	});
	selectedElement.set(id);
	propagateSpeakerAssignments();
	autoArrangeGraph({ force: false });
	return id;
}

export function createConnection(
	from: string,
	to: string,
	sourceHandle?: string,
	targetHandle?: string
) {
	const conns = get(connections);
	const chars = get(characters);
	const msgs = get(messages);
	const nodeModes = get(nodeConnectionModes);
	const mode = nodeModes[from] || 'flow';

	if (from === to) return;

	const fromCharacter = chars.find((c) => c.id === from);
	const toCharacter = chars.find((c) => c.id === to);
	const fromMessage = msgs.find((m) => m.id === from);
	const toMessage = msgs.find((m) => m.id === to);

	let type: 'flow' | 'assignment' | 'reply' = 'flow';
	let color = 'hsl(var(--muted-foreground))';
	let finalFrom = from;
	let finalTo = to;
	let finalSourceHandle = sourceHandle;
	let finalTargetHandle = targetHandle;

	// Undirected assignment: message <-> speaker gets normalized to message -> speaker.
	if ((fromMessage && toCharacter) || (toMessage && fromCharacter)) {
		const isCanonicalDirection = Boolean(fromMessage && toCharacter);
		const message = fromMessage ?? toMessage!;
		const character = toCharacter ?? fromCharacter!;
		type = 'assignment';
		color = character.roleColor;
		finalFrom = message.id;
		finalTo = character.id;

		if (message.characterId && message.characterId !== character.id) {
			return;
		}

		const existingAssignment = conns.find(
			(connection) => connection.type === 'assignment' && connection.from === message.id
		);
		if (existingAssignment && existingAssignment.to !== character.id) {
			return;
		}

		updateMessage(message.id, { characterId: character.id });
		const handles = getMessageToCharacterHandles(message, character);
		finalSourceHandle = isCanonicalDirection ? sourceHandle ?? handles.sourceHandle : handles.sourceHandle;
		finalTargetHandle = isCanonicalDirection ? targetHandle ?? handles.targetHandle : handles.targetHandle;
	}
	// Message to Message connections
	else if (fromMessage && toMessage) {
		const handles = getMessageToMessageHandles(fromMessage, toMessage);
		finalSourceHandle = sourceHandle ?? handles.sourceHandle;
		finalTargetHandle = targetHandle ?? handles.targetHandle;

		if (mode === 'reply') {
			type = 'reply';
			color = '#94a3b8';
			// Reply remains directional: source message replies to target message.
			if (fromMessage.replyTo && fromMessage.replyTo !== toMessage.id) {
				return;
			}

			const existingReplyEdge = conns.find(
				(connection) => connection.type === 'reply' && connection.from === fromMessage.id
			);
			if (existingReplyEdge && existingReplyEdge.to !== toMessage.id) {
				return;
			}

			updateMessage(fromMessage.id, { replyTo: toMessage.id }, true);
		} else {
			type = 'flow';
			color = flowColors[Math.floor(Math.random() * flowColors.length)];
			// Flow remains directional to preserve ordering semantics.
			if (wouldCreateFlowCycle(fromMessage.id, toMessage.id, conns)) {
				return;
			}
		}
	}
	// No speaker-speaker edges.
	else {
		return;
	}

	const exists = conns.some(
		(c) =>
			c.type === type && c.from === finalFrom && c.to === finalTo
	);
	if (exists) return;

	addConnection({
		from: finalFrom,
		to: finalTo,
		type,
		color,
		sourceHandle: finalSourceHandle,
		targetHandle: finalTargetHandle
	});

	// After adding the connection, propagate speaker assignments along the flow
	// This will auto-assign characters to unassigned messages following the flow
	if (type === 'flow') {
		propagateSpeakerAssignments();
	} else if (type === 'assignment') {
		// When assigning a character, also propagate downstream
		propagateSpeakerAssignments();
	}

	autoArrangeGraph({ force: false });
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

function readMessageText(record: Record<string, unknown>): string | undefined {
	const direct = readFirstString(record, ['text', 'message', 'content', 'body']);
	if (direct) return direct;

	const content = record.content;
	if (Array.isArray(content)) {
		const chunks = content
			.map((item) => {
				if (typeof item === 'string') return item.trim();
				const itemRecord = asRecord(item);
				if (!itemRecord) return '';
				const text = itemRecord.text;
				return typeof text === 'string' ? text.trim() : '';
			})
			.filter(Boolean);
		if (chunks.length > 0) return chunks.join(' ');
	}

	const nested = asRecord(content);
	if (nested) {
		return readFirstString(nested, ['text', 'message']);
	}

	return undefined;
}

function parseConversationEntries(payload: unknown): Record<string, unknown>[] {
	if (Array.isArray(payload)) {
		return payload.filter((item): item is Record<string, unknown> => asRecord(item) !== null);
	}

	const record = asRecord(payload);
	if (!record) {
		return [];
	}

	const candidates = ['conversation', 'messages', 'entries', 'data', 'chat', 'transcript'];
	for (const key of candidates) {
		const value = record[key];
		if (Array.isArray(value)) {
			return value.filter((item): item is Record<string, unknown> => asRecord(item) !== null);
		}
	}

	return [];
}

export function importConversationFromJSON(payload: unknown) {
	const entries = parseConversationEntries(payload);
	if (entries.length === 0) {
		throw new Error(
			'No messages found. Use a JSON array or an object with a "conversation" or "messages" array.'
		);
	}

	const normalizedEntries = entries
		.map((entry, index) => {
			const speaker =
				readFirstString(entry, ['speaker', 'character', 'username', 'author', 'name', 'role']) ||
				`Speaker ${index + 1}`;
			const text = readMessageText(entry);
			const timestamp =
				readFirstString(entry, ['timestamp', 'createdAt', 'time']) || new Date().toISOString();
			const replyRef =
				entry.replyTo ??
				entry.reply_to ??
				entry.inReplyTo ??
				entry.reply ??
				null;
			const externalId = entry.id;

			if (!text) return null;
			return {
				speaker,
				text,
				timestamp,
				replyRef,
				externalId: typeof externalId === 'string' || typeof externalId === 'number' ? String(externalId) : null,
				index
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

	if (normalizedEntries.length === 0) {
		throw new Error('Messages were found but none contained text content.');
	}

	const uniqueSpeakers: string[] = [];
	for (const entry of normalizedEntries) {
		if (!uniqueSpeakers.includes(entry.speaker)) {
			uniqueSpeakers.push(entry.speaker);
		}
	}

	const colorPalette = ['#ff6f3b', '#0ea5a4', '#2563eb', '#f59e0b', '#ef4444', '#14b8a6', '#0f766e', '#64748b'];
	const speakerMap = new Map<string, Character>();
	const importedCharacters: Character[] = uniqueSpeakers.map((speaker, index) => {
		const id = `char-import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
		const character: Character = {
			id,
			username: speaker,
			avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
				speaker
			)}&backgroundColor=fde8db,bdeee8,fbe7b2&scale=90`,
			roleColor: colorPalette[index % colorPalette.length],
			position: { x: 100, y: 80 + index * 180 }
		};
		speakerMap.set(speaker, character);
		return character;
	});

	const importedMessages: Message[] = [];
	const rawIdToMessageId = new Map<string, string>();
	const indexToMessageId = new Map<number, string>();
	const baseTime = Date.now() - normalizedEntries.length * 60_000;

	for (const [index, entry] of normalizedEntries.entries()) {
		const id = `msg-import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
		const speakerCharacter = speakerMap.get(entry.speaker)!;
		const parsedTime = Date.parse(entry.timestamp);
		const timestamp = Number.isFinite(parsedTime)
			? new Date(parsedTime).toISOString()
			: new Date(baseTime + index * 60_000).toISOString();

		const message: Message = {
			id,
			characterId: speakerCharacter.id,
			text: entry.text,
			position: { x: 420 + (index % 2) * 44, y: 80 + index * 136 },
			timestamp
		};

		importedMessages.push(message);
		indexToMessageId.set(index, id);
		if (entry.externalId) {
			rawIdToMessageId.set(entry.externalId, id);
		}
	}

	const importedConnections: Connection[] = [];
	for (const message of importedMessages) {
		const character = importedCharacters.find((item) => item.id === message.characterId);
		if (!character) continue;
		importedConnections.push({
			id: `conn-import-assign-${message.id}-${character.id}`,
			from: message.id,
			to: character.id,
			type: 'assignment',
			color: character.roleColor
		});
	}

	for (let i = 1; i < importedMessages.length; i++) {
		const previous = importedMessages[i - 1];
		const current = importedMessages[i];
		importedConnections.push({
			id: `conn-import-flow-${previous.id}-${current.id}`,
			from: previous.id,
			to: current.id,
			type: 'flow',
			color: flowColors[i % flowColors.length]
		});
	}

	for (const entry of normalizedEntries) {
		const sourceId = indexToMessageId.get(entry.index);
		if (!sourceId || entry.replyRef === null || entry.replyRef === undefined) continue;

		let targetId: string | undefined;
		if (typeof entry.replyRef === 'number' && Number.isFinite(entry.replyRef)) {
			const numeric = entry.replyRef;
			if (indexToMessageId.has(numeric)) {
				targetId = indexToMessageId.get(numeric);
			} else if (indexToMessageId.has(numeric - 1)) {
				targetId = indexToMessageId.get(numeric - 1);
			}
		} else if (typeof entry.replyRef === 'string') {
			const trimmed = entry.replyRef.trim();
			targetId = rawIdToMessageId.get(trimmed);
			if (!targetId && /^\d+$/.test(trimmed)) {
				const numeric = Number(trimmed);
				targetId = indexToMessageId.get(numeric) ?? indexToMessageId.get(numeric - 1);
			}
		}

		if (!targetId || targetId === sourceId) continue;

		const sourceMessage = importedMessages.find((message) => message.id === sourceId);
		const targetMessage = importedMessages.find((message) => message.id === targetId);
		if (!sourceMessage || !targetMessage) continue;
		sourceMessage.replyTo = targetId;
		importedConnections.push({
			id: `conn-import-reply-${sourceMessage.id}-${targetMessage.id}`,
			from: sourceMessage.id,
			to: targetMessage.id,
			type: 'reply',
			color: '#94a3b8'
		});
	}

	const arrangedImportedGraph = buildAutoLayout(
		importedCharacters,
		importedMessages,
		importedConnections
	);
	const normalizedConnections = normalizeConnections(
		importedConnections,
		arrangedImportedGraph.characters,
		arrangedImportedGraph.messages
	);

	characters.set(arrangedImportedGraph.characters);
	messages.set(arrangedImportedGraph.messages);
	connections.set(normalizedConnections);
	nodeConnectionModes.set({});
	selectedElement.set(arrangedImportedGraph.messages[0]?.id ?? null);
	previewState.set('preview');
	propagateSpeakerAssignments();

	return {
		characters: arrangedImportedGraph.characters.length,
		messages: arrangedImportedGraph.messages.length,
		connections: normalizedConnections.length
	};
}

export function importProjectData(payload: unknown) {
	const record = asRecord(payload);
	if (!record) {
		throw new Error('Invalid project JSON.');
	}

	const projectCharacters = Array.isArray(record.characters)
		? record.characters.filter((item): item is Character => asRecord(item) !== null).map((item) => item as Character)
		: [];
	const projectMessages = Array.isArray(record.messages)
		? record.messages.filter((item): item is Message => asRecord(item) !== null).map((item) => item as Message)
		: [];
	const projectConnections = Array.isArray(record.connections)
		? record.connections
				.filter((item): item is Connection => asRecord(item) !== null)
				.map((item) => item as Connection)
		: [];

	if (projectCharacters.length === 0 && projectMessages.length === 0) {
		throw new Error('Project JSON must include at least one character or message.');
	}

	const arrangedProjectGraph = buildAutoLayout(
		projectCharacters,
		projectMessages,
		projectConnections
	);
	const normalizedConnections = normalizeConnections(
		projectConnections,
		arrangedProjectGraph.characters,
		arrangedProjectGraph.messages
	);

	characters.set(arrangedProjectGraph.characters);
	messages.set(arrangedProjectGraph.messages);
	connections.set(normalizedConnections);
	nodeConnectionModes.set({});
	selectedElement.set(null);
	previewState.set('preview');
	propagateSpeakerAssignments();

	const projectCustomizeSettings = asRecord(record.customizeSettings);
	if (projectCustomizeSettings) {
		customizeSettings.update((settings) => ({
			...settings,
			...(projectCustomizeSettings as Partial<CustomizationSettings>),
			resolution: 'vertical-1080x1920'
		}));
	}

	return {
		characters: projectCharacters.length,
		messages: projectMessages.length,
		connections: normalizedConnections.length
	};
}

export function deleteElement(id: string, type: 'character' | 'message') {
	if (type === 'character') {
		deleteCharacter(id);
	} else {
		deleteMessage(id);
	}
}

// Template and customization actions
export function handleGenerateVideo() {
	isGenerating.set(true);
	previewState.set('loading');

	setTimeout(() => {
		previewState.set('video');
		isGenerating.set(false);
	}, 3000);
}

export function handleTemplateSelect(template: any) {
	if (template.appTheme) {
		customizeSettings.update((s) => ({
			...s,
			backgroundColor: template.appTheme.backgroundColor || s.backgroundColor,
			primaryColor: template.appTheme.primaryColor || s.primaryColor,
			textColor: template.appTheme.textColor || s.textColor
		}));
	}

	// Clear and load template data
	characters.set([]);
	messages.set([]);
	connections.set([]);

	setTimeout(() => {
		characters.set(template.characters || []);
		messages.set(template.messages || []);
		connections.set(template.connections || []);
	}, 100);
}

export function handleApplyCustomization(settings: Partial<CustomizationSettings>) {
	customizeSettings.update((s) => ({ ...s, ...settings, resolution: 'vertical-1080x1920' }));
}

export function setConnectionMode(mode: 'flow' | 'reply') {
	connectionMode.set(mode);
}

export function setNodeConnectionMode(nodeId: string, mode: 'flow' | 'reply') {
	nodeConnectionModes.update(modes => ({
		...modes,
		[nodeId]: mode
	}));
}
