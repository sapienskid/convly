<script lang="ts">
	import type { Character, Message, Connection } from '$lib/types';
	import PhonePreview from './PhonePreview.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
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
		Volume2,
		Download,
		Layers,
		Users
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
	let serverName = $state(customizeSettings.serverName || 'My Discord Server');
	let channelName = $state(customizeSettings.channelName || 'general');
	let chatTopic = $state(customizeSettings.chatTopic || 'General Chat');

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
		{ value: '1440p', label: '1440p (2560x1440)' },
		{ value: '4k', label: '4K (3840x2160)' }
	];

	const qualityOptions: SelectOption[] = [
		{ value: 'low', label: 'Low (Faster)' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'ultra', label: 'Ultra (Slower)' }
	];

	const animationStyleOptions: SelectOption[] = [
		{ value: 'smooth', label: 'Smooth' },
		{ value: 'bounce', label: 'Bounce' },
		{ value: 'elastic', label: 'Elastic' },
		{ value: 'linear', label: 'Linear' }
	];

	const exportFormatOptions: SelectOption[] = [
		{ value: 'mp4', label: 'MP4' },
		{ value: 'webm', label: 'WebM' },
		{ value: 'mov', label: 'MOV' },
		{ value: 'gif', label: 'GIF' }
	];

	const codecOptions: SelectOption[] = [
		{ value: 'h264', label: 'H.264 (Best compatibility)' },
		{ value: 'h265', label: 'H.265 (Smaller file size)' },
		{ value: 'vp9', label: 'VP9 (WebM)' },
		{ value: 'av1', label: 'AV1 (Newest)' }
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

	function handleApplySettings() {
		onCustomizationApply({
			serverName,
			channelName,
			chatTopic,
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
			enableCompression
		});
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
	<div class="flex-1 overflow-hidden">
		<ScrollArea class="h-full">
			<div class="p-6">
			<Accordion type="multiple" class="w-full space-y-2">
				<!-- Chat Room Settings -->
				<AccordionItem value="chat-room">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<MessageSquare class="size-4" />
							<span>Chat Room</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="server-name" class="text-sm">Server Name</Label>
								<Input id="server-name" bind:value={serverName} class="mt-1.5" onblur={handleApplySettings} />
							</div>
							<div>
								<Label for="channel-name" class="text-sm">Channel Name</Label>
								<Input id="channel-name" bind:value={channelName} class="mt-1.5" onblur={handleApplySettings} />
							</div>
							<div>
								<Label for="chat-topic" class="text-sm">Chat Topic</Label>
								<Input id="chat-topic" bind:value={chatTopic} class="mt-1.5" onblur={handleApplySettings} />
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
								<Label for="font-size" class="text-sm">Font Size: {fontSize}px</Label>
								<Slider
									id="font-size"
									type="single"
									bind:value={fontSize}
									min={12}
									max={24}
									step={1}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
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
							<div>
								<Label for="message-spacing" class="text-sm">Message Spacing: {messageSpacing}px</Label>
								<Slider
									id="message-spacing"
									type="single"
									bind:value={messageSpacing}
									min={4}
									max={32}
									step={2}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
							</div>
							<div>
								<Label for="message-padding" class="text-sm">Message Padding: {messagePadding}px</Label>
								<Slider
									id="message-padding"
									type="single"
									bind:value={messagePadding}
									min={8}
									max={32}
									step={2}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
							</div>
							<div>
								<Label for="message-alignment" class="text-sm">Message Alignment</Label>
								<Select
									type="single"
									bind:value={messageAlignment}
									items={messageAlignmentOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="message-alignment" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(messageAlignment))}>
											{getOptionLabel(messageAlignmentOptions, messageAlignment, 'Select alignment')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each messageAlignmentOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
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
							<span>Video Quality</span>
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
							</div>
							<div>
								<Label for="fps" class="text-sm">Frame Rate: {fps} FPS</Label>
								<Slider
									id="fps"
									type="single"
									bind:value={fps}
									min={24}
									max={60}
									step={6}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
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
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Animation -->
				<AccordionItem value="animation">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Film class="size-4" />
							<span>Animation</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="animation-speed" class="text-sm">Animation Speed: {animationSpeed}x</Label>
								<Slider
									id="animation-speed"
									type="single"
									bind:value={animationSpeed}
									min={0.5}
									max={2}
									step={0.1}
									class="mt-2"
									onValueCommit={handleApplySettings}
								/>
							</div>
							<div>
								<Label for="animation-style" class="text-sm">Animation Style</Label>
								<Select
									type="single"
									bind:value={animationStyle}
									items={animationStyleOptions}
									onValueChange={handleApplySettings}
								>
									<SelectTrigger id="animation-style" class="mt-1.5">
										<span data-slot="select-value" class={selectTriggerTextClass(Boolean(animationStyle))}>
											{getOptionLabel(animationStyleOptions, animationStyle, 'Select style')}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each animationStyleOptions as option}
											<SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div class="flex items-center justify-between">
								<Label for="enable-transitions" class="text-sm">Enable Transitions</Label>
								<Switch id="enable-transitions" bind:checked={enableTransitions} onCheckedChange={handleApplySettings} />
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Audio -->
				<AccordionItem value="audio">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Volume2 class="size-4" />
							<span>Audio</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div class="flex items-center justify-between">
								<Label for="enable-audio" class="text-sm">Enable Audio</Label>
								<Switch id="enable-audio" bind:checked={enableAudio} onCheckedChange={handleApplySettings} />
							</div>
							<div>
								<Label for="bg-music-volume" class="text-sm">Background Music: {backgroundMusicVolume}%</Label>
								<Slider
									id="bg-music-volume"
									type="single"
									bind:value={backgroundMusicVolume}
									min={0}
									max={100}
									step={5}
									class="mt-2"
									disabled={!enableAudio}
									onValueCommit={handleApplySettings}
								/>
							</div>
							<div>
								<Label for="sfx-volume" class="text-sm">Sound Effects: {soundEffectsVolume}%</Label>
								<Slider
									id="sfx-volume"
									type="single"
									bind:value={soundEffectsVolume}
									min={0}
									max={100}
									step={5}
									class="mt-2"
									disabled={!enableAudio}
									onValueCommit={handleApplySettings}
								/>
							</div>
							<Button variant="outline" size="sm" class="w-full" disabled={!enableAudio}>
								Upload Background Music
							</Button>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Export Format -->
				<AccordionItem value="export-format">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Download class="size-4" />
							<span>Export Format</span>
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
							</div>
							<div>
								<Label for="codec" class="text-sm">Codec</Label>
								<Select
									type="single"
									bind:value={codec}
									items={codecOptions}
									onValueChange={handleApplySettings}
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
								<Label for="enable-compression" class="text-sm">Enable Compression</Label>
								<Switch id="enable-compression" bind:checked={enableCompression} onCheckedChange={handleApplySettings} />
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<!-- Templates -->
				<AccordionItem value="templates">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Layers class="size-4" />
							<span>Templates</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-3 pt-2">
							<p class="text-xs text-muted-foreground">Choose a template to get started quickly</p>
							<div class="grid grid-cols-2 gap-2">
								<Button variant="outline" size="sm" class="h-20 flex-col gap-1">
									<MessageSquare class="size-4" />
									<span class="text-xs">Discord</span>
								</Button>
								<Button variant="outline" size="sm" class="h-20 flex-col gap-1">
									<MessageSquare class="size-4" />
									<span class="text-xs">Slack</span>
								</Button>
								<Button variant="outline" size="sm" class="h-20 flex-col gap-1">
									<MessageSquare class="size-4" />
									<span class="text-xs">Twitter</span>
								</Button>
								<Button variant="outline" size="sm" class="h-20 flex-col gap-1">
									<MessageSquare class="size-4" />
									<span class="text-xs">Custom</span>
								</Button>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			</div>
		</ScrollArea>
	</div>

	<!-- Generate Button -->
	<div class="border-t border-border bg-card/80 backdrop-blur-sm p-6 flex-shrink-0">
		<Button
			class="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
			onclick={onGenerateVideo}
			disabled={isGenerating}
			size="lg"
		>
			{#if isGenerating}
				<div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
				<span>Generating...</span>
			{:else}
				<Download class="mr-2 size-5" />
				<span class="font-semibold">Save Project</span>
			{/if}
		</Button>
	</div>
</div>
