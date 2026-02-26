<script lang="ts">
	import type {
		Character,
		Message,
		Connection,
		CustomizationSettings,
		CodecSetting
	} from '$lib/types';
	import type { ExportProgress } from '$lib/utils/videoExport';
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
		Type,
		Layout,
		Film,
		Clock,
		Palette,
		Play,
		Pause,
		Music2,
		Download,
		X,
		Loader2
	} from 'lucide-svelte/icons';
	import { buildMessageAnimationTimeline } from '$lib/utils/animationTimeline';

	type SelectOption = { value: string; label: string };

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		previewState: 'preview' | 'loading' | 'video';
		isGenerating: boolean;
		customizeSettings: CustomizationSettings;
		musicTrackName: string;
		hasMusicTrack: boolean;
		isMusicPlaying: boolean;
		isExporting?: boolean;
		exportProgress?: ExportProgress | null;
		onPreviewAnimation: () => void;
		onMusicUpload: (file: File) => void;
		onMusicToggle: () => void;
		onExportVideo: () => void;
		onCancelExport?: () => void;
		onCustomizationApply: (settings: Partial<CustomizationSettings>) => void;
	}

	let {
		characters,
		messages,
		connections,
		previewState,
		isGenerating,
		customizeSettings,
		musicTrackName,
		hasMusicTrack,
		isMusicPlaying,
		isExporting = false,
		exportProgress = null,
		onPreviewAnimation,
		onMusicUpload,
		onMusicToggle,
		onExportVideo,
		onCancelExport,
		onCustomizationApply
	}: Props = $props();

	let channelName = $state(customizeSettings.channelName);
	let backgroundColor = $state(customizeSettings.backgroundColor);
	let textColor = $state(customizeSettings.textColor);
	let primaryColor = $state(customizeSettings.primaryColor);
	let fontFamily = $state(customizeSettings.fontFamily);
	let fontSize = $state(customizeSettings.fontSize);
	let fontWeight = $state(customizeSettings.fontWeight);
	let messageSpacing = $state(customizeSettings.messageSpacing);
	let messagePadding = $state(customizeSettings.messagePadding);
	let showAvatars = $state(customizeSettings.showAvatars);
	let showTimestamps = $state(customizeSettings.showTimestamps);
	let resolution = $state(customizeSettings.resolution);
	let fps = $state(customizeSettings.fps);
	let quality = $state(customizeSettings.quality);
	let messageDuration = $state(customizeSettings.messageDuration);
	let transitionDuration = $state(customizeSettings.transitionDuration);
	let animationSpeed = $state(customizeSettings.animationSpeed);
	let enableTransitions = $state(customizeSettings.enableTransitions);
	let musicEnabled = $state(customizeSettings.musicEnabled);
	let musicVolume = $state(customizeSettings.musicVolume);
	let notificationSoundEnabled = $state(customizeSettings.notificationSoundEnabled);
	let exportFormat = $state(customizeSettings.exportFormat);
	let codec = $state(customizeSettings.codec);
	let enableCompression = $state(customizeSettings.enableCompression);

	$effect(() => {
		channelName = customizeSettings.channelName;
		backgroundColor = customizeSettings.backgroundColor;
		textColor = customizeSettings.textColor;
		primaryColor = customizeSettings.primaryColor;
		fontFamily = customizeSettings.fontFamily;
		fontSize = customizeSettings.fontSize;
		fontWeight = customizeSettings.fontWeight;
		messageSpacing = customizeSettings.messageSpacing;
		messagePadding = customizeSettings.messagePadding;
		showAvatars = customizeSettings.showAvatars;
		showTimestamps = customizeSettings.showTimestamps;
		resolution = customizeSettings.resolution;
		fps = customizeSettings.fps;
		quality = customizeSettings.quality;
		messageDuration = customizeSettings.messageDuration;
		transitionDuration = customizeSettings.transitionDuration;
		animationSpeed = customizeSettings.animationSpeed;
		enableTransitions = customizeSettings.enableTransitions;
		musicEnabled = customizeSettings.musicEnabled;
		musicVolume = customizeSettings.musicVolume;
		notificationSoundEnabled = customizeSettings.notificationSoundEnabled;
		exportFormat = customizeSettings.exportFormat;
		codec = customizeSettings.codec;
		enableCompression = customizeSettings.enableCompression;
	});

	const fontFamilyOptions: SelectOption[] = [
		{ value: 'Instrument Sans', label: 'Instrument Sans' },
		{ value: 'Bricolage Grotesque', label: 'Bricolage Grotesque' },
		{ value: 'Manrope', label: 'Manrope' },
		{ value: 'Archivo', label: 'Archivo' },
		{ value: 'JetBrains Mono', label: 'JetBrains Mono' }
	];

	const fontWeightOptions: SelectOption[] = [
		{ value: 'light', label: 'Light (300)' },
		{ value: 'normal', label: 'Normal (400)' },
		{ value: 'medium', label: 'Medium (500)' },
		{ value: 'semibold', label: 'Semibold (600)' },
		{ value: 'bold', label: 'Bold (700)' }
	];

	const resolutionOptions: SelectOption[] = [
		{ value: 'vertical-1080x1920', label: 'Vertical (1080x1920)' }
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

	const codecOptions: SelectOption[] = [
		{ value: 'h264', label: 'H.264' },
		{ value: 'h265', label: 'H.265 (HEVC)' },
		{ value: 'vp9', label: 'VP9' }
	];

	const getOptionLabel = (options: SelectOption[], value: string, placeholder: string) => {
		const match = options.find((option) => option.value === value);
		return match ? match.label : placeholder;
	};

	const selectTriggerTextClass = (hasValue: boolean) =>
		hasValue ? 'line-clamp-1' : 'line-clamp-1 text-muted-foreground';

	const estimatedVideoLength = $derived.by(() => {
		return buildMessageAnimationTimeline(messages, connections, {
			messageDuration,
			transitionDuration,
			enableTransitions
		}).totalDuration;
	});

	function handleApplySettings(overrides: Partial<CustomizationSettings> = {}) {
		onCustomizationApply({
			channelName,
			backgroundColor,
			textColor,
			primaryColor,
			backgroundImage: '',
			backgroundTheme: 'none',
			fontFamily,
			fontSize,
			fontWeight,
			messageSpacing,
			messagePadding,
			showAvatars,
			showTimestamps,
			resolution,
			fps,
			quality,
			messageDuration,
			transitionDuration,
			animationSpeed,
			enableTransitions,
			musicEnabled,
			musicVolume,
			notificationSoundEnabled,
			exportFormat,
			codec: codec as CodecSetting,
			enableCompression,
			...overrides
		});
	}
</script>

<div class="flex h-full min-h-0 flex-col bg-gradient-to-b from-card to-card/50">
	<div class="border-b border-border bg-card/80 p-5 backdrop-blur-sm">
		<div class="mb-2 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
				style="background: linear-gradient(135deg, {primaryColor}, {textColor}aa);"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 text-white"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
					/>
				</svg>
			</div>
			<div>
				<h2 class="text-lg font-bold">Customization</h2>
				<p class="text-xs text-muted-foreground">Fine-tune your video</p>
			</div>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="p-6 pb-8">
			<Accordion
				type="multiple"
				value={['appearance', 'typography', 'layout', 'timing', 'audio', 'video']}
				class="w-full space-y-2"
			>
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
								<Input
									id="channel-name"
									bind:value={channelName}
									class="mt-1.5"
									onblur={() => handleApplySettings({ channelName })}
									placeholder="general"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Appears in the chat header</p>
							</div>

							<div class="grid grid-cols-3 gap-2">
								<div class="col-span-1">
									<Label for="background-color" class="text-sm">Surface</Label>
									<Input
										id="background-color"
										type="color"
										bind:value={backgroundColor}
										class="mt-1.5 h-10 p-1"
										onchange={() => handleApplySettings({ backgroundColor })}
									/>
								</div>
								<div class="col-span-2">
									<Label for="background-color-text" class="text-sm">Hex</Label>
									<Input
										id="background-color-text"
										bind:value={backgroundColor}
										class="mt-1.5"
										onblur={() => handleApplySettings({ backgroundColor })}
										placeholder="#1f2933"
									/>
								</div>
							</div>

							<div class="grid grid-cols-3 gap-2">
								<div class="col-span-1">
									<Label for="text-color" class="text-sm">Text</Label>
									<Input
										id="text-color"
										type="color"
										bind:value={textColor}
										class="mt-1.5 h-10 p-1"
										onchange={() => handleApplySettings({ textColor })}
									/>
								</div>
								<div class="col-span-2">
									<Label for="text-color-text" class="text-sm">Hex</Label>
									<Input
										id="text-color-text"
										bind:value={textColor}
										class="mt-1.5"
										onblur={() => handleApplySettings({ textColor })}
										placeholder="#f4f6f8"
									/>
								</div>
							</div>

							<div class="grid grid-cols-3 gap-2">
								<div class="col-span-1">
									<Label for="primary-color" class="text-sm">Accent</Label>
									<Input
										id="primary-color"
										type="color"
										bind:value={primaryColor}
										class="mt-1.5 h-10 p-1"
										onchange={() => handleApplySettings({ primaryColor })}
									/>
								</div>
								<div class="col-span-2">
									<Label for="primary-color-text" class="text-sm">Hex</Label>
									<Input
										id="primary-color-text"
										bind:value={primaryColor}
										class="mt-1.5"
										onblur={() => handleApplySettings({ primaryColor })}
										placeholder="#ff6f3b"
									/>
								</div>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

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
									onValueChange={(value) => {
										fontFamily = value;
										handleApplySettings({ fontFamily: value });
									}}
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
								<Label for="font-size" class="text-sm">Font Size: {fontSize}px</Label>
								<Slider
									id="font-size"
									type="single"
									bind:value={fontSize}
									min={12}
									max={24}
									step={1}
									class="mt-2"
									onValueChange={(value) => {
										fontSize = value;
										handleApplySettings({ fontSize: value });
									}}
								/>
							</div>

							<div>
								<Label for="font-weight" class="text-sm">Font Weight</Label>
								<Select
									type="single"
									bind:value={fontWeight}
									items={fontWeightOptions}
									onValueChange={(value) => {
										fontWeight = value as CustomizationSettings['fontWeight'];
										handleApplySettings({
											fontWeight: value as CustomizationSettings['fontWeight']
										});
									}}
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

				<AccordionItem value="layout">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Layout class="size-4" />
							<span>Layout</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="message-spacing" class="text-sm">Message Spacing: {messageSpacing}px</Label>
								<Slider
									id="message-spacing"
									type="single"
									bind:value={messageSpacing}
									min={4}
									max={32}
									step={1}
									class="mt-2"
									onValueChange={(value) => {
										messageSpacing = value;
										handleApplySettings({ messageSpacing: value });
									}}
								/>
							</div>

							<div>
								<Label for="message-padding" class="text-sm">Message Padding: {messagePadding}px</Label>
								<Slider
									id="message-padding"
									type="single"
									bind:value={messagePadding}
									min={4}
									max={32}
									step={1}
									class="mt-2"
									onValueChange={(value) => {
										messagePadding = value;
										handleApplySettings({ messagePadding: value });
									}}
								/>
							</div>

							<div class="flex items-center justify-between">
								<Label for="show-avatars" class="text-sm">Show Avatars</Label>
								<Switch
									id="show-avatars"
									bind:checked={showAvatars}
									onCheckedChange={(checked) => {
										showAvatars = checked;
										handleApplySettings({ showAvatars: checked });
									}}
								/>
							</div>

							<div class="flex items-center justify-between">
								<Label for="show-timestamps" class="text-sm">Show Timestamps</Label>
								<Switch
									id="show-timestamps"
									bind:checked={showTimestamps}
									onCheckedChange={(checked) => {
										showTimestamps = checked;
										handleApplySettings({ showTimestamps: checked });
									}}
								/>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

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
								<Label for="message-duration" class="text-sm"
									>Message Duration: {messageDuration.toFixed(1)}s</Label
								>
								<Slider
									id="message-duration"
									type="single"
									bind:value={messageDuration}
									min={0.5}
									max={5}
									step={0.1}
									class="mt-2"
									onValueChange={(value) => {
										messageDuration = value;
										handleApplySettings({ messageDuration: value });
									}}
								/>
							</div>

							<div>
								<Label for="transition-duration" class="text-sm"
									>Transition Duration: {transitionDuration.toFixed(2)}s</Label
								>
								<Slider
									id="transition-duration"
									type="single"
									bind:value={transitionDuration}
									min={0.1}
									max={1}
									step={0.05}
									class="mt-2"
									onValueChange={(value) => {
										transitionDuration = value;
										handleApplySettings({ transitionDuration: value });
									}}
								/>
							</div>

							<div>
								<Label for="animation-speed" class="text-sm"
									>Animation Speed: {animationSpeed.toFixed(1)}x</Label
								>
								<Slider
									id="animation-speed"
									type="single"
									bind:value={animationSpeed}
									min={0.5}
									max={2}
									step={0.1}
									class="mt-2"
									onValueChange={(value) => {
										animationSpeed = value;
										handleApplySettings({ animationSpeed: value });
									}}
								/>
							</div>

							<div class="flex items-center justify-between">
								<Label for="enable-transitions" class="text-sm">Enable Transitions</Label>
								<Switch
									id="enable-transitions"
									bind:checked={enableTransitions}
									onCheckedChange={(checked) => {
										enableTransitions = checked;
										handleApplySettings({ enableTransitions: checked });
									}}
								/>
							</div>

							<Separator class="my-2" />

							<div class="rounded-lg bg-muted/50 p-3">
								<p class="mb-1 text-xs text-muted-foreground">Estimated Video Length</p>
								<p class="text-lg font-bold">{estimatedVideoLength.toFixed(1)}s</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="audio">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Music2 class="size-4" />
							<span>Audio</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="music-upload" class="text-sm">Background Music</Label>
								<Input
									id="music-upload"
									type="file"
									accept="audio/*"
									class="mt-1.5"
									onchange={(event) => {
										const file = (event.currentTarget as HTMLInputElement).files?.[0];
										if (file) {
											onMusicUpload(file);
										}
									}}
								/>
								<p class="mt-1 text-xs text-muted-foreground line-clamp-1">{musicTrackName}</p>
							</div>

							<div class="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={onMusicToggle}
									disabled={!hasMusicTrack}
									class="w-full"
								>
									{#if isMusicPlaying}
										<Pause class="mr-2 size-4" />
										Pause Music
									{:else}
										<Play class="mr-2 size-4" />
										Play Music
									{/if}
								</Button>
							</div>

							<div>
								<Label for="music-volume" class="text-sm">Music Volume: {Math.round(musicVolume * 100)}%</Label>
								<Slider
									id="music-volume"
									type="single"
									bind:value={musicVolume}
									min={0}
									max={1}
									step={0.05}
									class="mt-2"
									onValueChange={(value) => {
										musicVolume = value;
										handleApplySettings({ musicVolume: value });
									}}
								/>
							</div>

							<div class="flex items-center justify-between">
								<Label for="music-enabled" class="text-sm">Enable Music in Preview</Label>
								<Switch
									id="music-enabled"
									bind:checked={musicEnabled}
									onCheckedChange={(checked) => {
										musicEnabled = checked;
										handleApplySettings({ musicEnabled: checked });
									}}
								/>
							</div>

							<div class="flex items-center justify-between">
								<Label for="notification-sound-enabled" class="text-sm"
									>Enable Notification Sound</Label
								>
								<Switch
									id="notification-sound-enabled"
									bind:checked={notificationSoundEnabled}
									onCheckedChange={(checked) => {
										notificationSoundEnabled = checked;
										handleApplySettings({ notificationSoundEnabled: checked });
									}}
								/>
							</div>
							</div>
						</AccordionContent>
					</AccordionItem>

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
								<Label for="resolution" class="text-sm">Format</Label>
								<Select
									type="single"
									bind:value={resolution}
									items={resolutionOptions}
									onValueChange={(value) => {
										resolution = value as CustomizationSettings['resolution'];
										handleApplySettings({
											resolution: value as CustomizationSettings['resolution']
										});
									}}
								>
									<SelectTrigger id="resolution" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(resolution))}>
											{getOptionLabel(resolutionOptions, resolution, 'Select format')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each resolutionOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label for="fps" class="text-sm">Frame Rate: {fps} FPS</Label>
								<Slider
									id="fps"
									type="single"
									bind:value={fps}
									min={24}
									max={60}
									step={1}
									class="mt-2"
									onValueChange={(value) => {
										const nextFps = Math.round(value);
										fps = nextFps;
										handleApplySettings({ fps: nextFps });
									}}
								/>
								<p class="mt-1 text-xs text-muted-foreground">24-60 FPS export frame rate</p>
							</div>

							<div>
								<Label for="export-format" class="text-sm">Container</Label>
								<Select
									type="single"
									bind:value={exportFormat}
									items={exportFormatOptions}
									onValueChange={(value) => {
										exportFormat = value as CustomizationSettings['exportFormat'];
										handleApplySettings({
											exportFormat: value as CustomizationSettings['exportFormat']
										});
									}}
								>
									<SelectTrigger id="export-format" class="mt-1.5">
										<span
											data-slot="select-value"
											class={selectTriggerTextClass(Boolean(exportFormat))}
										>
											{getOptionLabel(exportFormatOptions, exportFormat, 'Select format')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each exportFormatOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label for="quality" class="text-sm">Quality Preset</Label>
								<Select
									type="single"
									bind:value={quality}
									items={qualityOptions}
									onValueChange={(value) => {
										quality = value as CustomizationSettings['quality'];
										handleApplySettings({
											quality: value as CustomizationSettings['quality']
										});
									}}
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
							</div>

							<div>
								<Label for="codec" class="text-sm">Codec</Label>
								<Select
									type="single"
									bind:value={codec}
									items={codecOptions}
									onValueChange={(value) => {
										codec = value as CustomizationSettings['codec'];
										handleApplySettings({
											codec: value as CustomizationSettings['codec']
										});
									}}
								>
									<SelectTrigger id="codec" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(codec))}>
											{getOptionLabel(codecOptions, codec, 'Select codec')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each codecOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>

							<div class="flex items-center justify-between">
								<Label for="compression" class="text-sm">Enable Compression</Label>
								<Switch
									id="compression"
									bind:checked={enableCompression}
									onCheckedChange={(checked) => {
										enableCompression = checked;
										handleApplySettings({ enableCompression: checked });
									}}
								/>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	</div>

	<div class="flex-shrink-0 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
		<div class="grid grid-cols-2 gap-2">
			<Button
				variant="outline"
				class="w-full"
				onclick={onPreviewAnimation}
				disabled={isGenerating || isExporting || messages.length === 0}
				size="lg"
			>
				<Play class="mr-2 size-4" />
				<span class="font-semibold">{previewState === 'video' ? 'Replay' : 'Preview'}</span>
			</Button>

			{#if isExporting && exportProgress}
				<div class="w-full space-y-3">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium text-muted-foreground">
							{#if exportProgress.phase === 'initializing'}
								Initializing...
							{:else if exportProgress.phase === 'rendering'}
								Rendering frames...
							{:else if exportProgress.phase === 'finalizing'}
								Finalizing...
							{:else if exportProgress.phase === 'complete'}
								Complete!
							{:else}
								Exporting...
							{/if}
						</span>
						<span class="font-semibold">{exportProgress.percent}%</span>
					</div>
					
					<div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
						<div
							class="h-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-300"
							style="width: {exportProgress.percent}%"
						></div>
					</div>

					{#if exportProgress.phase !== 'complete'}
						<Button
							variant="outline"
							class="w-full"
							onclick={() => onCancelExport?.()}
							size="sm"
						>
							<X class="mr-2 size-4" />
							Cancel Export
						</Button>
					{/if}
				</div>
			{:else}
				<Button
					class="w-full bg-gradient-to-r from-orange-500 to-teal-500 text-white shadow-lg transition-all duration-200 hover:from-orange-600 hover:to-teal-600 hover:shadow-xl"
					onclick={onExportVideo}
					disabled={isGenerating || messages.length === 0}
					size="lg"
				>
					<Download class="mr-2 size-5" />
					<span class="font-semibold">Export Video</span>
				</Button>
			{/if}
		</div>
	</div>
</div>
