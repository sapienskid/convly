<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { Play, Pause, RotateCcw, Download } from '@lucide/svelte';

	interface Props {
		isPlaying?: boolean;
		currentTime?: number;
		duration?: number;
		fps?: number;
		onPlayPause?: () => void;
		onRestart?: () => void;
		onDownload?: () => void;
		onSeek?: (time: number) => void;
	}

	let {
		isPlaying = false,
		currentTime = 0,
		duration = 100,
		fps = 30,
		onPlayPause = () => {},
		onRestart = () => {},
		onDownload = () => {},
		onSeek = () => {}
	}: Props = $props();

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};
</script>

<div class="mt-4 space-y-3 bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border">
	<div class="flex items-center justify-between text-xs text-muted-foreground font-mono">
		<span>{formatTime(currentTime)}</span>
		<div class="flex items-center gap-2">
			<span>{fps} FPS</span>
			<span>{formatTime(duration)}</span>
		</div>
	</div>
	
	<Slider
		type="single"
		bind:value={currentTime}
		min={0}
		max={duration}
		step={0.1}
		class="w-full"
		onValueCommit={(value) => onSeek(Array.isArray(value) ? value[0] : value)}
	/>
	
	<div class="flex items-center justify-center gap-2">
		<Button
			variant="outline"
			size="icon"
			onclick={onRestart}
			class="h-9 w-9"
			title="Restart"
		>
			<RotateCcw class="h-4 w-4" />
		</Button>
		
		<Button
			variant="default"
			size="icon"
			onclick={onPlayPause}
			class="h-10 w-10"
			title={isPlaying ? 'Pause' : 'Play'}
		>
			{#if isPlaying}
				<Pause class="h-5 w-5" />
			{:else}
				<Play class="h-5 w-5 ml-0.5" />
			{/if}
		</Button>
		
		<Button
			variant="outline"
			size="icon"
			onclick={onDownload}
			class="h-9 w-9"
			title="Download"
		>
			<Download class="h-4 w-4" />
		</Button>
	</div>
</div>
