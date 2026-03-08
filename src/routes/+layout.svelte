<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Convly Studio</title>
	<meta
		name="description"
		content="Design, animate, and export cinematic conversation videos in Convly Studio."
	/>
	<meta name="theme-color" content="#ff6f3b" />
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@500;600;700&family=Noto+Color+Emoji&display=swap"
	/>
</svelte:head>

{@render children?.()}
