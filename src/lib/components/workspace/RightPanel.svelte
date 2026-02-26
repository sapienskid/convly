<script lang="ts">
	import type {
		Character,
		Message,
		Connection,
		CustomizationSettings,
		CodecSetting,
		ChatPlatformSetting
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
		Clock,
		Layers,
		Film,
		Play,
		Pause,
		Music2,
		Download,
		X,
		ShieldAlert,
		Wrench
	} from 'lucide-svelte/icons';
	import { buildMessageAnimationTimeline } from '$lib/utils/animationTimeline';
	import {
		analyzeConversationQA,
		type ConversationFixAction
	} from '$lib/utils/conversationQA';

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
		onConversationFix: (action: ConversationFixAction) => number;
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
		onCustomizationApply,
		onConversationFix
	}: Props = $props();

	let channelName = $state(customizeSettings.channelName);
	let chatPlatform = $state<ChatPlatformSetting>(customizeSettings.chatPlatform ?? 'discord');
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
	let qaStatusMessage = $state<string | null>(null);

	const templateOptions: Array<{
		value: ChatPlatformSetting;
		label: string;
		description: string;
		gradient: string;
	}> = [
		{
			value: 'discord',
			label: 'Discord',
			description: 'Compact gamer-style channel feed',
			gradient: 'linear-gradient(135deg, #5865f2, #4f46e5)'
		},
		{
			value: 'whatsapp',
			label: 'WhatsApp',
			description: 'Conversational mobile chat style',
			gradient: 'linear-gradient(135deg, #25d366, #128c7e)'
		},
		{
			value: 'messenger',
			label: 'Messenger',
			description: 'Rounded social chat bubbles',
			gradient: 'linear-gradient(135deg, #00b2ff, #006aff)'
		},
		{
			value: 'telegram',
			label: 'Telegram',
			description: 'Clean channel timeline',
			gradient: 'linear-gradient(135deg, #2aabee, #229ed9)'
		}
	];

	const templateDefaults: Record<ChatPlatformSetting, string> = {
		discord: 'announcements',
		whatsapp: 'Team Chat',
		messenger: 'Inbox',
		telegram: 'Updates'
	};

	const templatePresets: Record<ChatPlatformSetting, Partial<CustomizationSettings>> = {
		discord: {
			backgroundColor: '#1f2933',
			textColor: '#f4f6f8',
			primaryColor: '#5865f2',
			fontFamily: 'Instrument Sans',
			fontSize: 16,
			fontWeight: 'normal',
			messageSpacing: 12,
			messagePadding: 16,
			showAvatars: true,
			showTimestamps: true
		},
		whatsapp: {
			backgroundColor: '#efeae2',
			textColor: '#111b21',
			primaryColor: '#25d366',
			fontFamily: 'Manrope',
			fontSize: 15,
			fontWeight: 'normal',
			messageSpacing: 10,
			messagePadding: 14,
			showAvatars: false,
			showTimestamps: true
		},
		messenger: {
			backgroundColor: '#f5f7fb',
			textColor: '#111827',
			primaryColor: '#0084ff',
			fontFamily: 'Manrope',
			fontSize: 15,
			fontWeight: 'normal',
			messageSpacing: 10,
			messagePadding: 14,
			showAvatars: true,
			showTimestamps: false
		},
		telegram: {
			backgroundColor: '#e8eef7',
			textColor: '#17212b',
			primaryColor: '#2aabee',
			fontFamily: 'Archivo',
			fontSize: 15,
			fontWeight: 'normal',
			messageSpacing: 11,
			messagePadding: 14,
			showAvatars: true,
			showTimestamps: true
		}
	};

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

	const activeTemplate = $derived(
		templateOptions.find((template) => template.value === chatPlatform) ?? templateOptions[0]
	);
	const qaReport = $derived(analyzeConversationQA(characters, messages, connections));

	const estimatedVideoLength = $derived.by(() => {
		return buildMessageAnimationTimeline(messages, connections, {
			messageDuration,
			transitionDuration,
			enableTransitions
		}).totalDuration;
	});

	$effect(() => {
		channelName = customizeSettings.channelName;
		chatPlatform = customizeSettings.chatPlatform ?? 'discord';
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

	const getOptionLabel = (options: SelectOption[], value: string, placeholder: string) => {
		const match = options.find((option) => option.value === value);
		return match ? match.label : placeholder;
	};

	const selectTriggerTextClass = (hasValue: boolean) =>
		hasValue ? 'line-clamp-1' : 'line-clamp-1 text-muted-foreground';

	function applyTemplate(platform: ChatPlatformSetting) {
		chatPlatform = platform;
		const normalizedChannelName = channelName.trim() || templateDefaults[platform];
		channelName = normalizedChannelName;
		onCustomizationApply({
			chatPlatform: platform,
			channelName: normalizedChannelName,
			backgroundImage: '',
			backgroundTheme: 'none',
			...templatePresets[platform]
		});
	}

	function applyChannelName() {
		const normalizedChannelName = channelName.trim() || templateDefaults[chatPlatform];
		channelName = normalizedChannelName;
		onCustomizationApply({ channelName: normalizedChannelName });
	}

	function handleApplySettings(overrides: Partial<CustomizationSettings>) {
		onCustomizationApply({ ...overrides });
	}

	function applyConversationFix(action: ConversationFixAction) {
		const fixedCount = onConversationFix(action);
		qaStatusMessage =
			fixedCount > 0
				? `Auto-fix updated ${fixedCount} issue(s).`
				: 'No changes were required.';
	}
</script>

<div class="flex h-full min-h-0 flex-col bg-gradient-to-b from-card to-card/50">
	<div class="border-b border-border bg-card/80 p-5 backdrop-blur-sm">
		<div class="mb-2 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
				style="background: {activeTemplate.gradient};"
			>
				<Layers class="h-5 w-5 text-white" />
			</div>
			<div>
				<h2 class="text-lg font-bold">Template Controls</h2>
				<p class="text-xs text-muted-foreground">Switch between chat app templates and export</p>
			</div>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="p-6 pb-8">
			<Accordion
				type="multiple"
				value={['templates', 'qa', 'timing', 'audio', 'video']}
				class="w-full space-y-2"
			>
				<AccordionItem value="templates">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<Layers class="size-4" />
							<span>Chat Templates</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-4 pt-2">
							<div>
								<Label for="channel-name" class="text-sm">Chat Title</Label>
								<Input
									id="channel-name"
									bind:value={channelName}
									class="mt-1.5"
									onblur={applyChannelName}
									placeholder={templateDefaults[chatPlatform]}
								/>
							</div>

							<div class="grid grid-cols-1 gap-2">
								{#each templateOptions as template}
									<button
										type="button"
										class="rounded-lg border p-3 text-left transition-all hover:border-primary/60 {chatPlatform === template.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-muted/20'}"
										onclick={() => applyTemplate(template.value)}
									>
										<div class="mb-2 h-2.5 w-full rounded-full" style="background: {template.gradient};"></div>
										<div class="flex items-center justify-between gap-2">
											<p class="text-sm font-semibold">{template.label}</p>
											{#if chatPlatform === template.value}
												<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Active</span>
											{/if}
										</div>
										<p class="mt-1 text-xs text-muted-foreground">{template.description}</p>
									</button>
								{/each}
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="qa">
					<AccordionTrigger>
						<div class="flex items-center gap-2">
							<ShieldAlert class="size-4" />
							<span>Conversation QA</span>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-3 pt-2">
							<div class="rounded-lg border border-border bg-muted/20 p-3">
								<div class="flex items-center justify-between">
									<p class="text-xs uppercase tracking-wide text-muted-foreground">Readiness Score</p>
									<p class="text-sm font-semibold">{qaReport.readinessScore}%</p>
								</div>
								<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
									<div
										class="h-full transition-all duration-200 {qaReport.readinessScore >= 80 ? 'bg-emerald-500' : qaReport.readinessScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}"
										style="width: {qaReport.readinessScore}%"
									></div>
								</div>
								<p class="mt-2 text-xs text-muted-foreground">
									{qaReport.errorCount} error(s), {qaReport.warningCount} warning(s)
								</p>
							</div>

							{#if qaStatusMessage}
								<p class="text-xs text-muted-foreground">{qaStatusMessage}</p>
							{/if}

							{#if qaReport.issues.length === 0}
								<div class="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-700">
									No QA issues detected. Conversation is export-ready.
								</div>
							{:else}
								<div class="space-y-2">
									{#each qaReport.issues as issue (issue.id)}
										<div class="rounded-lg border border-border bg-background p-3">
											<div class="flex items-start justify-between gap-2">
												<div class="min-w-0">
													<p class="text-sm font-semibold leading-tight">{issue.title}</p>
													<p class="mt-1 text-xs text-muted-foreground">{issue.description}</p>
												</div>
												<span
													class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {issue.severity === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-700'}"
												>
													{issue.severity}
												</span>
											</div>
											{#if issue.fixAction}
												<Button
													variant="outline"
													size="sm"
													class="mt-2"
													onclick={() => applyConversationFix(issue.fixAction!)}
												>
													<Wrench class="mr-2 size-3.5" />
													Auto-fix
												</Button>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
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
								<Label for="message-duration" class="text-sm">Message Duration: {messageDuration.toFixed(1)}s</Label>
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
								<Label for="transition-duration" class="text-sm">Transition Duration: {transitionDuration.toFixed(2)}s</Label>
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
								<Label for="animation-speed" class="text-sm">Animation Speed: {animationSpeed.toFixed(1)}x</Label>
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
								<p class="mt-1 line-clamp-1 text-xs text-muted-foreground">{musicTrackName}</p>
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
								<Label for="notification-sound-enabled" class="text-sm">Enable Notification Sound</Label>
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
										handleApplySettings({ resolution: value as CustomizationSettings['resolution'] });
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
							</div>

							<div>
								<Label for="export-format" class="text-sm">Container</Label>
								<Select
									type="single"
									bind:value={exportFormat}
									items={exportFormatOptions}
									onValueChange={(value) => {
										exportFormat = value as CustomizationSettings['exportFormat'];
										handleApplySettings({ exportFormat: value as CustomizationSettings['exportFormat'] });
									}}
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
								<Label for="quality" class="text-sm">Quality Preset</Label>
								<Select
									type="single"
									bind:value={quality}
									items={qualityOptions}
									onValueChange={(value) => {
										quality = value as CustomizationSettings['quality'];
										handleApplySettings({ quality: value as CustomizationSettings['quality'] });
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
										handleApplySettings({ codec: value as CustomizationSettings['codec'] });
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
						<Button variant="outline" class="w-full" onclick={() => onCancelExport?.()} size="sm">
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
