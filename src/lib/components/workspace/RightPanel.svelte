<script lang="ts">
	import type { Character, Message, Connection } from '$lib/types';
	import PhonePreview from './PhonePreview.svelte';
	import VideoControls from './VideoControls.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import {
		MessageSquare,
		Type,
		Layout,
		Video,
		Film,
		Clock,
		Palette
	} from 'lucide-svelte/icons';

	type SelectOption = { value: string; label: string };

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		previewState: 'preview' | 'loading' | 'video';
		isGenerating: boolean;
		customizeSettings: any;
		onGenerateVideo: () => void;
		onCustomizationApply: (settings: any) => void;
	}

	let {
		characters,
		messages,
		connections,
		previewState,
		isGenerating,
		customizeSettings,
		onGenerateVideo,
		onCustomizationApply
	}: Props = $props();

	// Chat Room Settings
	let channelName = $state(customizeSettings.channelName || 'general');
	
	// Sync local state with customizeSettings
	$effect(() => {
		channelName = customizeSettings.channelName || 'general';
		fontFamily = customizeSettings.fontFamily || 'Inter';
		fontSize = customizeSettings.fontSize || 16;
		fontWeight = customizeSettings.fontWeight || 'normal';
		messageSpacing = customizeSettings.messageSpacing || 12;
		messagePadding = customizeSettings.messagePadding || 16;
		messageAlignment = customizeSettings.messageAlignment || 'left';
		showAvatars = customizeSettings.showAvatars ?? true;
		showTimestamps = customizeSettings.showTimestamps ?? true;
		resolution = customizeSettings.resolution || '1080p';
		fps = customizeSettings.fps || 30;
		quality = customizeSettings.quality || 'high';
		animationSpeed = customizeSettings.animationSpeed || 1;
		enableTransitions = customizeSettings.enableTransitions ?? true;
		animationStyle = customizeSettings.animationStyle || 'smooth';
		enableAudio = customizeSettings.enableAudio ?? false;
		backgroundMusicVolume = customizeSettings.backgroundMusicVolume || 70;
		soundEffectsVolume = customizeSettings.soundEffectsVolume || 50;
		exportFormat = customizeSettings.exportFormat || 'mp4';
		codec = customizeSettings.codec || 'h264';
		enableCompression = customizeSettings.enableCompression ?? true;
		backgroundImage = customizeSettings.backgroundImage || '';
		backgroundTheme = customizeSettings.backgroundTheme || 'none';
	});

	const fontFamilyOptions: SelectOption[] = [
		{ value: 'Inter', label: 'Inter' },
		{ value: 'Roboto', label: 'Roboto' },
		{ value: 'Open Sans', label: 'Open Sans' },
		{ value: 'Lato', label: 'Lato' },
		{ value: 'Montserrat', label: 'Montserrat' },
		{ value: 'Poppins', label: 'Poppins' }
	];

	const fontWeightOptions: SelectOption[] = [
		{ value: 'light', label: 'Light (300)' },
		{ value: 'normal', label: 'Normal (400)' },
		{ value: 'medium', label: 'Medium (500)' },
		{ value: 'semibold', label: 'Semibold (600)' },
		{ value: 'bold', label: 'Bold (700)' }
	];

	const messageAlignmentOptions: SelectOption[] = [
		{ value: 'left', label: 'Left' },
		{ value: 'center', label: 'Center' },
		{ value: 'right', label: 'Right' }
	];

	const resolutionOptions: SelectOption[] = [
		{ value: '720p', label: '720p (1280x720)' },
		{ value: '1080p', label: '1080p (1920x1080)' },
		{ value: '1440p', label: '1440p (2560x1440)' }
	];

	const qualityOptions: SelectOption[] = [
		{ value: 'low', label: 'Low (Faster)' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'ultra', label: 'Ultra (Slower)' }
	];



	const exportFormatOptions: SelectOption[] = [
		{ value: 'mp4', label: 'MP4 (Recommended)' },
		{ value: 'webm', label: 'WebM' }
	];

	const backgroundThemeOptions: SelectOption[] = [
		{ value: 'none', label: 'None (Solid Color)' },
		{ value: 'gradient1', label: 'Purple Gradient' },
		{ value: 'gradient2', label: 'Blue Gradient' },
		{ value: 'gradient3', label: 'Green Gradient' },
		{ value: 'pattern1', label: 'Grid Pattern' },
		{ value: 'pattern2', label: 'Dots Pattern' },
		{ value: 'custom', label: 'Custom Image' }
	];

	const getOptionLabel = (options: SelectOption[], value: string, placeholder: string) => {
		const match = options.find((option) => option.value === value);
		return match ? match.label : placeholder;
	};

	const selectTriggerTextClass = (hasValue: boolean) =>
		hasValue ? 'line-clamp-1' : 'line-clamp-1 text-muted-foreground';

	// Typography Settings
	let fontFamily = $state('Inter');
	let fontSize = $state(16);
	let fontWeight = $state('normal');

	// Layout Settings
	let messageSpacing = $state(12);
	let messagePadding = $state(16);
	let messageAlignment = $state('left');
	let showAvatars = $state(true);
	let showTimestamps = $state(true);

	// Video Quality Settings
	let resolution = $state('1080p');
	let fps = $state(30);
	let quality = $state('high');

	// Animation Settings
	let animationSpeed = $state(1);
	let enableTransitions = $state(true);
	let animationStyle = $state('smooth');

	// Audio Settings
	let enableAudio = $state(false);
	let backgroundMusicVolume = $state(70);
	let soundEffectsVolume = $state(50);

	// Export Settings
	let exportFormat = $state('mp4');
	let codec = $state('h264');
	let enableCompression = $state(true);

	// New Timing Settings
	let messageDuration = $state(2.5); // seconds per message
	let transitionDuration = $state(0.3); // seconds for transitions
	let backgroundColor = $state('#313338');
	let backgroundImage = $state('');
	let backgroundTheme = $state('none');

	// Video Controls State
	let isVideoPlaying = $state(false);
	let videoCurrentTime = $state(0);
	let videoDuration = $state(100);

	function handleApplySettings() {
		onCustomizationApply({
			channelName,
			fontFamily,
			fontSize,
			fontWeight,
			messageSpacing,
			messagePadding,
			messageAlignment,
			showAvatars,
			showTimestamps,
			resolution,
			fps,
			quality,
			animationSpeed,
			enableTransitions,
			animationStyle,
			enableAudio,
			backgroundMusicVolume,
			soundEffectsVolume,
			exportFormat,
			codec,
			enableCompression,
			messageDuration,
			transitionDuration,
			backgroundColor,
			backgroundImage,
			backgroundTheme
		});
	}

	function handleVideoPlayPause() {
		isVideoPlaying = !isVideoPlaying;
	}

	function handleVideoRestart() {
		videoCurrentTime = 0;
		isVideoPlaying = false;
	}

	function handleVideoDownload() {
		// TODO: Implement video download
		console.log('Downloading video...');
	}

	function handleVideoSeek(time: number) {
		videoCurrentTime = time;
	}
