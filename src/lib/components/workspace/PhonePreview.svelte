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
						<!-- Discord Mobile Header -->
						<div
							class="px-3 py-2 border-b flex items-center justify-between flex-shrink-0 shadow-sm"
							style="background-color: {backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`}; border-bottom-color: {backgroundColor === '#36393f' ? '#202225' : `${backgroundColor}44`}"
						>
							<div class="flex items-center flex-1 min-w-0">
								<!-- Channel Icon & Name -->
								<div class="flex items-center gap-2 flex-1 min-w-0">
									<div
										class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
										style="background-color: {backgroundColor === '#36393f' ? '#42464d' : `${backgroundColor}88`}"
									>
										<span class="text-white text-xs font-semibold">#</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-sm font-semibold truncate" style="color: {textColor}">
											{channelName}
										</div>
									</div>
								</div>
								<!-- Right Icons -->
								<div class="flex items-center gap-4 ml-2">
									<!-- Voice Call -->
									<svg class="w-5 h-5" style="color: {textColor}cc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
									</svg>
									<!-- Video Call -->
									<svg class="w-5 h-5" style="color: {textColor}cc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
									</svg>
									<!-- More Options -->
									<svg class="w-5 h-5" style="color: {textColor}cc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
									</svg>
								</div>
							</div>
						</div>

						<!-- Messages Area -->
						<ScrollArea class="flex-1 px-3 py-4">
							<div class="space-y-4">
								{#if messageFlowInfo.length === 0}
									<!-- Welcome Message -->
									<div class="flex flex-col items-center justify-center py-8 text-center">
										<div 
											class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
											style="background-color: {backgroundColor === '#36393f' ? '#42464d' : `${backgroundColor}88`}"
										>
											<span class="text-2xl font-bold" style="color: {textColor}88">#</span>
										</div>
										<div class="text-base font-semibold mb-1" style="color: {textColor}">
											Welcome to #{channelName}!
										</div>
										<div class="text-xs px-6" style="color: {textColor}66">
											This is the beginning of the #{channelName} channel.
										</div>
									</div>
								{:else}
									{#each messageFlowInfo as { message }, index (message.id)}
										{@const character = characters.find((c) => c.id === message.characterId)}
										{@const displayCharacter = character || {
											id: 'unassigned',
											username: 'Unknown',
											avatar: '',
											roleColor: '#99aab5'
										}}
										{@const prevMessage = index > 0 ? messageFlowInfo[index - 1].message : null}
										{@const isSameUser = prevMessage && prevMessage.characterId === message.characterId}
										{@const timeDiff = prevMessage ? new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() : 0}
										{@const isGrouped = isSameUser && timeDiff < 300000}
										{@const replyMessage = message.replyTo ? messages.find((m) => m.id === message.replyTo) : null}
										{@const replyCharacter = replyMessage ? characters.find((c) => c.id === replyMessage.characterId) : null}
										{@const replyPreview = replyMessage ? (replyMessage.text.length > 90 ? `${replyMessage.text.slice(0, 87)}...` : replyMessage.text) : ''}

										{#if !isGrouped}
											<!-- Full Message with Avatar -->
											<div class="flex items-start gap-3 hover:bg-white/5 -mx-3 px-3 py-0.5 rounded transition-colors">
												<Avatar class="w-10 h-10 flex-shrink-0 mt-0.5">
													<AvatarImage src={displayCharacter.avatar} alt={displayCharacter.username} />
													<AvatarFallback
														class="text-white text-xs font-semibold"
														style="background-color: {displayCharacter.roleColor}"
													>
														{displayCharacter.username.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>

												<div class="flex-1 min-w-0">
													<div class="flex items-baseline gap-2 mb-0.5">
														<span
															class="text-sm font-semibold"
															style="color: {character ? displayCharacter.roleColor : '#99aab5'}"
														>
															{displayCharacter.username}
														</span>
														{#if !character}
															<span class="text-xs px-1.5 py-0.5 rounded" style="background-color: {backgroundColor === '#36393f' ? '#42464d' : `${backgroundColor}88`}; color: {textColor}88">
																Unassigned
															</span>
														{/if}
														<span class="text-xs font-medium" style="color: {textColor}50">
															{new Date(message.timestamp).toLocaleTimeString([], {
																hour: 'numeric',
																minute: '2-digit'
															})}
														</span>
													</div>

													{#if replyMessage}
														<div
															class="mb-2 rounded-md border-l-[4px] pl-3 pr-3 py-2 cursor-pointer hover:bg-black/10 transition-all"
															style="
																border-color: {replyCharacter ? replyCharacter.roleColor : '#4f545c'};
																background: linear-gradient(90deg, {replyCharacter ? `${replyCharacter.roleColor}15` : 'rgba(79, 84, 92, 0.15)'} 0%, rgba(79, 84, 92, 0.05) 100%);
															"
														>
															<div class="flex items-start gap-2">
																<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" style="color: {replyCharacter ? replyCharacter.roleColor : '#b9bbbe'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
																	<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
																</svg>
																<div class="flex-1 min-w-0">
																	<div class="flex items-center gap-1.5 mb-0.5">
																		<div
																			class="font-bold text-[0.7rem] tracking-tight"
																			style="color: {replyCharacter ? replyCharacter.roleColor : '#e3e5e8'}"
																		>
																			{replyCharacter ? replyCharacter.username : 'Unknown User'}
																		</div>
																		<svg class="w-3 h-3 opacity-50" style="color: {textColor}" fill="currentColor" viewBox="0 0 20 20">
																			<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
																		</svg>
																	</div>
																	<div class="text-[0.7rem] leading-relaxed font-medium" style="color: {textColor}cc">
																		{replyPreview || 'Click to see original message'}
																	</div>
																</div>
															</div>
														</div>
													{/if}

													<div
														class="text-sm leading-relaxed break-words"
														style="color: {textColor}e6"
													>
														{message.text}
													</div>
												</div>
											</div>
										{:else}
											<!-- Grouped Message (no avatar) -->
											<div class="flex items-start gap-3 hover:bg-white/5 -mx-3 px-3 py-0.5 rounded transition-colors group">
												<div class="w-10 flex-shrink-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
													<span class="text-[10px] font-medium" style="color: {textColor}40">
														{new Date(message.timestamp).toLocaleTimeString([], {
															hour: 'numeric',
															minute: '2-digit'
														})}
													</span>
												</div>

										<div class="flex-1 min-w-0">
											{#if replyMessage}
												<div
													class="mb-2 rounded-md border-l-[4px] pl-3 pr-3 py-2 cursor-pointer hover:bg-black/10 transition-all"
													style="
														border-color: {replyCharacter ? replyCharacter.roleColor : '#4f545c'};
														background: linear-gradient(90deg, {replyCharacter ? `${replyCharacter.roleColor}15` : 'rgba(79, 84, 92, 0.15)'} 0%, rgba(79, 84, 92, 0.05) 100%);
													"
												>
													<div class="flex items-start gap-2">
														<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" style="color: {replyCharacter ? replyCharacter.roleColor : '#b9bbbe'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
															<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
														</svg>
														<div class="flex-1 min-w-0">
															<div class="flex items-center gap-1.5 mb-0.5">
																<div
																	class="font-bold text-[0.7rem] tracking-tight"
																	style="color: {replyCharacter ? replyCharacter.roleColor : '#e3e5e8'}"
																>
																	{replyCharacter ? replyCharacter.username : 'Unknown User'}
																</div>
																<svg class="w-3 h-3 opacity-50" style="color: {textColor}" fill="currentColor" viewBox="0 0 20 20">
																	<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
																</svg>
															</div>
															<div class="text-[0.7rem] leading-relaxed font-medium" style="color: {textColor}cc">
																{replyPreview || 'Click to see original message'}
															</div>
														</div>
													</div>
												</div>
											{/if}

													<div
														class="text-sm leading-relaxed break-words"
														style="color: {textColor}e6"
													>
														{message.text}
													</div>
												</div>
											</div>
										{/if}
									{/each}
								{/if}
							</div>
						</ScrollArea>

						<!-- Discord Mobile Input Bar -->
						<div 
							class="px-3 py-2 border-t flex-shrink-0"
							style="background-color: {backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`}; border-top-color: {backgroundColor === '#36393f' ? '#202225' : `${backgroundColor}44`}"
						>
							<div 
								class="flex items-center gap-2 rounded-full px-3 py-2"
								style="background-color: {backgroundColor === '#36393f' ? '#40444b' : `${backgroundColor}66`}"
							>
								<!-- Add Icon -->
								<svg class="w-5 h-5 flex-shrink-0" style="color: {textColor}88" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
								</svg>
								<!-- Input Placeholder -->
								<div class="flex-1 text-sm" style="color: {textColor}66">
									Message #{channelName}
								</div>
								<!-- Emoji & More Icons -->
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5" style="color: {textColor}88" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
									<svg class="w-5 h-5" style="color: {textColor}88" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
									</svg>
								</div>
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
