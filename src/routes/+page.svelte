<script lang="ts">
	import { SvelteFlow, Background, Controls, MiniMap } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	
	import { 
		Edit, 
		Copy, 
		Users, 
		MessageSquare, 
		Plus, 
		ChevronDown,
		Type,
		Layout,
		Video,
		Film,
		Volume2,
		Download,
		Layers
	} from 'lucide-svelte';

	// Sample node data
	let nodes = $state([
		{
			id: 'speaker-1',
			type: 'default',
			position: { x: 50, y: 100 },
			data: { 
				label: 'Alex Chen',
				type: 'speaker',
				status: 'Ready to speak'
			}
		},
		{
			id: 'message-1',
			type: 'default',
			position: { x: 300, y: 50 },
			data: { 
				label: 'Hey everyone! Welcome to our Discord chat animation builder 🎉',
				type: 'message',
				timestamp: '03:37 PM',
				user: 'Alex Chen'
			}
		},
		{
			id: 'speaker-2',
			type: 'default',
			position: { x: 50, y: 300 },
			data: { 
				label: 'Sarah Wilson',
				type: 'speaker',
				status: 'Ready to speak'
			}
		},
		{
			id: 'message-2',
			type: 'default',
			position: { x: 300, y: 250 },
			data: { 
				label: 'This looks amazing! Can\'t wait to create some cool animations 🎨',
				type: 'message',
				timestamp: '03:37 PM',
				user: 'Sarah Wilson'
			}
		}
	]);

	let edges = $state([
		{ id: 'e1', source: 'speaker-1', target: 'message-1' },
		{ id: 'e2', source: 'speaker-2', target: 'message-2' }
	]);

	// Phone preview data
	let serverName = $state('My Discord Server');
	let channelName = $state('general');
	let chatTopic = $state('General Chat');
	
	let messages = $state([
		{
			id: 1,
			user: 'Sarah Wilson',
			avatar: 'SW',
			color: 'bg-purple-500',
			timestamp: '03:37 PM',
			content: 'This looks amazing! Can\'t wait to create some cool animations 🎨'
		},
		{
			id: 2,
			user: 'Alex Chen',
			avatar: 'AC',
			color: 'bg-blue-500',
			timestamp: '03:37 PM',
			content: 'Hey everyone! Welcome to our Discord chat animation builder 🎉'
		}
	]);
</script>

