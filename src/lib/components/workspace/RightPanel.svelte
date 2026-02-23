<script lang="ts">
	import type {
		Character,
		Message,
		Connection,
		CustomizationSettings,
		CodecSetting
	} from '$lib/types';
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
	import { Type, Layout, Video, Film, Clock, Palette } from 'lucide-svelte/icons';

	type SelectOption = { value: string; label: string };

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		previewState: 'preview' | 'loading' | 'video';
		isGenerating: boolean;
		customizeSettings: CustomizationSettings;
		onGenerateVideo: () => void;
		onCustomizationApply: (settings: Partial<CustomizationSettings>) => void;
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
		exportFormat = customizeSettings.exportFormat;
		codec = customizeSettings.codec;
		enableCompression = customizeSettings.enableCompression;
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
		if (messages.length === 0) return 0;
		const transitionCount = Math.max(messages.length - 1, 0);
		const transitionTime = enableTransitions ? transitionCount * transitionDuration : 0;
		return messages.length * messageDuration + transitionTime;
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
				value={['appearance', 'typography', 'layout', 'timing', 'video-quality']}
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
										placeholder="#313338"
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
										placeholder="#dcddde"
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
										placeholder="#5865f2"
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
									onValueChange={(value) => {
										resolution = value as CustomizationSettings['resolution'];
										handleApplySettings({
											resolution: value as CustomizationSettings['resolution']
										});
									}}
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
									onValueChange={(value) => {
										const nextFps = value as 30 | 60;
										fps = nextFps;
										handleApplySettings({ fps: nextFps });
									}}
								/>
								<p class="mt-1 text-xs text-muted-foreground">30 FPS for smaller files, 60 FPS for smoother motion</p>
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
		<Button
			class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl"
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
