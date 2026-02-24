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

const demoCharacters: Character[] = [
	{
		id: 'char-demo-1',
		username: 'Alex Chen',
		avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlexChen&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=90',
		roleColor: '#3b82f6',
		position: { x: 100, y: 100 }
	},
	{
		id: 'char-demo-2',
		username: 'Sarah Wilson',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahWilson&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=90',
		roleColor: '#8b5cf6',
		position: { x: 100, y: 300 }
	},
	{
		id: 'char-demo-3',
		username: 'Priya Nair',
		avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=PriyaNair&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=90',
		roleColor: '#14b8a6',
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

const demoFlowColors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];
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

const flowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

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
		const normalizedConnections = normalizeConnections(
			loadedConnections,
			loadedCharacters,
			loadedMessages
		);

		characters.set(loadedCharacters);
		messages.set(loadedMessages);
		connections.set(normalizedConnections);
		
		customizeSettings.set(mergeCustomizationSettings(data.customizeSettings));
	} catch (error) {
		console.error('Failed to load from IndexedDB, using demo data:', error);
		characters.set(demoCharacters);
		messages.set(demoMessages);
		connections.set(normalizeConnections(demoConnections, demoCharacters, demoMessages));
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
	const normalizedConnections = normalizeConnections(
		demoConnections,
		clonedCharacters,
		clonedMessages
	);

	characters.set(clonedCharacters);
	messages.set(clonedMessages);
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
	characters.update((chars) =>
		chars.map((char) => (char.id === id ? { ...char, position } : char))
	);
	// Recalculate connection handles for edges involving this character
	recalculateHandlesForNode(id);
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
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, position } : msg)));
	recalculateHandlesForNode(id);
}

export function updateMessageRotation(id: string, rotation: number) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, rotation } : msg)));
}

// Helper to recompute optimal handles for existing connections when nodes move
function recalculateHandlesForNode(nodeId: string) {
	const chars = get(characters);
	const msgs = get(messages);
	connections.update((conns) => {
		return conns.map((conn) => {
			// Only adjust flow edges or assignment edges where dynamic positioning matters
			if (conn.type === 'flow' && (conn.from === nodeId || conn.to === nodeId)) {
				const fromMsg = msgs.find((m) => m.id === conn.from);
				const toMsg = msgs.find((m) => m.id === conn.to);
				if (fromMsg && toMsg) {
					const { sourceHandle: newSourceHandle, targetHandle: newTargetHandle } =
						getMessageToMessageHandles(fromMsg, toMsg);
					if (newSourceHandle !== conn.sourceHandle || newTargetHandle !== conn.targetHandle) {
						return { ...conn, sourceHandle: newSourceHandle, targetHandle: newTargetHandle };
					}
				}
			} else if (conn.type === 'assignment' && (conn.from === nodeId || conn.to === nodeId)) {
				// Assignment is normalized as message -> character.
				const msg = msgs.find((m) => m.id === conn.from);
				const char = chars.find((c) => c.id === conn.to);
				if (msg && char) {
					const { sourceHandle, targetHandle } = getMessageToCharacterHandles(msg, char);
					if (sourceHandle !== conn.sourceHandle || targetHandle !== conn.targetHandle) {
						return { ...conn, sourceHandle, targetHandle };
					}
				}
			}
			return conn;
		});
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

	const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ec4899'];
	const avatarStyles = ['bottts', 'avataaars', 'pixel-art', 'lorelei', 'notionists'];
	const username = `User ${chars.length + 1}`;
	const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
	const randomSeed = Math.random().toString(36).substring(7);
	
	const newCharacter = {
		username,
		avatar: `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=90`,
		roleColor: colors[Math.floor(Math.random() * colors.length)],
		position: adjustedPosition
	};

	const id = addCharacter(newCharacter);
	selectedElement.set(id);
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
	return id;
}

export function addMessageForCharacter(characterId: string): string {
	const chars = get(characters);
	const msgs = get(messages);
	const character = chars.find((c) => c.id === characterId);
	if (!character) return '';

	const characterMessages = msgs.filter((m) => m.characterId === characterId);
	const baseX = character.position.x + 300;
	const baseY = character.position.y + characterMessages.length * 140;

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

	const colorPalette = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ec4899'];
	const speakerMap = new Map<string, Character>();
	const importedCharacters: Character[] = uniqueSpeakers.map((speaker, index) => {
		const id = `char-import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
		const character: Character = {
			id,
			username: speaker,
			avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
				speaker
			)}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=90`,
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
		const handles = getMessageToCharacterHandles(message, character);
		importedConnections.push({
			id: `conn-import-assign-${message.id}-${character.id}`,
			from: message.id,
			to: character.id,
			type: 'assignment',
			color: character.roleColor,
			sourceHandle: handles.sourceHandle,
			targetHandle: handles.targetHandle
		});
	}

	for (let i = 1; i < importedMessages.length; i++) {
		const previous = importedMessages[i - 1];
		const current = importedMessages[i];
		const handles = getMessageToMessageHandles(previous, current);
		importedConnections.push({
			id: `conn-import-flow-${previous.id}-${current.id}`,
			from: previous.id,
			to: current.id,
			type: 'flow',
			color: flowColors[i % flowColors.length],
			sourceHandle: handles.sourceHandle,
			targetHandle: handles.targetHandle
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
		const handles = getMessageToMessageHandles(sourceMessage, targetMessage);
		importedConnections.push({
			id: `conn-import-reply-${sourceMessage.id}-${targetMessage.id}`,
			from: sourceMessage.id,
			to: targetMessage.id,
			type: 'reply',
			color: '#94a3b8',
			sourceHandle: handles.sourceHandle,
			targetHandle: handles.targetHandle
		});
	}

	const normalizedConnections = normalizeConnections(
		importedConnections,
		importedCharacters,
		importedMessages
	);

	characters.set(importedCharacters);
	messages.set(importedMessages);
	connections.set(normalizedConnections);
	nodeConnectionModes.set({});
	selectedElement.set(importedMessages[0]?.id ?? null);
	previewState.set('preview');
	propagateSpeakerAssignments();

	return {
		characters: importedCharacters.length,
		messages: importedMessages.length,
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

	const normalizedConnections = normalizeConnections(
		projectConnections,
		projectCharacters,
		projectMessages
	);

	characters.set(projectCharacters);
	messages.set(projectMessages);
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