<div class="flex h-screen w-full overflow-hidden bg-background">
	<!-- Left Panel - Flow Editor -->
	<div class="flex flex-1 flex-col border-r border-border">
		<!-- Top Toolbar -->
		<div class="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon">
					<Users class="size-4" />
				</Button>
				<Badge variant="secondary" class="gap-1">
					<Users class="size-3" />
					2
				</Badge>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon">
					<MessageSquare class="size-4" />
				</Button>
				<Badge variant="secondary" class="gap-1">
					<MessageSquare class="size-3" />
					2
				</Badge>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon">
					<Copy class="size-4" />
				</Button>
				<Badge variant="secondary">3</Badge>
			</div>
		</div>

		<!-- Flow Canvas -->
		<div class="relative flex-1">
			<SvelteFlow {nodes} {edges} fitView>
				<Background />
				<Controls />
				<MiniMap />
			</SvelteFlow>
		</div>

		<!-- Bottom Toolbar -->
		<div class="flex items-center justify-between border-t border-border bg-card px-4 py-2">
			<div class="flex gap-2">
				<Button variant="ghost" size="icon">
					<Users class="size-4" />
				</Button>
				<Button variant="ghost" size="icon">
					<MessageSquare class="size-4" />
				</Button>
				<Button variant="ghost" size="icon">
					<Edit class="size-4" />
				</Button>
				<Button variant="ghost" size="icon">
					<Copy class="size-4" />
				</Button>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" size="icon">
					<Plus class="size-4" />
				</Button>
				<Button variant="outline" size="icon">
					<Plus class="size-4" />
				</Button>
			</div>
		</div>
	</div>

	<!-- Right Panel - Phone Preview -->
	<div class="flex w-[450px] flex-col border-r border-border bg-muted/30 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Preview</h2>
			<p class="text-sm text-muted-foreground">Current chat visualization</p>
		</div>

		<!-- Phone Mockup -->
		<div class="mx-auto flex flex-1 items-center justify-center">
			<div class="relative h-[600px] w-[320px] overflow-hidden rounded-[3rem] border-[14px] border-foreground bg-background shadow-2xl">
				<!-- Status Bar -->
				<div class="flex items-center justify-between bg-background px-6 py-2">
					<span class="text-xs font-semibold">9:41</span>
					<div class="flex items-center gap-1">
						<div class="h-2 w-2 rounded-full bg-foreground"></div>
						<div class="h-2 w-2 rounded-full bg-foreground"></div>
						<div class="h-2 w-2 rounded-full bg-foreground"></div>
					</div>
				</div>

				<!-- Channel Header -->
				<div class="border-b border-border bg-card px-4 py-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="size-2 rounded-full bg-green-500"></div>
							<span class="font-semibold">{channelName}</span>
						</div>
						<ChevronDown class="size-4 text-muted-foreground" />
					</div>
				</div>

				<!-- Messages -->
				<ScrollArea class="h-[calc(100%-8rem)] px-4 py-2">
					{#each messages as message (message.id)}
						<div class="mb-4 flex gap-3">
							<Avatar class="size-10">
								<AvatarFallback class={message.color}>
									{message.avatar}
								</AvatarFallback>
							</Avatar>
							<div class="flex-1">
								<div class="flex items-baseline gap-2">
									<span class="text-sm font-semibold">{message.user}</span>
									<span class="text-xs text-muted-foreground">{message.timestamp}</span>
								</div>
								<p class="mt-1 text-sm">{message.content}</p>
							</div>
						</div>
					{/each}
				</ScrollArea>

				<!-- Message Input -->
				<div class="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-3">
					<div class="text-xs text-muted-foreground">Message #{channelName}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Far Right Panel - Customization -->
	<div class="flex w-[380px] flex-col bg-card">
		<ScrollArea class="flex-1 p-6">
			<div class="space-y-6">
				<!-- Chat Room Section -->
				<div>
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<MessageSquare class="size-4" />
							<span class="font-semibold">Chat Room</span>
						</div>
						<ChevronDown class="size-4" />
					</div>

					<div class="space-y-4">
						<div>
							<Label for="server-name" class="text-sm">Server Name</Label>
							<Input id="server-name" bind:value={serverName} class="mt-1.5" />
						</div>
						<div>
							<Label for="channel-name" class="text-sm">Channel Name</Label>
							<Input id="channel-name" bind:value={channelName} class="mt-1.5" />
						</div>
						<div>
							<Label for="chat-topic" class="text-sm">Chat Topic</Label>
							<Input id="chat-topic" bind:value={chatTopic} class="mt-1.5" />
						</div>
					</div>
				</div>

				<Separator />

				<!-- Typography Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Type class="size-4" />
							<span class="font-semibold">Typography</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Layout Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Layout class="size-4" />
							<span class="font-semibold">Layout</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Video Quality Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Video class="size-4" />
							<span class="font-semibold">Video Quality</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Animation Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Film class="size-4" />
							<span class="font-semibold">Animation</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Audio Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Volume2 class="size-4" />
							<span class="font-semibold">Audio</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Export Format Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Download class="size-4" />
							<span class="font-semibold">Export Format</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>

				<Separator />

				<!-- Templates Section -->
				<div>
					<button class="flex w-full items-center justify-between py-2">
						<div class="flex items-center gap-2">
							<Layers class="size-4" />
							<span class="font-semibold">Templates</span>
						</div>
						<ChevronDown class="size-4" />
					</button>
				</div>
			</div>
		</ScrollArea>

		<!-- Save Button -->
		<div class="border-t border-border p-4">
			<Button class="w-full bg-green-600 hover:bg-green-700">
				<Download class="mr-2 size-4" />
				Save Project
			</Button>
		</div>
	</div>
</div>
