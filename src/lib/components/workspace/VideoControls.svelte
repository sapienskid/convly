<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Slider } from "$lib/components/ui/slider";
	import { Play, Pause, RotateCcw } from "@lucide/svelte";

	interface Props {
		isPlaying?: boolean;
		currentTime?: number;
		duration?: number;
		fps?: number;
		onPlayPause?: () => void;
		onRestart?: () => void;
		onSeek?: (time: number) => void;
	}

	let {
		isPlaying = false,
		currentTime = 0,
		duration = 100,
		fps = 30,
		onPlayPause = () => {},
		onRestart = () => {},
		onSeek = () => {},
	}: Props = $props();

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};
</script>

<div class="mt-4 flex gap-3 items-center rounded-xl border border-border bg-card p-3">
	<div class="flex w-full flex-col items-center">
		<div
			class="grid grid-cols-3 items-center text-[11px] font-medium text-muted-foreground"
		>
			<span class="text-left font-mono">{formatTime(currentTime)}</span>
			<span class="text-center tracking-wide">{fps} FPS</span>
			<span class="text-right font-mono">{formatTime(duration)}</span>
		</div>

		<Slider
			type="single"
			bind:value={currentTime}
			min={0}
			max={duration}
			step={0.1}
			class="mt-2 w-full"
			onValueCommit={(value) =>
				onSeek(Array.isArray(value) ? value[0] : value)}
		/>
	</div>

	<div class="mt-3 flex items-center justify-center gap-2">
		<Button
			variant="outline"
			size="icon"
			onclick={onRestart}
			class="h-9 w-9 rounded-xl"
			title="Restart"
		>
			<RotateCcw class="h-4 w-4" />
		</Button>

		<Button
			variant="outline"
			size="icon"
			onclick={onPlayPause}
			class="h-11 w-11 rounded-xl border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
			title={isPlaying ? "Pause" : "Play"}
		>
			{#if isPlaying}
				<Pause class="h-5 w-5" />
			{:else}
				<Play class="h-5 w-5 ml-0.5" />
			{/if}
		</Button>
	</div>
</div>
