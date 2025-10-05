import { writable, derived, get } from 'svelte/store';
import type { Character, Message, Connection, Tool, PreviewState } from '$lib/types';

// Core entity stores
export const characters = writable<Character[]>([
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
	}
]);

export const messages = writable<Message[]>([
	{
		id: 'msg-demo-1',
		characterId: 'char-demo-1',
		text: 'Hey everyone! Welcome to our Discord chat animation builder 🎉',
		position: { x: 400, y: 80 },
		timestamp: new Date().toISOString()
	},
	{
		id: 'msg-demo-2',
		characterId: 'char-demo-2',
		text: "This looks amazing! Can't wait to create some cool animations 🚀",
		position: { x: 400, y: 280 },
		timestamp: new Date().toISOString()
	},
	{
		id: 'msg-demo-3',
		characterId: 'char-demo-1',
		text: 'Thanks! Try using the Reply mode to link messages as replies when you connect them 💬',
		position: { x: 400, y: 480 },
		timestamp: new Date().toISOString()
	}
]);

export const connections = writable<Connection[]>([
	{
		id: 'conn-demo-1',
		from: 'char-demo-1',
		to: 'msg-demo-1',
		type: 'assignment',
		color: '#3b82f6'
	},
	{
		id: 'conn-demo-2',
		from: 'char-demo-2',
		to: 'msg-demo-2',
		type: 'assignment',
		color: '#8b5cf6'
	},
	{
		id: 'conn-demo-3',
		from: 'char-demo-1',
		to: 'msg-demo-3',
		type: 'assignment',
		color: '#3b82f6'
	},
	{
		id: 'conn-demo-4',
		from: 'msg-demo-1',
		to: 'msg-demo-2',
		type: 'flow',
		color: '#10b981'
	},
	{
		id: 'conn-demo-5',
		from: 'msg-demo-2',
		to: 'msg-demo-3',
		type: 'flow',
		color: '#f59e0b'
	}
]);

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

// Load settings from localStorage if available
const loadSettings = () => {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('convly_customizeSettings');
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch (e) {
				console.error('Failed to load settings:', e);
			}
		}
	}
	return null;
};

const defaultSettings = {
	// Discord/Chat Room Settings
	channelName: 'general',
	// Color Settings
	backgroundColor: '#313338',
	backgroundImage: '',
	backgroundTheme: 'none',
	primaryColor: '#5865f2',
	secondaryColor: '#3ba55d',
	textColor: '#dcddde',
	// Typography Settings
	fontFamily: 'Inter',
	fontSize: 16,
	fontWeight: 'normal',
	// Layout Settings
	messageSpacing: 12,
	messagePadding: 16,
	messageAlignment: 'left',
	showAvatars: true,
	showTimestamps: true,
	// Video Quality Settings
	resolution: '1080p',
	fps: 30,
	quality: 'high',
	// Timing Settings
	messageDuration: 2.5,
	transitionDuration: 0.3,
	// Animation Settings
	animationSpeed: 1,
	enableTransitions: true,
	animationStyle: 'smooth',
	// Audio Settings
	enableAudio: false,
	backgroundMusicVolume: 70,
	soundEffectsVolume: 50,
	// Export Settings
	exportFormat: 'mp4',
	codec: 'h264',
	enableCompression: true
};

// Customization settings store with persistence
export const customizeSettings = writable(loadSettings() || defaultSettings);

