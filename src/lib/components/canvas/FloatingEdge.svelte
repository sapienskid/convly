<script lang="ts">
	import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';

	type Props = EdgeProps;

	let { 
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		style,
		markerStart,
		markerEnd,
		data
	}: Props = $props();

	const [edgePath] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
			curvature: 0.3
		})
	);
</script>

<BaseEdge 
	{id}
	path={edgePath}
	{style}
	{markerStart}
	{markerEnd}
/>
