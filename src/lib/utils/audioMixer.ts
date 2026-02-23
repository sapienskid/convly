import type { AnimationTimeline, TimelineEntry } from './animationTimeline';

export interface AudioEvent {
	time: number;
	type: 'notification' | 'music_start';
	characterId?: string;
}

export interface AudioMixerOptions {
	musicEnabled: boolean;
	musicVolume: number;
	musicTrackUrl: string | null;
	notificationEnabled: boolean;
	notificationSoundUrl: string;
}

export interface AudioMixer {
	getStream(): MediaStream | null;
	scheduleEvents(events: AudioEvent[]): void;
	playMusic(): void;
	stopMusic(): void;
	playNotification(): void;
	setCurrentTime(time: number): void;
	destroy(): void;
}

export function createAudioMixer(options: AudioMixerOptions): AudioMixer {
	let audioContext: AudioContext | null = null;
	let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
	let musicElement: HTMLAudioElement | null = null;
	let musicSource: MediaElementAudioSourceNode | null = null;
	let notificationElement: HTMLAudioElement | null = null;
	let notificationSource: MediaElementAudioSourceNode | null = null;
	let isMusicPlaying = false;
	let currentTime = 0;

	function init(): void {
		if (typeof window === 'undefined') return;

		audioContext = new AudioContext();
		mediaStreamDestination = audioContext.createMediaStreamDestination();

		if (options.musicEnabled && options.musicTrackUrl) {
			musicElement = new Audio(options.musicTrackUrl);
			musicElement.crossOrigin = 'anonymous';
			musicElement.load();
		}

		if (options.notificationEnabled) {
			notificationElement = new Audio(options.notificationSoundUrl);
			notificationElement.load();
		}
	}

	function connectMusicSource(): void {
		if (!audioContext || !musicElement || musicSource) return;

		try {
			musicSource = audioContext.createMediaElementSource(musicElement);
			const gainNode = audioContext.createGain();
			gainNode.gain.value = options.musicVolume;

			musicSource.connect(gainNode);
			gainNode.connect(mediaStreamDestination!);
			gainNode.connect(audioContext.destination);
		} catch {
			console.warn('Music source already connected or unavailable');
		}
	}

	function connectNotificationSource(): void {
		if (!audioContext || !notificationElement || notificationSource) return;

		try {
			notificationSource = audioContext.createMediaElementSource(notificationElement);
			notificationSource.connect(mediaStreamDestination!);
			notificationSource.connect(audioContext.destination);
		} catch {
			console.warn('Notification source already connected or unavailable');
		}
	}

	function getStream(): MediaStream | null {
		if (!mediaStreamDestination) init();
		return mediaStreamDestination?.stream ?? null;
	}

	function playMusic(): void {
		if (!musicElement || isMusicPlaying) return;

		connectMusicSource();

		if (audioContext?.state === 'suspended') {
			audioContext.resume();
		}

		musicElement.currentTime = currentTime;
		musicElement.loop = true;
		musicElement.volume = options.musicVolume;

		musicElement.play().catch((err) => {
			console.warn('Failed to play music:', err);
		});

		isMusicPlaying = true;
	}

	function stopMusic(): void {
		if (!musicElement) return;
		musicElement.pause();
		isMusicPlaying = false;
	}

	function playNotification(): void {
		if (!notificationElement) return;

		connectNotificationSource();

		if (audioContext?.state === 'suspended') {
			audioContext.resume();
		}

		notificationElement.currentTime = 0;
		notificationElement.play().catch((err) => {
			console.warn('Failed to play notification:', err);
		});
	}

	function setCurrentTime(time: number): void {
		currentTime = time;
		if (musicElement && isMusicPlaying) {
			try {
				musicElement.currentTime = time;
			} catch {
				// Ignore seek errors
			}
		}
	}

	function scheduleEvents(events: AudioEvent[]): void {
		// Events are handled synchronously during recording
		// This is a placeholder for more sophisticated scheduling
	}

	function destroy(): void {
		stopMusic();

		if (musicSource) {
			musicSource.disconnect();
			musicSource = null;
		}

		if (notificationSource) {
			notificationSource.disconnect();
			notificationSource = null;
		}

		if (audioContext) {
			audioContext.close();
			audioContext = null;
		}

		mediaStreamDestination = null;
		musicElement = null;
		notificationElement = null;
	}

	init();

	return {
		getStream,
		scheduleEvents,
		playMusic,
		stopMusic,
		playNotification,
		setCurrentTime,
		destroy
	};
}

export function extractAudioEventsFromTimeline(timeline: AnimationTimeline): AudioEvent[] {
	const events: AudioEvent[] = [];

	for (const entry of timeline.entries) {
		events.push({
			time: entry.typingEnd,
			type: 'notification',
			characterId: entry.message.characterId
		});
	}

	return events;
}
