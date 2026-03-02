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

export type FontWeightSetting = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
export type BackgroundThemeSetting =
	| 'none'
	| 'gradient1'
	| 'gradient2'
	| 'gradient3'
	| 'pattern1'
	| 'pattern2'
	| 'custom';
export type ResolutionSetting = 'vertical-1080x1920';
export type QualitySetting = 'low' | 'medium' | 'high' | 'ultra';
export type ExportFormatSetting = 'mp4' | 'webm';
export type CodecSetting = 'h264' | 'h265' | 'vp9';
export type ChatPlatformSetting = 'discord' | 'whatsapp' | 'messenger' | 'telegram';

export interface CustomizationSettings {
	channelName: string;
	chatPlatform: ChatPlatformSetting;
	backgroundColor: string;
	backgroundImage: string;
	backgroundTheme: BackgroundThemeSetting;
	primaryColor: string;
	textColor: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: FontWeightSetting;
	messageSpacing: number;
	messagePadding: number;
	showAvatars: boolean;
	showTimestamps: boolean;
	resolution: ResolutionSetting;
	fps: number;
	quality: QualitySetting;
	messageDuration: number;
	transitionDuration: number;
	animationSpeed: number;
	enableTransitions: boolean;
	musicEnabled: boolean;
	musicVolume: number;
	notificationSoundEnabled: boolean;
	exportFormat: ExportFormatSetting;
	codec: CodecSetting;
	enableCompression: boolean;
}

export const defaultCustomizationSettings: CustomizationSettings = {
	channelName: 'announcements',
	chatPlatform: 'discord',
	backgroundColor: '#313338',
	backgroundImage: '',
	backgroundTheme: 'none',
	primaryColor: '#5865f2',
	textColor: '#dbdee1',
	fontFamily: 'Instrument Sans',
	fontSize: 16,
	fontWeight: 'normal',
	messageSpacing: 12,
	messagePadding: 16,
	showAvatars: true,
	showTimestamps: true,
	resolution: 'vertical-1080x1920',
	fps: 30,
	quality: 'high',
	messageDuration: 2.5,
	transitionDuration: 0.3,
	animationSpeed: 1,
	enableTransitions: true,
	musicEnabled: true,
	musicVolume: 0.3,
	notificationSoundEnabled: true,
	exportFormat: 'mp4',
	codec: 'h264',
	enableCompression: true
};

export type PreviewState = 'preview' | 'loading' | 'video';
