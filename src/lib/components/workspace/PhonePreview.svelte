<script lang="ts">
	import type {
		Character,
		Message,
		Connection,
		CustomizationSettings,
		ChatPlatformSetting
	} from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Progress } from '$lib/components/ui/progress';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { analyzeMessageFlow } from '$lib/utils/messageFlow';
	import {
		buildMessageAnimationTimeline,
		resolvePlaybackState,
		type PlaybackMessageState
	} from '$lib/utils/animationTimeline';

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		previewState: 'preview' | 'loading' | 'video';
		isGenerating?: boolean;
		isExporting?: boolean;
		customizeSettings?: Partial<CustomizationSettings>;
		currentTime?: number;
		interactive?: boolean;
		onSendMessage?: (payload: {
			text: string;
			characterId?: string | null;
			replyTo?: string | null;
		}) => void;
	}

	let {
		characters,
		messages,
		connections,
		previewState,
		isExporting = false,
		customizeSettings = {},
		currentTime = 0,
		interactive = false,
		onSendMessage
	}: Props = $props();

	let messagesViewport = $state<HTMLDivElement | null>(null);
	let composerText = $state('');
	let selectedSpeakerId = $state('');
	let replyTargetId = $state<string | null>(null);
	let messageContextMenu = $state<{
		messageId: string;
		x: number;
		y: number;
	} | null>(null);

	const messageFlowInfo = $derived(analyzeMessageFlow(messages, connections));
	const orderedPreviewMessages = $derived(messageFlowInfo.map((info) => info.message));
	const messageMap = $derived(new Map(messages.map((message) => [message.id, message])));
	const characterMap = $derived(new Map(characters.map((character) => [character.id, character])));

	const timeline = $derived.by(() =>
		buildMessageAnimationTimeline(messages, connections, {
			messageDuration: customizeSettings.messageDuration,
			transitionDuration: customizeSettings.transitionDuration,
			enableTransitions: customizeSettings.enableTransitions
		})
	);

	const playbackState = $derived.by(() =>
		previewState === 'video' ? resolvePlaybackState(timeline, currentTime) : null
	);

	const renderedMessages = $derived.by(() => {
		if (previewState === 'video') {
			return playbackState?.visibleMessages ?? [];
		}

		return orderedPreviewMessages.map((message) => ({
			message,
			text: message.text,
			isTyping: false,
			isComplete: true
		}) satisfies PlaybackMessageState);
	});

	const visibleMessageTextById = $derived(
		new Map(renderedMessages.map((rendered) => [rendered.message.id, rendered.text]))
	);

	const typingIndicatorCharacterId = $derived(
		previewState === 'video' ? playbackState?.typingIndicatorCharacterId ?? null : null
	);
	const typingIndicatorCharacter = $derived(
		typingIndicatorCharacterId
			? (characterMap.get(typingIndicatorCharacterId) ?? null)
			: null
	);
	const canCompose = $derived(interactive && previewState === 'preview');
	const replyTargetMessage = $derived(
		replyTargetId ? messageMap.get(replyTargetId) ?? null : null
	);
	const speakerOptions = $derived(
		characters.map((character) => ({
			value: character.id,
			label: character.username
		}))
	);
	const contextMenuMessage = $derived(
		messageContextMenu ? messageMap.get(messageContextMenu.messageId) ?? null : null
	);

	const platformDefaults: Record<
		ChatPlatformSetting,
		{ backgroundColor: string; primaryColor: string; textColor: string; fontFamily: string }
	> = {
		discord: {
			backgroundColor: '#313338',
			primaryColor: '#5865f2',
			textColor: '#dbdee1',
			fontFamily: 'Instrument Sans'
		},
		whatsapp: {
			backgroundColor: '#efeae2',
			primaryColor: '#00a884',
			textColor: '#111b21',
			fontFamily: 'Manrope'
		},
		messenger: {
			backgroundColor: '#ffffff',
			primaryColor: '#0084ff',
			textColor: '#050505',
			fontFamily: 'Manrope'
		},
		telegram: {
			backgroundColor: '#e6ebee',
			primaryColor: '#0088ff',
			textColor: '#000000',
			fontFamily: 'Archivo'
		}
	};
	const chatPlatform = $derived(
		(customizeSettings.chatPlatform ?? 'discord') as ChatPlatformSetting
	);
	const platformTheme = $derived(platformDefaults[chatPlatform]);
	const backgroundColor = $derived(
		customizeSettings.backgroundColor || platformTheme.backgroundColor
	);
	const primaryColor = $derived(customizeSettings.primaryColor || platformTheme.primaryColor);
	const textColor = $derived(customizeSettings.textColor || platformTheme.textColor);
	const channelName = $derived(customizeSettings.channelName || 'announcements');
	const channelAvatar = $derived(customizeSettings.channelAvatar || '');
	const channelPrefix = $derived.by(() => {
		if (chatPlatform === 'discord') return '#';
		return '';
	});
	const headerSubtitle = $derived.by(() => {
		if (chatPlatform === 'discord') return `${characters.length} members`;
		if (chatPlatform === 'whatsapp') return `${Math.max(characters.length, 2)} participants`;
		if (chatPlatform === 'messenger') return 'Active now';
		return `${messages.length} messages`;
	});
	const composerPlaceholder = $derived.by(() => {
		if (chatPlatform === 'messenger') return 'Aa';
		if (chatPlatform === 'discord') return `Message #${channelName}`;
		return 'Message';
	});
	const isDiscord = $derived(chatPlatform === 'discord');
	const isWhatsApp = $derived(chatPlatform === 'whatsapp');
	const isMessenger = $derived(chatPlatform === 'messenger');
	const isTelegram = $derived(chatPlatform === 'telegram');

	// Adapt foreground colors based on background luminance.
	const adaptedColors = $derived.by(() => {
		const hex = backgroundColor.replace('#', '');
		const normalized = hex.length === 6 ? hex : '313338';
		const r = parseInt(normalized.slice(0, 2), 16);
		const g = parseInt(normalized.slice(2, 4), 16);
		const b = parseInt(normalized.slice(4, 6), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		const isDark = luminance < 0.5;

		return {
			header: isDark ? `${backgroundColor}dd` : '#ffffff',
			headerBorder: isDark ? '#1f2328' : '#d9dde4',
			hover: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,6,23,0.06)',
			input: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.96)',
			inputBorder: isDark ? 'rgba(255,255,255,0.16)' : '#d9dde4',
			text: isDark ? '#f4f6f8' : '#1f2937',
			textMuted: isDark ? '#a9b0bb' : '#6b7280',
			textDim: isDark ? '#8f99a8' : '#9ca3af',
			textFaint: isDark ? '#7a8392' : '#c2c8d1'
		};
	});

	const fontFamily = $derived(customizeSettings.fontFamily || platformTheme.fontFamily);
	const fontFamilyStack = $derived.by(() => {
		const emojiFallback =
			"'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'Noto Emoji', sans-serif";
		const stacks: Record<string, string> = {
			'Instrument Sans': `'Instrument Sans', ${emojiFallback}`,
			'Bricolage Grotesque': `'Bricolage Grotesque', ${emojiFallback}`,
			Manrope: `'Manrope', ${emojiFallback}`,
			Archivo: `'Archivo', ${emojiFallback}`,
			'JetBrains Mono': `'JetBrains Mono', 'Noto Color Emoji', 'Noto Emoji', monospace`
		};
		return stacks[fontFamily] ?? `'Instrument Sans', ${emojiFallback}`;
	});
	const fontSize = $derived(customizeSettings.fontSize || 16);
	const fontWeight = $derived(customizeSettings.fontWeight || 'normal');
	const messageSpacing = $derived(customizeSettings.messageSpacing || 12);
	const messagePadding = $derived(customizeSettings.messagePadding || 16);
	const showAvatars = $derived(customizeSettings.showAvatars ?? true);
	const showTimestamps = $derived(customizeSettings.showTimestamps ?? true);
	const primarySpeakerId = $derived(characters[0]?.id ?? null);

	const fontWeightValue = $derived(
		fontWeight === 'light'
			? '300'
			: fontWeight === 'normal'
				? '400'
				: fontWeight === 'medium'
					? '500'
					: fontWeight === 'semibold'
						? '600'
						: fontWeight === 'bold'
							? '700'
							: '400'
	);

	const scrollSignal = $derived.by(() => {
		const lastMessage = renderedMessages[renderedMessages.length - 1];
		return `${previewState}:${renderedMessages.length}:${lastMessage?.message.id ?? ''}:${lastMessage?.text.length ?? 0}:${typingIndicatorCharacterId ?? ''}`;
	});

	$effect(() => {
		scrollSignal;
		if (!messagesViewport) return;

		const target = Math.max(0, messagesViewport.scrollHeight - messagesViewport.clientHeight);
		if (previewState !== 'video') {
			messagesViewport.scrollTop = target;
			return;
		}

		const delta = target - messagesViewport.scrollTop;
		if (Math.abs(delta) <= 1) {
			messagesViewport.scrollTop = target;
			return;
		}

		messagesViewport.scrollTop = messagesViewport.scrollTop + delta * 0.22;
	});

	$effect(() => {
		if (!selectedSpeakerId || !characterMap.has(selectedSpeakerId)) {
			selectedSpeakerId = characters[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (replyTargetId && !messageMap.has(replyTargetId)) {
			replyTargetId = null;
		}
	});

	$effect(() => {
		if (!canCompose) {
			messageContextMenu = null;
		}
	});

	function toggleReplyTarget(messageId: string) {
		if (!canCompose) return;
		replyTargetId = replyTargetId === messageId ? null : messageId;
		messageContextMenu = null;
	}

	function handleMessageRowKeyDown(event: KeyboardEvent, messageId: string) {
		if (!canCompose) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleReplyTarget(messageId);
		}
	}

	function openMessageContextMenu(event: MouseEvent, messageId: string) {
		if (!canCompose) return;
		event.preventDefault();
		event.stopPropagation();
		const menuWidth = 188;
		const menuHeight = 124;
		const x = Math.max(
			8,
			Math.min(event.clientX + 8, window.innerWidth - menuWidth - 8)
		);
		const y = Math.max(
			8,
			Math.min(event.clientY + 8, window.innerHeight - menuHeight - 8)
		);
		messageContextMenu = { messageId, x, y };
	}

	function closeMessageContextMenu() {
		messageContextMenu = null;
	}

	function handleGlobalPointerDown(event: MouseEvent) {
		if (!messageContextMenu) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('[data-message-context-menu]')) return;
		messageContextMenu = null;
	}

	function handleGlobalKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			messageContextMenu = null;
		}
	}

	function handleContextReplyToggle() {
		if (!contextMenuMessage) return;
		toggleReplyTarget(contextMenuMessage.id);
	}

	async function handleContextCopyText() {
		if (!contextMenuMessage?.text) return;
		try {
			await navigator.clipboard.writeText(contextMenuMessage.text);
		} catch {
			// Ignore clipboard failures caused by browser permissions.
		}
		closeMessageContextMenu();
	}

	async function handleContextCopyId() {
		if (!contextMenuMessage) return;
		try {
			await navigator.clipboard.writeText(contextMenuMessage.id);
		} catch {
			// Ignore clipboard failures caused by browser permissions.
		}
		closeMessageContextMenu();
	}

	function handleComposerSend() {
		const text = composerText.trim();
		if (!text || !selectedSpeakerId || !onSendMessage) return;

		onSendMessage({
			text,
			characterId: selectedSpeakerId,
			replyTo: replyTargetId
		});
		composerText = '';
		replyTargetId = null;
		messageContextMenu = null;
	}

	function handleComposerKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleComposerSend();
		}
	}

	function formatMessageTimestamp(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function shouldShowAvatarForMessage(isPrimarySpeaker: boolean, isGrouped: boolean): boolean {
		if (!showAvatars || isGrouped) return false;
		if (chatPlatform === 'discord') return true;
		if (chatPlatform === 'whatsapp') return false;
		return !isPrimarySpeaker;
	}

	function shouldShowAuthorForMessage(isPrimarySpeaker: boolean, isGrouped: boolean): boolean {
		if (chatPlatform === 'discord') return !isGrouped;
		if (isGrouped) return false;
		return !isPrimarySpeaker;
	}

	function shouldShowHeaderTimestamp(isGrouped: boolean): boolean {
		return showTimestamps && chatPlatform === 'discord' && !isGrouped;
	}

	function shouldShowFloatingTimestamp(isGrouped: boolean): boolean {
		return showTimestamps && chatPlatform === 'discord' && isGrouped;
	}

	function shouldShowBubbleTimestamp(): boolean {
		return showTimestamps && chatPlatform !== 'discord' && chatPlatform !== 'messenger';
	}

	function getHeaderContainerStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #f0f2f5; border-bottom-color: #d9dce2;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #ffffff; border-bottom-color: #e4e6eb;';
		}
		if (chatPlatform === 'telegram') {
			return 'background-color: #517da2; border-bottom-color: #46708f;';
		}
		return 'background-color: #313338; border-bottom-color: #3f4147;';
	}

	function getHeaderTextStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'color: #111b21;';
		}
		if (chatPlatform === 'telegram') {
			return 'color: #f8fafc;';
		}
		if (chatPlatform === 'messenger') {
			return 'color: #050505;';
		}
		return 'color: #f2f3f5;';
	}

	function getHeaderSubtitleStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'color: #667781;';
		}
		if (chatPlatform === 'telegram') {
			return 'color: rgba(248, 250, 252, 0.78);';
		}
		if (chatPlatform === 'messenger') {
			return 'color: #65676b;';
		}
		return 'color: #949ba4;';
	}

	function getHeaderIconStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'color: #54656f;';
		}
		if (chatPlatform === 'telegram') {
			return 'color: #e2f2f0;';
		}
		if (chatPlatform === 'messenger') {
			return 'color: #050505;';
		}
		return 'color: #b5bac1;';
	}

	function getHeaderBadgeStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #e9edef; color: #54656f;';
		}
		if (chatPlatform === 'telegram') {
			return 'background-color: rgba(255,255,255,0.16); color: #f8fafc;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #e4e6eb; color: #050505;';
		}
		return 'background-color: #2b2d31; color: #f2f3f5;';
	}

	function getMessagesPaneStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #e5ddd5;';
		}
		if (chatPlatform === 'telegram') {
			return 'background-color: #d7e7f5;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #ffffff;';
		}
		return `background-color: ${backgroundColor};`;
	}

	function getMessageRowClass(isPrimarySpeaker: boolean): string {
		const outgoingClass = chatPlatform !== 'discord' && isPrimarySpeaker ? 'justify-end' : '';
		const hoverClass = chatPlatform === 'discord' ? 'hover:bg-white/5' : 'hover:bg-black/[0.04]';
		const interactiveClass = canCompose ? 'cursor-pointer' : '';
		return `flex items-start gap-2 rounded-md border transition-colors ${outgoingClass} ${hoverClass} ${interactiveClass}`;
	}

	function getMessageRowStyle(messageId: string): string {
		const isSelected = replyTargetId === messageId;
		if (!isSelected) {
			return `padding: ${messagePadding / 4}px ${messagePadding / 2}px; border-color: transparent;`;
		}
		const ringColor =
			chatPlatform === 'discord' ? 'rgba(88, 101, 242, 0.48)' : 'rgba(42, 171, 238, 0.42)';
		const selectedBg =
			chatPlatform === 'discord' ? 'rgba(88, 101, 242, 0.18)' : 'rgba(42, 171, 238, 0.12)';
		return `padding: ${messagePadding / 4}px ${messagePadding / 2}px; border-color: ${ringColor}; background-color: ${selectedBg};`;
	}

	function getMessageContentStyle(isPrimarySpeaker: boolean): string {
		if (chatPlatform === 'discord') {
			return 'flex: 1; min-width: 0;';
		}
		return `min-width: 0; max-width: 82%; display: flex; flex-direction: column; align-items: ${isPrimarySpeaker ? 'flex-end' : 'flex-start'};`;
	}

	function getAuthorNameStyle(
		roleColor: string,
		isPrimarySpeaker: boolean
	): string {
		if (chatPlatform === 'discord') {
			return `color: ${roleColor}; font-size: ${fontSize}px; font-weight: ${fontWeightValue};`;
		}
		if (isPrimarySpeaker) {
			return 'color: transparent;';
		}
		return `color: ${roleColor}; font-size: 11px; font-weight: 600;`;
	}

	function getHeaderTimestampStyle(): string {
		return 'color: #8d93a0;';
	}

	function getFloatingTimestampStyle(): string {
		return 'color: #8d93a0;';
	}

	function getReplyPreviewContainerStyle(
		isPrimarySpeaker: boolean,
		replyColor: string
	): string {
		const shell = 'border-radius: 10px; overflow: hidden; background-clip: padding-box;';
		if (chatPlatform === 'discord') {
			return `${shell} border-left: 4px solid ${replyColor}; background-color: rgba(79, 84, 92, 0.2);`;
		}
		if (chatPlatform === 'whatsapp') {
			return `${shell} border-left: 3px solid ${replyColor}; background-color: ${isPrimarySpeaker ? 'rgba(0, 168, 132, 0.14)' : 'rgba(17, 27, 33, 0.08)'};`;
		}
		if (chatPlatform === 'messenger') {
			return `${shell} border-left: 3px solid ${replyColor}; background-color: ${isPrimarySpeaker ? 'rgba(0, 132, 255, 0.16)' : 'rgba(17, 24, 39, 0.08)'};`;
		}
		return `${shell} border-left: 3px solid ${replyColor}; background-color: ${isPrimarySpeaker ? 'rgba(42, 171, 238, 0.16)' : 'rgba(23, 33, 43, 0.08)'};`;
	}

	function getReplyPreviewTextStyle(): string {
		if (chatPlatform === 'discord') {
			return `color: ${textColor}cc;`;
		}
		if (chatPlatform === 'whatsapp') {
			return 'color: #5f6d79;';
		}
		if (chatPlatform === 'messenger') {
			return 'color: #64748b;';
		}
		return 'color: #5e748a;';
	}

	function getMessageBodyStyle(isPrimarySpeaker: boolean): string {
		const base = `font-size: ${fontSize}px; font-weight: ${fontWeightValue}; line-height: 1.45;`;
		if (chatPlatform === 'discord') {
			return `color: #dbdee1; ${base} padding: ${messagePadding / 8}px 0; display: block; width: 100%;`;
		}

		if (chatPlatform === 'whatsapp') {
			const bubbleColor = isPrimarySpeaker ? '#d9fdd3' : '#ffffff';
			const radius = '14px';
			return `color: #111b21; ${base} background-color: ${bubbleColor}; border-radius: ${radius}; border: 1px solid rgba(15, 23, 42, 0.08); padding: ${Math.round(messagePadding / 2)}px ${Math.round(messagePadding * 0.75)}px; display: inline-block; max-width: 100%; overflow: hidden; background-clip: padding-box;`;
		}

		if (chatPlatform === 'messenger') {
			const bubbleBackground = isPrimarySpeaker ? '#0084ff' : '#E4E6EB';
			const bubbleText = isPrimarySpeaker ? '#ffffff' : '#050505';
			const radius = '18px';
			return `color: ${bubbleText}; ${base} background-color: ${bubbleBackground}; border-radius: ${radius}; border: none; padding: ${Math.round(messagePadding / 2)}px ${Math.round(messagePadding * 0.75)}px; display: inline-block; max-width: 100%; overflow: hidden; background-clip: padding-box;`;
		}

		// Telegram
		const bubbleColor = isPrimarySpeaker ? '#E1FFC7' : '#ffffff';
		const radius = '14px';
		return `color: #000000; ${base} background-color: ${bubbleColor}; border-radius: ${radius}; border: 1px solid ${isPrimarySpeaker ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.12)'}; padding: ${Math.round(messagePadding / 2)}px ${Math.round(messagePadding * 0.75)}px; display: inline-block; max-width: 100%; overflow: hidden; background-clip: padding-box;`;
	}

	function getBubbleTimestampStyle(isPrimarySpeaker: boolean): string {
		if (chatPlatform === 'whatsapp') {
			return `color: ${isPrimarySpeaker ? '#667781' : '#7d8c99'};`;
		}
		if (chatPlatform === 'messenger') {
			// Messenger shows timestamps between message groups, not inside bubbles.
			// This style is kept as a fallback but shouldShowBubbleTimestamp() returns false for Messenger.
			return `color: #65676b;`;
		}
		// Telegram
		return `color: ${isPrimarySpeaker ? '#4ea84e' : '#708397'};`;
	}

	function getTypingBubbleStyle(): string {
		if (chatPlatform === 'discord') {
			return 'background-color: #383a40;';
		}
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #ffffff; border: 1px solid #dfe5ec;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #E4E6EB;';
		}
		return 'background-color: #ffffff; border: 1px solid #d2dce9;';
	}

	function getTypingDotStyle(): string {
		if (chatPlatform === 'discord') return 'background-color: #bcc3ce;';
		if (chatPlatform === 'messenger') return 'background-color: #708397;';
		return 'background-color: #7d8c99;';
	}

	function getComposerBarStyle(): string {
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #f0f2f5; border-top-color: #d9dce2;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #ffffff; border-top-color: #e4e6eb;';
		}
		if (chatPlatform === 'telegram') {
			return 'background-color: #f3f5f7; border-top-color: #d2d8df;';
		}
		return 'background-color: #232428; border-top-color: #111214;';
	}

	function getReplyChipStyle(): string {
		if (chatPlatform === 'discord') {
			return 'border-color: #45484f; background-color: #2f3136; color: #f2f3f5;';
		}
		if (chatPlatform === 'whatsapp') {
			return 'border-color: #cfd6df; background-color: #ffffff; color: #111b21;';
		}
		if (chatPlatform === 'messenger') {
			return 'border-color: #dbe2ef; background-color: #f7f9fd; color: #111827;';
		}
		return 'border-color: #cfd8e3; background-color: #ffffff; color: #17212b;';
	}

	function getComposerShellStyle(): string {
		if (chatPlatform === 'discord') {
			return 'background-color: #383a40; border: 1px solid transparent;';
		}
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #ffffff; border: 1px solid #d9dfe8;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #f0f0f0; border: 1px solid transparent;';
		}
		return 'background-color: #ffffff; border: 1px solid #d5deea;';
	}

	function getSpeakerTriggerStyle(): string {
		if (chatPlatform === 'discord') {
			return 'color: #f2f3f5;';
		}
		return 'color: #1f2937;';
	}

	function getSpeakerContentClass(): string {
		if (chatPlatform === 'discord') {
			return 'border-[#2b2d31] bg-[#111214] text-[#f2f3f5]';
		}
		return 'border-border bg-popover text-popover-foreground';
	}

	function getComposerInputStyle(): string {
		if (chatPlatform === 'discord') {
			return 'color: #f2f3f5;';
		}
		if (chatPlatform === 'whatsapp') {
			return 'color: #111b21;';
		}
		if (chatPlatform === 'messenger') {
			return 'color: #111827;';
		}
		return 'color: #17212b;';
	}

	function getComposerPlaceholderStyle(): string {
		if (chatPlatform === 'discord') return 'color: #8d93a0;';
		return 'color: #7c8794;';
	}

	function getSendButtonStyle(): string {
		if (chatPlatform === 'discord') {
			return `background-color: ${primaryColor}; color: #ffffff;`;
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #0084ff; color: #ffffff; min-width: 2rem; height: 2rem; border-radius: 999px;';
		}
		if (chatPlatform === 'whatsapp') {
			return 'background-color: #00a884; color: #ffffff; min-width: 2rem; height: 2rem; border-radius: 999px;';
		}
		return 'background-color: #2aabee; color: #ffffff; min-width: 2rem; height: 2rem; border-radius: 999px;';
	}

	function getPassiveComposerShellStyle(): string {
		if (chatPlatform === 'discord') {
			return 'background-color: #383a40;';
		}
		if (chatPlatform === 'messenger') {
			return 'background-color: #f0f0f0; border: 1px solid transparent;';
		}
		if (chatPlatform === 'telegram') {
			return 'background-color: #ffffff; border: 1px solid #d5deea;';
		}
		return 'background-color: #ffffff; border: 1px solid #d9dfe8;';
	}

	function getComposerIconStyle(): string {
		if (chatPlatform === 'discord') return 'color: #b5bac1;';
		if (chatPlatform === 'whatsapp') return 'color: #8696a0;';
		if (chatPlatform === 'messenger') return 'color: #0084ff;';
		return 'color: #8b98a5;';
	}
