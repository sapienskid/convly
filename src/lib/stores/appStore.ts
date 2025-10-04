import { writable, derived, get } from 'svelte/store';
import type { Character, Message, Connection, Tool, PreviewState } from '$lib/types';

// Core entity stores
export const characters = writable<Character[]>([
	{
		id: 'char-demo-1',
		username: 'Alex Chen',
		avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
		roleColor: '#3b82f6',
		position: { x: 100, y: 100 }
	},
	{
		id: 'char-demo-2',
		username: 'Sarah Wilson',
		avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c9ce?w=150&h=150&fit=crop&crop=face',
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
		from: 'msg-demo-2',
		to: 'msg-demo-1',
		type: 'flow',
		color: '#10b981'
	}
]);

// UI state stores
export const selectedTool = writable<Tool>('select');
export const selectedElement = writable<string | null>(null);
export const editingCharacter = writable<string | null>(null);

// Preview state stores
export const previewState = writable<PreviewState>('preview');
export const isGenerating = writable<boolean>(false);

// Customization settings store
export const customizeSettings = writable({
	backgroundColor: 'hsl(var(--muted))',
	primaryColor: 'hsl(var(--primary))',
	secondaryColor: 'hsl(var(--secondary))',
	textColor: 'hsl(var(--foreground))',
	channelName: 'general'
});

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
}

export function updateCharacterRotation(id: string, rotation: number) {
	characters.update((chars) =>
		chars.map((char) => (char.id === id ? { ...char, rotation } : char))
	);
}

export function deleteCharacter(id: string) {
	characters.update((chars) => chars.filter((char) => char.id !== id));
	messages.update((msgs) => msgs.filter((msg) => msg.characterId !== id));
	connections.update((conns) => conns.filter((conn) => conn.from !== id && conn.to !== id));
}

// Message actions
export function addMessage(message: Omit<Message, 'id'>): string {
	const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const newMessage = { ...message, id };
	messages.update((msgs) => [...msgs, newMessage]);
	return id;
}

export function updateMessage(id: string, updates: Partial<Message>) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
}

export function updateMessagePosition(id: string, position: { x: number; y: number }) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, position } : msg)));
}

export function updateMessageRotation(id: string, rotation: number) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, rotation } : msg)));
}

export function updateMessageText(id: string, text: string) {
	messages.update((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
}

export function deleteMessage(id: string) {
	messages.update((msgs) => msgs.filter((msg) => msg.id !== id));
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

	connections.update((conns) => conns.filter((conn) => conn.id !== id));
}

// Utility actions
export function addCharacterAtPosition(position: { x: number; y: number }): string {
	const chars = get(characters);
	const adjustedPosition = {
		x: Math.max(50, position.x + (Math.random() - 0.5) * 40),
		y: Math.max(50, position.y + (Math.random() - 0.5) * 40)
	};

	const colors = ['hsl(var(--primary))', '#5865f2', '#57f287', '#fee75c', '#f23c50', '#eb459e', '#00d9ff'];
	const newCharacter = {
		username: `User ${chars.length + 1}`,
		avatar: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 6)}.png`,
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

	// Prevent duplicate connections
	const exists = conns.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from));
	if (exists || from === to) return;

	const fromElement = chars.find((c) => c.id === from) || msgs.find((m) => m.id === from);
	const toElement = chars.find((c) => c.id === to) || msgs.find((m) => m.id === to);

	if (!fromElement || !toElement) return;

	let type: 'flow' | 'assignment' = 'flow';
	let color = 'hsl(var(--muted-foreground))';
	let finalFrom = from;
	let finalTo = to;

	// Character to Message = Assignment connection
	if ('username' in fromElement && 'text' in toElement) {
		type = 'assignment';
		color = fromElement.roleColor;
		updateMessage(to, { characterId: from });
	}
	// Message to Character = Assignment connection (reverse direction)
	else if ('text' in fromElement && 'username' in toElement) {
		type = 'assignment';
		color = toElement.roleColor;
		updateMessage(from, { characterId: to });
		finalFrom = to;
		finalTo = from;
	}
	// Message to Message = Flow connection (reverse direction)
	else if ('text' in fromElement && 'text' in toElement) {
		type = 'flow';
		const flowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
		color = flowColors[Math.floor(Math.random() * flowColors.length)];
		finalFrom = to;
		finalTo = from;
	}
	// Character to Character = Flow connection (reverse direction)
	else if ('username' in fromElement && 'username' in toElement) {
		type = 'flow';
		color = '#10b981';
		finalFrom = to;
		finalTo = from;
	}

	addConnection({
		from: finalFrom,
		to: finalTo,
		type,
		color,
		sourceHandle,
		targetHandle
	});
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
