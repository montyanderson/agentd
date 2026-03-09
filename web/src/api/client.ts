import type { ThreadSummary, ThreadDetail, SSEEventType } from "../lib/types";

const BASE = "/api";

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
	const res = await fetch(`${BASE}${url}`, {
		...init,
		headers: { "Content-Type": "application/json", ...init?.headers }
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`${res.status}: ${body}`);
	}
	return res.json();
};

export const api = {
	listThreads: () => json<ThreadSummary[]>("/threads"),

	createThread: (body: {
		title?: string;
		model?: string;
		cwd?: string;
		provider?: string;
		thinkingLevel?: string;
	}) => json<ThreadSummary>("/threads", { method: "POST", body: JSON.stringify(body) }),

	getThread: (id: string) => json<ThreadDetail>(`/threads/${id}`),

	deleteThread: (id: string) =>
		json<{ ok: boolean }>(`/threads/${id}`, { method: "DELETE" }),

	sendMessage: (id: string, content: string) =>
		json<{ ok: boolean }>(`/threads/${id}/messages`, {
			method: "POST",
			body: JSON.stringify({ content })
		}),

	abort: (id: string) =>
		json<{ ok: boolean }>(`/threads/${id}/abort`, { method: "POST" })
};

export type SSEHandler = Partial<Record<SSEEventType, (data: unknown) => void>>;

export const connectSSE = (
	threadId: string,
	handlers: SSEHandler
): (() => void) => {
	const es = new EventSource(`${BASE}/threads/${threadId}/events`);

	const eventTypes: SSEEventType[] = [
		"snapshot",
		"agent_start",
		"message_update",
		"tool_execution_start",
		"tool_execution_end",
		"message_end",
		"agent_end",
		"ping",
		"error"
	];

	for (const type of eventTypes) {
		es.addEventListener(type, (e) => {
			const handler = handlers[type];
			if (handler) {
				try {
					handler(JSON.parse((e as MessageEvent).data));
				} catch {
					// ignore parse errors
				}
			}
		});
	}

	es.onerror = () => {
		// EventSource reconnects automatically
	};

	return () => es.close();
};