// Save to localStorage whenever settings change
if (typeof window !== 'undefined') {
	customizeSettings.subscribe((settings) => {
		localStorage.setItem('convly_customizeSettings', JSON.stringify(settings));
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
			let changed = false;
			// Only adjust flow edges or assignment edges where dynamic positioning matters
			if (conn.type === 'flow' && (conn.from === nodeId || conn.to === nodeId)) {
				const fromMsg = msgs.find((m) => m.id === conn.from);
				const toMsg = msgs.find((m) => m.id === conn.to);
				if (fromMsg && toMsg) {
					const dx = toMsg.position.x - fromMsg.position.x;
					const dy = toMsg.position.y - fromMsg.position.y;
					const absDx = Math.abs(dx);
					const absDy = Math.abs(dy);
					let newSourceHandle = conn.sourceHandle;
					let newTargetHandle = conn.targetHandle;
					if (absDx >= absDy) {
						newSourceHandle = 'source-' + (dx >= 0 ? 'right' : 'left');
						newTargetHandle = 'target-' + (dx >= 0 ? 'left' : 'right');
					} else {
						newSourceHandle = 'source-' + (dy >= 0 ? 'bottom' : 'top');
						newTargetHandle = 'target-' + (dy >= 0 ? 'top' : 'bottom');
					}
					if (newSourceHandle !== conn.sourceHandle || newTargetHandle !== conn.targetHandle) {
						changed = true;
						return { ...conn, sourceHandle: newSourceHandle, targetHandle: newTargetHandle };
					}
				}
			} else if (conn.type === 'assignment' && (conn.from === nodeId || conn.to === nodeId)) {
				// Assignment: character -> message only stored as from=character to=message
				const char = chars.find((c) => c.id === conn.from);
				const msg = msgs.find((m) => m.id === conn.to);
				if (char && msg) {
					// Pick nearest side of message to character while keeping character handle constant
					const dx = msg.position.x - char.position.x;
					const dy = msg.position.y - char.position.y;
					const absDx = Math.abs(dx);
					const absDy = Math.abs(dy);
					let newTargetHandle = conn.targetHandle;
					if (absDx >= absDy) {
						newTargetHandle = 'target-' + (dx >= 0 ? 'left' : 'right');
					} else {
						newTargetHandle = 'target-' + (dy >= 0 ? 'top' : 'bottom');
					}
					if (newTargetHandle !== conn.targetHandle) {
						changed = true;
						return { ...conn, targetHandle: newTargetHandle, sourceHandle: 'source' };
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

	// First, identify messages with DIRECT character assignments (via assignment connections)
	const directAssignments = new Set<string>();
	for (const conn of allConnections) {
		if (conn.type === 'assignment') {
			directAssignments.add(conn.to); // 'to' is the message ID
		}
	}

	// Build a bidirectional adjacency list for flow connections so we can traverse upstream/downstream paths
	const adjacency = new Map<string, string[]>();
	for (const conn of allConnections) {
		if (conn.type !== 'flow') continue;
		if (!adjacency.has(conn.from)) adjacency.set(conn.from, []);
		if (!adjacency.has(conn.to)) adjacency.set(conn.to, []);
		adjacency.get(conn.from)!.push(conn.to);
		adjacency.get(conn.to)!.push(conn.from);
	}

	const messageMap = new Map(allMessages.map((msg) => [msg.id, msg]));
	const finalAssignments = new Map<string, string>(); // messageId -> characterId

	// Track all messages that are in the flow network
	const messagesInFlowNetwork = new Set<string>(adjacency.keys());

	const topmostCharacter = allCharacters.reduce<Character | null>(
		(topmost, current) =>
			!topmost || current.position.y < topmost.position.y ? current : topmost,
		null
	);
	const topmostCharacterId = topmostCharacter?.id;

	const visited = new Set<string>();

	// Process each connected component in the flow network
	for (const startId of adjacency.keys()) {
		if (visited.has(startId)) {
			continue;
		}

		// Collect the connected component
		const component: string[] = [];
		const stack = [startId];
		while (stack.length > 0) {
			const currentId = stack.pop()!;
			if (visited.has(currentId)) continue;
			visited.add(currentId);
			component.push(currentId);
			for (const neighbor of adjacency.get(currentId) ?? []) {
				if (!visited.has(neighbor)) {
					stack.push(neighbor);
				}
			}
		}

		if (component.length === 0) {
			continue;
		}

		// Find seed messages with direct character assignments in this component
		const seeds: Array<{ id: string; charId: string }> = [];
		for (const nodeId of component) {
			const msg = messageMap.get(nodeId);
			if (msg?.characterId && directAssignments.has(nodeId)) {
				seeds.push({ id: nodeId, charId: msg.characterId });
				finalAssignments.set(nodeId, msg.characterId);
			}
		}

		// If no seeds in this component, use topmost character as fallback
		if (seeds.length === 0) {
			if (!topmostCharacterId) {
				continue;
			}
			const fallbackId = component[0];
			seeds.push({ id: fallbackId, charId: topmostCharacterId });
			finalAssignments.set(fallbackId, topmostCharacterId);
		}

		// Propagate from seeds to all connected messages
		const propagationQueue: Array<{ id: string; charId: string }> = [...seeds];
		const seen = new Set<string>(seeds.map(s => s.id));

		while (propagationQueue.length > 0) {
			const { id, charId } = propagationQueue.shift()!;
			for (const neighbor of adjacency.get(id) ?? []) {
				if (seen.has(neighbor)) {
					continue;
				}
				const neighborMsg = messageMap.get(neighbor);
				if (!neighborMsg) {
					continue;
				}
				seen.add(neighbor);
				
				// If neighbor has direct assignment, use that and propagate it
				if (directAssignments.has(neighbor) && neighborMsg.characterId) {
					finalAssignments.set(neighbor, neighborMsg.characterId);
					propagationQueue.push({ id: neighbor, charId: neighborMsg.characterId });
				} else {
					// Otherwise inherit from parent
					finalAssignments.set(neighbor, charId);
					propagationQueue.push({ id: neighbor, charId });
				}
			}
		}
	}

	// Update all messages: set assignments for those in network, clear for those not
	messages.update((existing) =>
		existing.map((msg) => {
			if (directAssignments.has(msg.id)) {
				// Keep direct assignments unchanged
				return msg;
			} else if (finalAssignments.has(msg.id)) {
				// Set propagated assignment
				return { ...msg, characterId: finalAssignments.get(msg.id) };
			} else if (msg.characterId && !directAssignments.has(msg.id)) {
				// Clear speaker if message is not directly assigned and not in propagated network
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
	const id = `conn-${Date.now()}`;
	const newConnection = { ...connection, id };
	connections.update((conns) => [...conns, newConnection]);
	return id;
}

export function deleteConnection(id: string) {
	const conns = get(connections);
	const connection = conns.find((c) => c.id === id);

	if (connection && connection.type === 'assignment') {
		const msgs = get(messages);
		const message = msgs.find((m) => m.id === connection.to);
		if (message) {
			updateMessage(message.id, { characterId: undefined });
		}
	}

	if (connection && connection.type === 'reply') {
		const msgs = get(messages);
		const message = msgs.find((m) => m.id === connection.to);
		if (message?.replyTo === connection.from) {
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
	selectedElement.set(id);
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
	// Get the connection mode for the source node
	const nodeModes = get(nodeConnectionModes);
	const mode = nodeModes[from] || 'flow';

	if (from === to) return;

	const fromElement = chars.find((c) => c.id === from) || msgs.find((m) => m.id === from);
	const toElement = chars.find((c) => c.id === to) || msgs.find((m) => m.id === to);

	if (!fromElement || !toElement) return;

	let type: 'flow' | 'assignment' | 'reply' = 'flow';
	let color = 'hsl(var(--muted-foreground))';
	let finalFrom = from;
	let finalTo = to;
	let finalSourceHandle = sourceHandle;
	let finalTargetHandle = targetHandle;

	const getDefaultMessageTargetHandle = (sourceNode: Character | Message, targetMessage: Message) => {
		const verticalThreshold = 40;
		const horizontalDiff = sourceNode.position.x - targetMessage.position.x;
		const verticalDiff = sourceNode.position.y - targetMessage.position.y;

		if (verticalDiff < -verticalThreshold) return 'target-top';
		if (verticalDiff > verticalThreshold) return 'target-bottom';
		return horizontalDiff <= 0 ? 'target-left' : 'target-right';
	};

	// Character to Message = Assignment connection (allowed)
		if ('username' in fromElement && 'text' in toElement) {
			type = 'assignment';
			color = fromElement.roleColor;

			// Check if message already has a speaker assignment - prevent multiple speakers
			const message = msgs.find((m) => m.id === finalTo);
			if (message && message.characterId && message.characterId !== fromElement.id) {
				return;
			}

			// Check existing assignment edges to ensure uniqueness
			const existingAssignment = conns.find(
				(connection) => connection.type === 'assignment' && connection.to === finalTo
			);
			if (existingAssignment && existingAssignment.from !== finalFrom) {
				return;
			}

			updateMessage(to, { characterId: from });
			if (!finalSourceHandle) {
				finalSourceHandle = 'source';
			}
			if (!finalTargetHandle) {
				finalTargetHandle = getDefaultMessageTargetHandle(fromElement, toElement);
			}
		}
	// Message to Character = NOT ALLOWED now per new rules
	else if ('text' in fromElement && 'username' in toElement) {
		console.log('Message to character connections are not allowed');
		return;
	}
	// Message to Message connections
	else if ('text' in fromElement && 'text' in toElement) {
		const chooseHandles = () => {
			const dx = toElement.position.x - fromElement.position.x;
			const dy = toElement.position.y - fromElement.position.y;
			const absDx = Math.abs(dx);
			const absDy = Math.abs(dy);

			if (absDx >= absDy) {
				finalSourceHandle = 'source-' + (dx >= 0 ? 'right' : 'left');
				finalTargetHandle = 'target-' + (dx >= 0 ? 'left' : 'right');
			} else {
				finalSourceHandle = 'source-' + (dy >= 0 ? 'bottom' : 'top');
				finalTargetHandle = 'target-' + (dy >= 0 ? 'top' : 'bottom');
			}
		};

		if (mode === 'reply') {
			type = 'reply';
			color = '#94a3b8';

			const targetMessage = msgs.find((m) => m.id === finalTo);
			if (!targetMessage) {
				return;
			}

			if (targetMessage.replyTo && targetMessage.replyTo !== finalFrom) {
				return;
			}

			const existingReplyEdge = conns.find(
				(connection) => connection.type === 'reply' && connection.to === finalTo
			);
			if (existingReplyEdge && existingReplyEdge.from !== finalFrom) {
				return;
			}

			updateMessage(finalTo, { replyTo: finalFrom }, true);

			if (!finalSourceHandle || !finalTargetHandle) {
				chooseHandles();
			} else {
				const sameAxis = (
					(finalSourceHandle.endsWith('left') && finalTargetHandle.endsWith('left')) ||
					(finalSourceHandle.endsWith('right') && finalTargetHandle.endsWith('right')) ||
					(finalSourceHandle.endsWith('top') && finalTargetHandle.endsWith('top')) ||
					(finalSourceHandle.endsWith('bottom') && finalTargetHandle.endsWith('bottom'))
				);
				if (sameAxis) {
					chooseHandles();
				}
			}
		} else {
			type = 'flow';
			const flowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
			color = flowColors[Math.floor(Math.random() * flowColors.length)];

			if (!finalSourceHandle || !finalTargetHandle) {
				chooseHandles();
			} else {
				const sameAxis = (
					(finalSourceHandle.endsWith('left') && finalTargetHandle.endsWith('left')) ||
					(finalSourceHandle.endsWith('right') && finalTargetHandle.endsWith('right')) ||
					(finalSourceHandle.endsWith('top') && finalTargetHandle.endsWith('top')) ||
					(finalSourceHandle.endsWith('bottom') && finalTargetHandle.endsWith('bottom'))
				);
				if (sameAxis) {
					chooseHandles();
				}
			}
		}
	}
	// Character to Character = NOT ALLOWED (return early)
	else if ('username' in fromElement && 'username' in toElement) {
		console.log('Character to character connections are not allowed');
		return;
	}

	const exists = conns.some(
		(c) =>
			c.type === type &&
			((c.from === finalFrom && c.to === finalTo) ||
				(c.from === finalTo && c.to === finalFrom))
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
	const settings = get(customizeSettings);

	if (template.appTheme) {
		customizeSettings.update((s) => ({
			...s,
			backgroundColor: template.appTheme.backgroundColor || s.backgroundColor,
			primaryColor: template.appTheme.primaryColor || s.primaryColor,
			secondaryColor: template.appTheme.secondaryColor || s.secondaryColor,
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

export function handleApplyCustomization(settings: any) {
	customizeSettings.update((s) => ({ ...s, ...settings }));
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
