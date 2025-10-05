// TypeScript interfaces matching React implementation
export interface Character {
	id: string;
	username: string;
	avatar: string;
	roleColor: string;
	position: { x: number; y: number };
	rotation?: number;
}

export interface Message {
	id: string;
	characterId?: string;
	text: string;
	position: { x: number; y: number };
	timestamp: string;
	rotation?: number;
	replyTo?: string | null;
}

export interface Connection {
	id: string;
	from: string;
	to: string;
	type: 'assignment' | 'flow' | 'reply';
	color: string;
	sourceHandle?: string;
	targetHandle?: string;
}

export type Tool = 'select' | 'character' | 'message' | 'pan';
export type PreviewState = 'preview' | 'loading' | 'video';
