import {
	Agent,
	type AgentEvent,
	type AppMessage,
	ProviderTransport
} from "@mariozechner/pi-agent-core";
import {
	AgentSession,
	type AgentSessionEvent,
	createCodingTools,
	messageTransformer,
	SessionManager,
	SettingsManager
} from "@mariozechner/pi-coding-agent";
import { getApiKey, getModels, getProviders } from "@mariozechner/pi-ai";
import type { KnownProvider } from "@mariozechner/pi-ai";
import type { ThreadMetadata, SSEEvent, ThreadStatus } from "./types.ts";
import { conversationPath, writeMetadata } from "./thread-store.ts";

type SSEClient = {
	id: string;
	send: (event: SSEEvent) => void;
};

const resolveModel = (provider: string, modelId: string) => {
	if (!getProviders().includes(provider as KnownProvider)) return undefined;
	const models = getModels(provider as KnownProvider);
	return models.find((m) => m.id === modelId);
};

const SYSTEM_PROMPT = `You are a helpful coding assistant. You have access to tools for reading, writing, and editing files, running bash commands, and searching code. Use them to help the user with their coding tasks.`;

export class ThreadHandle {
	readonly metadata: ThreadMetadata;
	private session: AgentSession | null = null;
	private agent: Agent | null = null;
	private clients: Map<string, SSEClient> = new Map();
	private unsubscribe: (() => void) | null = null;
	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private messages: AppMessage[] = [];
	private initialized = false;

	constructor(metadata: ThreadMetadata) {
		this.metadata = metadata;
	}

	get status(): ThreadStatus {
		return this.session?.isStreaming ? "streaming" : "idle";
	}

	get currentMessages(): AppMessage[] {
		if (this.session) {
			return this.session.messages;
		}
		return this.messages;
	}

	private ensureInitialized(): void {
		if (this.initialized) return;
		this.initialized = true;

		const { provider, model: modelId, cwd, thinkingLevel } = this.metadata;

		const model = resolveModel(provider, modelId);
		if (!model) {
			throw new Error(`Unknown model: ${provider}/${modelId}`);
		}

		this.agent = new Agent({
			initialState: {
				systemPrompt: SYSTEM_PROMPT,
				model,
				thinkingLevel: (thinkingLevel as "off" | "low" | "high" | "xhigh") ?? "off",
				tools: createCodingTools(cwd)
			},
			messageTransformer,
			queueMode: "all",
			transport: new ProviderTransport({
				getApiKey: async (p: string) => {
					const key = getApiKey(p);
					if (key) return key;
					const envKey =
						process.env[`${p.toUpperCase()}_API_KEY`];
					if (envKey) return envKey;
					throw new Error(`No API key for provider "${p}"`);
				}
			})
		});

		const ndjsonPath = conversationPath(this.metadata.id);
		const sessionManager = SessionManager.open(ndjsonPath);
		const prior = sessionManager.loadSession().messages;
		if (prior.length > 0) {
			this.agent.replaceMessages(prior);
		}
		this.messages = prior;

		const settingsManager = SettingsManager.inMemory();

		this.session = new AgentSession({
			agent: this.agent,
			sessionManager,
			settingsManager
		});

		this.unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
			this.handleAgentEvent(event);
		});

		this.startPing();
	}

	private handleAgentEvent(event: AgentSessionEvent): void {
		switch (event.type) {
			case "agent_start":
				this.broadcast({ type: "agent_start", data: {} });
				break;

			case "message_update": {
				const assistantEvent = (event as AgentEvent & { assistantMessageEvent?: unknown }).assistantMessageEvent;
				this.broadcast({
					type: "message_update",
					data: {
						message: event.message,
						assistantMessageEvent: assistantEvent
					}
				});
				break;
			}

			case "tool_execution_start": {
				const e = event as AgentEvent & {
					toolCallId: string;
					toolName: string;
					args: unknown;
				};
				this.broadcast({
					type: "tool_execution_start",
					data: {
						toolCallId: e.toolCallId,
						toolName: e.toolName,
						args: e.args
					}
				});
				break;
			}

			case "tool_execution_end": {
				const e = event as AgentEvent & {
					toolCallId: string;
					toolName: string;
					result: unknown;
					isError: boolean;
				};
				this.broadcast({
					type: "tool_execution_end",
					data: {
						toolCallId: e.toolCallId,
						toolName: e.toolName,
						isError: e.isError
					}
				});
				break;
			}

			case "message_end":
				this.broadcast({
					type: "message_end",
					data: { message: event.message }
				});
				break;

			case "agent_end":
				this.broadcast({
					type: "agent_end",
					data: {}
				});
				this.touchUpdatedAt();
				break;
		}
	}

	private touchUpdatedAt(): void {
		const now = new Date().toISOString();
		(this.metadata as { updatedAt: string }).updatedAt = now;
		void writeMetadata(this.metadata);
	}

	private broadcast(event: SSEEvent): void {
		for (const client of this.clients.values()) {
			try {
				client.send(event);
			} catch {
				this.clients.delete(client.id);
			}
		}
	}

	private startPing(): void {
		if (this.pingInterval) return;
		this.pingInterval = setInterval(() => {
			this.broadcast({ type: "ping", data: {} });
		}, 15_000);
	}

	addClient(client: SSEClient): void {
		this.ensureInitialized();
		this.clients.set(client.id, client);

		// Send snapshot on connect
		client.send({
			type: "snapshot",
			data: {
				messages: this.currentMessages,
				status: this.status,
				metadata: this.metadata
			}
		});
	}

	removeClient(id: string): void {
		this.clients.delete(id);
	}

	async sendMessage(content: string): Promise<void> {
		this.ensureInitialized();
		if (!this.session) {
			throw new Error("Session not initialized");
		}

		if (this.session.isStreaming) {
			await this.session.queueMessage(content);
		} else {
			void this.session.prompt(content);
		}
	}

	async abort(): Promise<void> {
		if (this.session?.isStreaming) {
			await this.session.abort();
		}
	}

	dispose(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.session?.dispose();
		this.session = null;
		this.agent = null;
		this.clients.clear();
		this.initialized = false;
	}
}
