<script lang="ts">
	import type { Character, Message, Connection } from '$lib/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Progress } from '$lib/components/ui/progress';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { analyzeMessageFlow } from '$lib/utils/messageFlow';

	interface Props {
		characters: Character[];
		messages: Message[];
		connections: Connection[];
		previewState: 'preview' | 'loading' | 'video';
		isGenerating?: boolean;
		customizeSettings?: {
			backgroundColor?: string;
			primaryColor?: string;
			textColor?: string;
			channelName?: string;
		};
	}

	let {
		characters,
		messages,
		connections,
		previewState,
		customizeSettings = {}
	}: Props = $props();

	const messageFlowInfo = $derived(analyzeMessageFlow(messages, connections));
	const backgroundColor = $derived(customizeSettings.backgroundColor || '#36393f');
	const primaryColor = $derived(customizeSettings.primaryColor || '#5865f2');
	const textColor = $derived(customizeSettings.textColor || '#dcddde');
	const channelName = $derived(customizeSettings.channelName || 'general');
</script>

<div class="relative">
	<!-- iPhone Frame -->
	<div class="w-80 h-[600px] bg-foreground rounded-[2.5rem] p-2 shadow-2xl">
		<!-- Screen -->
		<div class="w-full h-full bg-background rounded-[2rem] overflow-hidden relative">
			<!-- Status Bar -->
			<div class="bg-foreground h-6 flex items-center justify-between px-6 text-background text-xs">
				<span>9:41</span>
				<div class="flex items-center space-x-1">
					<div class="flex space-x-1">
						<div class="w-1 h-1 bg-background rounded-full"></div>
						<div class="w-1 h-1 bg-background rounded-full"></div>
						<div class="w-1 h-1 bg-background rounded-full opacity-30"></div>
					</div>
					<div class="w-6 h-3 border border-background rounded-sm">
						<div class="w-4 h-1.5 bg-background rounded-sm m-0.5"></div>
					</div>
				</div>
			</div>

			<!-- Content -->
			<div class="h-[calc(100%-24px)]">
				{#if previewState === 'preview' || previewState === 'video'}
					<!-- Discord Chat UI -->
					<div class="h-full flex flex-col" style="background-color: {backgroundColor}">
						<!-- Discord Header -->
						<div
							class="p-3 border-b flex items-center flex-shrink-0"
							style="background-color: {backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`}; border-bottom-color: {backgroundColor === '#36393f' ? '#202225' : `${backgroundColor}44`}"
						>
							<div
								class="w-6 h-6 rounded-full mr-3 flex items-center justify-center"
								style="background-color: {primaryColor}"
							>
								<span class="text-white text-xs">#</span>
							</div>
							<span class="text-sm" style="color: {textColor}">
								{channelName}
							</span>
						</div>

						<!-- Messages Area -->
						<ScrollArea class="flex-1 p-4">
							<div class="space-y-3">
								{#if messageFlowInfo.length === 0}
									<div class="text-center text-sm mt-8 space-y-2" style="color: {textColor}80">
										<div>Welcome to #{channelName}!</div>
										<div class="text-xs" style="color: {textColor}60">
											This is the start of your conversation.
										</div>
									</div>
								{:else}
									{#each messageFlowInfo as { message } (message.id)}
										{@const character = characters.find((c) => c.id === message.characterId)}
										{@const displayCharacter = character || {
											id: 'unassigned',
											username: 'Unknown',
											avatar: '',
											roleColor: '#99aab5'
										}}

										<div class="flex items-start space-x-3">
											<Avatar class="w-10 h-10 flex-shrink-0">
												<AvatarImage src={displayCharacter.avatar} alt={displayCharacter.username} />
												<AvatarFallback
													class="text-white text-xs font-medium"
													style="background-color: {displayCharacter.roleColor}"
												>
													{displayCharacter.username.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>

											<div class="flex-1 min-w-0">
												<div class="flex items-baseline space-x-2 mb-1">
													<span
														class="text-sm font-medium"
														style="color: {character ? displayCharacter.roleColor : '#99aab5'}; opacity: {character ? 1 : 0.7}"
													>
														{displayCharacter.username}
														{#if !character}(Unassigned){/if}
													</span>
													<span class="text-xs" style="color: {textColor}60">
														{new Date(message.timestamp).toLocaleTimeString([], {
															hour: '2-digit',
															minute: '2-digit'
														})}
													</span>
												</div>

												<div
													class="text-sm leading-relaxed break-words"
													style="color: {textColor}; opacity: {character ? 1 : 0.8}"
												>
													{message.text}
												</div>
											</div>
										</div>
									{/each}
								{/if}
							</div>
						</ScrollArea>

						<!-- Discord Input -->
						<div
							class="p-4 flex-shrink-0"
							style="background-color: {backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`}"
						>
							<div
								class="rounded-lg p-3"
								style="background-color: {backgroundColor === '#36393f' ? '#40444b' : `${backgroundColor}33`}"
							>
								<span class="text-sm" style="color: {textColor}60">
									Message #{channelName}
								</span>
							</div>
						</div>

						<!-- Video Overlay -->
						{#if previewState === 'video'}
							<div class="absolute inset-0 z-0 flex items-center justify-center">
								<div
									class="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-10"
									aria-hidden="true"
								></div>
								<div
									class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
									aria-hidden="true"
								>
									<div class="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-white ml-1"></div>
								</div>
							</div>
						{/if}
					</div>
				{:else if previewState === 'loading'}
					<!-- Loading State -->
					<div class="h-full flex items-center justify-center relative" style="background-color: {backgroundColor}">
						<div
							class="rounded-lg p-6 text-center max-w-xs"
							style="background-color: {backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`}"
						>
							<div
								class="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
								style="border-color: {primaryColor}40; border-top-color: transparent"
							></div>
							<p class="mb-2" style="color: {textColor}">Generating your video...</p>
							<Progress value={65} class="w-full h-2" />
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Home Indicator -->
		<div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-background rounded-full"></div>
	</div>
</div>