</script>

<svelte:window onclick={handleGlobalPointerDown} onkeydown={handleGlobalKeyDown} />

<div class="relative inline-flex items-center justify-center">
	<!-- Outer frame: slightly larger than the captured screen -->
	<div class="relative overflow-hidden rounded-[2.7rem] bg-foreground p-[7px] shadow-2xl" data-export-capture="phone">
		<!-- Preview mask: aligns visible inner corners with bezel -->
		<div
			class="relative h-[600px] aspect-[9/16] overflow-hidden rounded-[2.25rem] z-0"
		>
			<!-- Captured surface: strict 9:16 inner screen -->
			<div
				class="relative h-full w-full bg-background overflow-hidden z-0"
				data-export-capture="screen"
			>
				<!-- Content -->
				<div class="h-full z-0" data-export-capture="app-content">
				{#if previewState === 'preview' || previewState === 'video'}
						<!-- Chat Preview -->
						<div class="h-full flex flex-col" style="background-color: {backgroundColor}; font-family: {fontFamilyStack};">
							<!-- Chat Header -->
							<div
								class="px-3 py-2 border-b flex items-center justify-between flex-shrink-0 shadow-sm backdrop-blur-sm"
								style={getHeaderContainerStyle()}
							>
								{#if isDiscord}
									<!-- Discord: # badge + channel name + members count -->
									<div class="flex items-center gap-2 flex-1 min-w-0">
										<div
											class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
											style={getHeaderBadgeStyle()}
										>
											<span class="text-xs font-semibold">#</span>
										</div>
										<div class="flex-1 min-w-0 leading-tight">
											<div class="text-sm font-semibold truncate" style={getHeaderTextStyle()}>
												{channelName}
											</div>
											<div class="text-[10px] truncate" style={getHeaderSubtitleStyle()}>
												{headerSubtitle}
											</div>
										</div>
									</div>
									<div class="flex items-center gap-3 ml-2">
										<!-- Pin icon -->
										<svg class="w-[18px] h-[18px]" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
										</svg>
										<!-- Members icon -->
										<svg class="w-[18px] h-[18px]" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
										</svg>
										<!-- Search icon -->
										<svg class="w-[18px] h-[18px]" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
										</svg>
									</div>
								{:else}
									<!-- WhatsApp / Messenger / Telegram: back arrow + avatar + name/status + action icons -->
									<div class="flex items-center gap-2 flex-1 min-w-0">
										<!-- Back arrow -->
										<svg class="w-5 h-5 flex-shrink-0" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
										</svg>
										<!-- Group avatar circle -->
										<div
											class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
											style="background-color: {primaryColor}; border-radius: 9999px; overflow: hidden;"
										>
											{#if channelAvatar}
												<img
													src={channelAvatar}
													alt="Chat Logo"
													class="w-full h-full object-cover rounded-full"
													style="border-radius: 9999px; clip-path: circle(50% at 50% 50%);"
												/>
											{:else if characters.length > 0 && characters[0].avatar}
												<img
													src={characters[0].avatar}
													alt="Group"
													class="w-full h-full object-cover rounded-full"
													style="border-radius: 9999px; clip-path: circle(50% at 50% 50%);"
												/>
											{:else}
												<svg class="w-4 h-4" style="color: #ffffff;" fill="currentColor" viewBox="0 0 24 24">
													<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
												</svg>
											{/if}
										</div>
										<!-- Name + subtitle -->
										<div class="flex-1 min-w-0 leading-tight">
											<div class="text-sm font-semibold truncate" style={getHeaderTextStyle()}>
												{channelName}
											</div>
											<div class="text-[10px] truncate" style={getHeaderSubtitleStyle()}>
												{headerSubtitle}
											</div>
										</div>
									</div>
									<div class="flex items-center gap-3 ml-2">
										{#if isWhatsApp}
											<!-- WhatsApp: video call, phone call, dots -->
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
											</svg>
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
											</svg>
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
											</svg>
										{:else if isMessenger}
											<!-- Messenger: phone, video, info circle -->
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
											</svg>
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
											</svg>
											<svg class="w-[18px] h-[18px]" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
										{:else}
											<!-- Telegram: phone, dots/menu -->
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
											</svg>
											<svg class="w-5 h-5" style={getHeaderIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
											</svg>
										{/if}
									</div>
								{/if}
							</div>

						<!-- Messages Area -->
						<div
							class="flex-1 overflow-y-auto px-1 py-4"
							bind:this={messagesViewport}
							style={getMessagesPaneStyle()}
						>
							<div
								style="gap: {messageSpacing}px; display: flex; flex-direction: column; text-align: left; font-weight: {fontWeightValue};"
							>
								{#if renderedMessages.length === 0}
									<div class="flex flex-col items-center justify-center py-8 text-center">
										{#if isDiscord}
											<div
												class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
												style={getHeaderBadgeStyle()}
											>
												<span class="text-2xl font-bold">#</span>
											</div>
										{:else}
											<div
												class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
												style="background-color: {primaryColor};"
											>
												<svg class="w-8 h-8" style="color: #ffffff;" fill="currentColor" viewBox="0 0 24 24">
													<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
												</svg>
											</div>
										{/if}
										<div class="text-base font-semibold mb-1" style={getHeaderTextStyle()}>
											Welcome to {channelName}
										</div>
										<div class="text-xs px-6" style={getHeaderSubtitleStyle()}>
											Send your first message from the composer below.
										</div>
									</div>
								{:else}
									{#each renderedMessages as rendered, index (rendered.message.id)}
										{@const message = rendered.message}
										{@const character = message.characterId ? characterMap.get(message.characterId) : undefined}
										{@const displayCharacter = character || {
											id: 'unassigned',
											username: 'Unknown',
											avatar: '',
											roleColor: '#99aab5'
										}}
										{@const prevMessage = index > 0 ? renderedMessages[index - 1].message : null}
										{@const isSameUser = prevMessage && prevMessage.characterId === message.characterId}
										{@const timeDiff = prevMessage ? new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() : 0}
										{@const isGrouped = Boolean(isSameUser && timeDiff < 300000)}
										{@const replyMessage = message.replyTo ? messageMap.get(message.replyTo) : undefined}
										{@const replyCharacter = replyMessage?.characterId ? characterMap.get(replyMessage.characterId) : undefined}
										{@const replyText = replyMessage ? visibleMessageTextById.get(replyMessage.id) ?? replyMessage.text : ''}
										{@const replyPreview = replyText.length > 90 ? `${replyText.slice(0, 87)}...` : replyText}
										{@const isPrimarySpeaker = message.characterId === primarySpeakerId}

										<div
											class={getMessageRowClass(isPrimarySpeaker)}
											style={getMessageRowStyle(message.id)}
											role="button"
											tabindex={canCompose ? 0 : -1}
											aria-pressed={canCompose ? replyTargetId === message.id : undefined}
											onclick={() => toggleReplyTarget(message.id)}
											onkeydown={(event) => handleMessageRowKeyDown(event, message.id)}
											oncontextmenu={(event) => openMessageContextMenu(event, message.id)}
										>
											{#if shouldShowAvatarForMessage(isPrimarySpeaker, isGrouped)}
												<Avatar class="w-9 h-9 flex-shrink-0 mt-0.5" style="border-radius: 50%; overflow: hidden;">
													<AvatarImage src={displayCharacter.avatar} alt={displayCharacter.username} style="border-radius: 50%; width: 100%; height: 100%; object-fit: cover;" />
													<AvatarFallback
														class="text-white text-xs font-semibold"
														style="background-color: {displayCharacter.roleColor}; border-radius: 50%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
													>
														{displayCharacter.username.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
											{:else if shouldShowFloatingTimestamp(isGrouped)}
												<div class="w-9 flex-shrink-0 flex items-center justify-end">
													<span class="text-[10px] font-medium" style={getFloatingTimestampStyle()}>
														{formatMessageTimestamp(message.timestamp)}
													</span>
												</div>
											{/if}

											<div style={getMessageContentStyle(isPrimarySpeaker)}>
												{#if shouldShowAuthorForMessage(isPrimarySpeaker, isGrouped)}
													<div class="flex items-baseline gap-1.5 mb-0.5">
														<span style={getAuthorNameStyle(character ? displayCharacter.roleColor : '#99aab5', isPrimarySpeaker)}>
															{displayCharacter.username}
														</span>
														{#if shouldShowHeaderTimestamp(isGrouped)}
															<span class="text-[10px] font-medium" style={getHeaderTimestampStyle()}>
																{formatMessageTimestamp(message.timestamp)}
															</span>
														{/if}
													</div>
												{/if}

												{#if replyMessage}
													<div
														class="mb-2 rounded-md pl-3 pr-3 py-2 cursor-pointer transition-colors hover:bg-black/10"
														style={getReplyPreviewContainerStyle(
															isPrimarySpeaker,
															replyCharacter ? replyCharacter.roleColor : '#4f545c'
														)}
													>
														<div class="flex items-start gap-2">
															<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" style="color: {replyCharacter ? replyCharacter.roleColor : '#9ca3af'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
																<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
															</svg>
															<div class="flex-1 min-w-0">
																<div
																	class="font-bold text-[0.7rem] tracking-tight mb-0.5"
																	style="color: {replyCharacter ? replyCharacter.roleColor : '#9ca3af'}"
																>
																	{replyCharacter ? replyCharacter.username : 'Unknown User'}
																</div>
																<div class="text-[0.7rem] leading-relaxed font-medium" style={getReplyPreviewTextStyle()}>
																	{replyPreview || 'Original message'}
																</div>
															</div>
														</div>
													</div>
												{/if}

												<div class="leading-relaxed break-words" style={getMessageBodyStyle(isPrimarySpeaker)}>
													{rendered.text}
													{#if rendered.isTyping}
														<span class="inline-block ml-0.5 h-[1em] align-[-0.1em] w-[1px]" style="background-color: currentColor; opacity: {Math.abs(Math.cos(currentTime * Math.PI * 3))};"></span>
													{/if}
													{#if shouldShowBubbleTimestamp()}
														<div class="mt-1 text-[10px] leading-none text-right" style={getBubbleTimestampStyle(isPrimarySpeaker)}>
															{formatMessageTimestamp(message.timestamp)}
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/each}

									{#if typingIndicatorCharacter}
										{@const typingIsPrimary = typingIndicatorCharacter.id === primarySpeakerId}
										<div
											class="flex items-end gap-2 {chatPlatform !== 'discord' && typingIsPrimary ? 'justify-end' : ''}"
											style="padding: {messagePadding / 4}px {messagePadding / 2}px;"
										>
											{#if shouldShowAvatarForMessage(typingIsPrimary, false)}
												<Avatar class="w-9 h-9 flex-shrink-0 mt-0.5" style="border-radius: 50%; overflow: hidden;">
													<AvatarImage src={typingIndicatorCharacter.avatar} alt={typingIndicatorCharacter.username} style="border-radius: 50%; width: 100%; height: 100%; object-fit: cover;" />
													<AvatarFallback
														class="text-white text-xs font-semibold"
														style="background-color: {typingIndicatorCharacter.roleColor}; border-radius: 50%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
													>
														{typingIndicatorCharacter.username.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
											{/if}
											<div class="rounded-2xl px-3 py-2 inline-flex items-center gap-1.5" style={getTypingBubbleStyle()}>
												<span class="h-1.5 w-1.5 rounded-full" style={`${getTypingDotStyle()} transform: translateY(${Math.sin((currentTime * 8) + 0) * -2.5 + 1.25}px);`}></span>
												<span class="h-1.5 w-1.5 rounded-full" style={`${getTypingDotStyle()} transform: translateY(${Math.sin((currentTime * 8) - 1.5) * -2.5 + 1.25}px);`}></span>
												<span class="h-1.5 w-1.5 rounded-full" style={`${getTypingDotStyle()} transform: translateY(${Math.sin((currentTime * 8) - 3.0) * -2.5 + 1.25}px);`}></span>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Composer -->
						<div
							class="px-3 py-2 border-t flex-shrink-0 backdrop-blur-sm"
							style={getComposerBarStyle()}
						>
							{#if canCompose}
								{#if replyTargetMessage}
									<div
										class="mb-2 flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs"
										style={getReplyChipStyle()}
									>
										<div class="truncate">
											Replying to {characterMap.get(replyTargetMessage.characterId ?? '')?.username ?? 'Unknown'}
										</div>
										<button
											class="ml-2 shrink-0 rounded px-1 text-xs font-semibold"
											style={getHeaderSubtitleStyle()}
											onclick={() => (replyTargetId = null)}
											type="button"
										>
											X
										</button>
									</div>
								{/if}
								<div
									class="flex items-center gap-1.5 rounded-full px-2 py-1.5"
									style={getComposerShellStyle()}
								>
									<Select
										type="single"
										bind:value={selectedSpeakerId}
										items={speakerOptions}
										onValueChange={(value) => (selectedSpeakerId = value)}
									>
										<SelectTrigger
											class="h-7 min-w-[6.8rem] max-w-[7.4rem] border-0 bg-transparent px-1.5 py-1 text-[11px] font-semibold shadow-none focus-visible:ring-0"
											style={getSpeakerTriggerStyle()}
										>
											<span data-slot="select-value" class="truncate">
												{characterMap.get(selectedSpeakerId)?.username ?? 'Speaker'}
											</span>
										</SelectTrigger>
										<SelectContent class={getSpeakerContentClass()}>
											{#each characters as character (character.id)}
												<SelectItem
													value={character.id}
													label={character.username}
													class={chatPlatform === 'discord' ? 'data-[highlighted]:bg-white/10 data-[highlighted]:text-white' : ''}
												>
													{character.username}
												</SelectItem>
											{/each}
										</SelectContent>
									</Select>
									<input
										bind:value={composerText}
										class="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[11px]"
										style={getComposerInputStyle()}
										placeholder={composerPlaceholder}
										onkeydown={handleComposerKeyDown}
									/>
									<button
										type="button"
										class="rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity disabled:opacity-40 flex items-center justify-center"
										style={getSendButtonStyle()}
										onclick={handleComposerSend}
										disabled={!composerText.trim() || !selectedSpeakerId}
										aria-label="Send message"
									>
										{#if isDiscord}
											Send
										{:else}
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 12h14m0 0l-5.5-5.5M19 12l-5.5 5.5"/>
											</svg>
										{/if}
									</button>
								</div>
							{:else}
								{#if isDiscord}
									<!-- Discord: [+] [input placeholder] [gift GIF emoji sticker] — single row, compact -->
									<div
										class="flex items-center gap-1 rounded-lg px-2 py-1.5"
										style="background-color: #383a40;"
									>
										<svg class="w-[18px] h-[18px] flex-shrink-0" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v16m8-8H4"/>
										</svg>
										<div class="flex-1 text-[13px] truncate" style={getComposerPlaceholderStyle()}>
											{composerPlaceholder}
										</div>
										<div class="flex items-center gap-1">
											<svg class="w-[16px] h-[16px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
											</svg>
											<span class="text-[9px] font-bold px-[3px] py-[1px] rounded" style={`${getComposerIconStyle()} border: 1.5px solid currentColor; line-height: 1;`}>GIF</span>
											<svg class="w-[16px] h-[16px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
											<svg class="w-[16px] h-[16px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
											</svg>
										</div>
									</div>
								{:else if isWhatsApp}
									<!-- WhatsApp: [emoji] [input pill] [camera] | [mic circle] -->
									<div class="flex items-center gap-1.5">
										<div
											class="flex flex-1 items-center gap-1.5 rounded-full px-2.5 py-1.5"
											style="background-color: #ffffff; border: 1px solid #d9dfe8; border-radius: 9999px;"
										>
											<svg class="w-[18px] h-[18px] flex-shrink-0" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
											<div class="flex-1 text-[13px] truncate" style={getComposerPlaceholderStyle()}>
												{composerPlaceholder}
											</div>
											<!-- Attachment/clip -->
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
											</svg>
											<!-- Camera -->
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0a3 3 0 016 0z"/>
											</svg>
										</div>
										<!-- Mic circle -->
										<div
											class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
											style="background-color: #00a884; border-radius: 9999px;"
										>
											<svg class="w-[16px] h-[16px]" style="color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"/>
											</svg>
										</div>
									</div>
								{:else if isMessenger}
									<!-- Messenger: [grid camera gallery mic] outside | [input pill] [thumbs-up] -->
									<div class="flex items-center gap-1.5">
										<div class="flex items-center gap-1 flex-shrink-0">
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
											</svg>
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0a3 3 0 016 0z"/>
											</svg>
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
											</svg>
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"/>
											</svg>
										</div>
										<div
											class="flex flex-1 items-center gap-1 rounded-full px-3 py-1.5"
											style="background-color: #f0f0f0;"
										>
											<div class="flex-1 text-[13px] truncate" style={getComposerPlaceholderStyle()}>
												{composerPlaceholder}
											</div>
											<!-- Sticker/emoji -->
											<svg class="w-[16px] h-[16px]" style="color: #0084ff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
										</div>
										<!-- Thumbs up -->
										<svg class="w-5 h-5 flex-shrink-0" style="color: #0084ff;" fill="currentColor" viewBox="0 0 24 24">
											<path d="M2 20h2V8H2v12zm20-10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.59 6.59C7.22 6.95 7 7.45 7 8v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
										</svg>
									</div>
								{:else}
									<!-- Telegram: [attachment] [input pill with emoji] | [mic circle] -->
									<div class="flex items-center gap-1.5">
										<div
											class="flex flex-1 items-center gap-1.5 rounded-full px-2.5 py-1.5"
											style="background-color: #ffffff; border: 1px solid #d5deea; border-radius: 9999px;"
										>
											<!-- Attachment/clip -->
											<svg class="w-[18px] h-[18px] flex-shrink-0" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
											</svg>
											<div class="flex-1 text-[13px] truncate" style={getComposerPlaceholderStyle()}>
												{composerPlaceholder}
											</div>
											<!-- Emoji -->
											<svg class="w-[18px] h-[18px]" style={getComposerIconStyle()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
										</div>
										<!-- Mic circle -->
										<div
											class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
											style="background-color: #2aabee; border-radius: 9999px;"
										>
											<svg class="w-[16px] h-[16px]" style="color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"/>
											</svg>
										</div>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{:else if previewState === 'loading'}
					<!-- Loading State -->
					<div class="h-full flex items-center justify-center relative" style="background-color: {backgroundColor};">
						<div
							class="rounded-lg p-6 text-center max-w-xs backdrop-blur-sm"
							style={`background-color: ${chatPlatform === 'discord' ? '#1e1f22' : '#ffffffee'}`}
						>
							<div
								class="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
								style="border-color: {primaryColor}40; border-top-color: transparent"
							></div>
							<p class="mb-2" style="color: {textColor}">Generating your video...</p>
							<Progress value={65} class="w-full h-2" />
						</div>
					</div>
				{/if}
				</div>
			</div>
		</div>

		<!-- Frame overlay (always above content) -->
		<div class="pointer-events-none absolute inset-0 z-40 rounded-[2.7rem] border-[7px] border-foreground"></div>
		<div class="pointer-events-none absolute left-1/2 top-[7px] z-50 h-1 w-20 -translate-x-1/2 rounded-full bg-foreground/80"></div>

		<!-- Home Indicator -->
		<div class="pointer-events-none absolute bottom-[7px] left-1/2 z-50 h-1 w-32 -translate-x-1/2 rounded-full bg-background/95"></div>
	</div>

	{#if canCompose && messageContextMenu && contextMenuMessage}
		<div
			data-message-context-menu
			class="fixed z-[120] w-[11.75rem] rounded-md border border-border bg-card p-1 shadow-lg"
			role="menu"
			tabindex="-1"
			style="left: {messageContextMenu.x}px; top: {messageContextMenu.y}px;"
			oncontextmenu={(event) => event.preventDefault()}
		>
			<button
				type="button"
				class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleContextReplyToggle}
			>
				{replyTargetId === contextMenuMessage.id ? 'Remove reply target' : 'Reply to this message'}
			</button>
			<button
				type="button"
				class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleContextCopyText}
			>
				Copy message text
			</button>
			<button
				type="button"
				class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleContextCopyId}
			>
				Copy message ID
			</button>
		</div>
	{/if}
</div>