</script>

<div class="flex h-full flex-col bg-gradient-to-b from-card to-card/50">
	<!-- Customization Panel Header -->
	<div class="border-b border-border bg-card/80 backdrop-blur-sm p-5 flex-shrink-0">
		<div class="flex items-center gap-3 mb-2">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
				</svg>
			</div>
			<div>
				<h2 class="text-lg font-bold">Customization</h2>
				<p class="text-xs text-muted-foreground">Fine-tune your video</p>
			</div>
		</div>
	</div>

	<!-- Scrollable Customization Panel -->
	<div class="flex-1 overflow-y-auto">
		<div class="p-6 pb-32">
			<Accordion type="multiple" value={['typography', 'layout', 'timing', 'video']} class="w-full space-y-2">
				<!-- Appearance Settings -->
				<AccordionItem value="appearance">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Palette class="size-4" />
							<span>Appearance</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="channel-name" class="text-sm">Channel Name</Label>
								<Input id="channel-name" bind:value={channelName} class="mt-1.5" onblur={handleApplySettings} placeholder="general" />
								<p class="text-xs text-muted-foreground mt-1">Appears in the chat header</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Typography -->
				<AccordionItem value="typography">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Type class="size-4" />
							<span>Typography</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="font-family" class="text-sm">Font Family</Label>
								<Select
									type="single"
									bind:value={fontFamily}
									items={fontFamilyOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="font-family" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(fontFamily))}>
											{getOptionLabel(fontFamilyOptions, fontFamily, 'Select font')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each fontFamilyOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label for="font-weight" class="text-sm">Font Weight</Label>
								<Select
									type="single"
									bind:value={fontWeight}
									items={fontWeightOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="font-weight" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(fontWeight))}>
											{getOptionLabel(fontWeightOptions, fontWeight, 'Select weight')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each fontWeightOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Layout -->
				<AccordionItem value="layout">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Layout class="size-4" />
							<span>Layout</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div class="flex items-center justify-between">
								<Label for="show-avatars" class="text-sm">Show Avatars</Label>
								<Switch id="show-avatars" bind:checked={showAvatars} onCheckedChange={handleApplySettings} />
							</div>
							<div class="flex items-center justify-between">
								<Label for="show-timestamps" class="text-sm">Show Timestamps</Label>
								<Switch id="show-timestamps" bind:checked={showTimestamps} onCheckedChange={handleApplySettings} />
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Video Quality -->
				<AccordionItem value="video-quality">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Video class="size-4" />
							<span>Video Output</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="resolution" class="text-sm">Resolution</Label>
								<Select
									type="single"
									bind:value={resolution}
									items={resolutionOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="resolution" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(resolution))}>
											{getOptionLabel(resolutionOptions, resolution, 'Select resolution')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each resolutionOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<p class="text-xs text-muted-foreground mt-1">1080p recommended for most uses</p>
							</div>
							<div>
								<Label for="fps" class="text-sm">Frame Rate: {fps} FPS</Label>
								<Slider
									id="fps"
									type="single"
									bind:value={fps}
									min={30}
									max={60}
									step={30}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
								<p class="text-xs text-muted-foreground mt-1">30 FPS for smaller files, 60 FPS for smoother</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Timing Settings -->
				<AccordionItem value="timing">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Clock class="size-4" />
							<span>Timing</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="message-duration" class="text-sm">Message Duration: {messageDuration.toFixed(1)}s</Label>
								<Slider
									id="message-duration"
									type="single"
									bind:value={messageDuration}
									min={0.5}
									max={5}
									step={0.1}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
								<p class="text-xs text-muted-foreground mt-1">Time each message stays on screen</p>
							</div>
							<div>
								<Label for="transition-duration" class="text-sm">Transition Duration: {transitionDuration.toFixed(2)}s</Label>
								<Slider
									id="transition-duration"
									type="single"
									bind:value={transitionDuration}
									min={0.1}
									max={1}
									step={0.05}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
								<p class="text-xs text-muted-foreground mt-1">Animation speed between messages</p>
							</div>
							<div class="flex items-center justify-between">
								<Label for="enable-transitions" class="text-sm">Enable Transitions</Label>
								<Switch id="enable-transitions" bind:checked={enableTransitions} onCheckedChange={handleApplySettings} />
							</div>
							<Separator class="my-2" />
							<div class="bg-muted/50 rounded-lg p-3">
								<p class="text-xs text-muted-foreground mb-1">Estimated Video Length</p>
								<p class="text-lg font-bold">{((messages.length * messageDuration) + ((messages.length - 1) * transitionDuration)).toFixed(1)}s</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Export Format -->
				<AccordionItem value="video">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Film class="size-4" />
							<span>Export Settings</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="export-format" class="text-sm">Format</Label>
								<Select
									type="single"
									bind:value={exportFormat}
									items={exportFormatOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="export-format" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(exportFormat))}>
											{getOptionLabel(exportFormatOptions, exportFormat, 'Select format')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each exportFormatOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<p class="text-xs text-muted-foreground mt-1">Video file format</p>
							</div>
							<div>
								<Label for="quality" class="text-sm">Quality Preset</Label>
								<Select
									type="single"
									bind:value={quality}
									items={qualityOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="quality" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(quality))}>
											{getOptionLabel(qualityOptions, quality, 'Select quality')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each qualityOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<p class="text-xs text-muted-foreground mt-1">Higher quality = larger file size</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	</div>

	<!-- Generate Video Button (Fixed at Bottom) -->
	<div class="absolute bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm p-4 flex-shrink-0">
		<Button
			class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200"
			onclick={onGenerateVideo}
			disabled={isGenerating}
			size="lg"
		>
			{#if isGenerating}
				<div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
				<span>Generating Video...</span>
			{:else}
				<Film class="mr-2 size-5" />
				<span class="font-semibold">Generate Video</span>
			{/if}
		</Button>
	</div>
</div>
