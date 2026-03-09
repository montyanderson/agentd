import { useState, useEffect, useRef, useCallback } from "react";
import { api, connectSSE } from "../api/client";
import type { AppMessage } from "../lib/types";

type ThreadStatus = "idle" | "streaming";

type ToolCall = {
	toolCallId: string;
	toolName: string;
	args?: unknown;
	done: boolean;
	isError?: boolean;
};

export const useThread = (threadId: string | null) => {
	const [messages, setMessages] = useState<AppMessage[]>([]);
	const [status, setStatus] = useState<ThreadStatus>("idle");
	const [toolCalls, setToolCalls] = useState<Map<string, ToolCall>>(new Map());
	const disconnectRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (!threadId) {
			setMessages([]);
			setStatus("idle");
			setToolCalls(new Map());
			return;
		}

		const disconnect = connectSSE(threadId, {
			snapshot: (data) => {
				const d = data as {
					messages: AppMessage[];
					status: ThreadStatus;
				};
				setMessages(d.messages ?? []);
				setStatus(d.status ?? "idle");
			},
			agent_start: () => {
				setStatus("streaming");
			},
			message_update: (data) => {
				const d = data as { message: AppMessage };
				if (d.message) {
					setMessages((prev) => {
						// Replace the last message of same role, or append
						if (
							prev.length > 0 &&
							prev[prev.length - 1]?.role === d.message.role
						) {
							return [...prev.slice(0, -1), d.message];
						}
						return [...prev, d.message];
					});
				}
			},
			tool_execution_start: (data) => {
				const d = data as {
					toolCallId: string;
					toolName: string;
					args?: unknown;
				};
				setToolCalls((prev) => {
					const next = new Map(prev);
					next.set(d.toolCallId, {
						toolCallId: d.toolCallId,
						toolName: d.toolName,
						args: d.args,
						done: false
					});
					return next;
				});
			},
			tool_execution_end: (data) => {
				const d = data as {
					toolCallId: string;
					toolName: string;
					isError: boolean;
				};
				setToolCalls((prev) => {
					const next = new Map(prev);
					const existing = next.get(d.toolCallId);
					if (existing) {
						next.set(d.toolCallId, {
							...existing,
							done: true,
							isError: d.isError
						});
					}
					return next;
				});
			},
			message_end: (data) => {
				const d = data as { message: AppMessage };
				if (d.message) {
					setMessages((prev) => {
						if (
							prev.length > 0 &&
							prev[prev.length - 1]?.role === d.message.role
						) {
							return [...prev.slice(0, -1), d.message];
						}
						return [...prev, d.message];
					});
				}
			},
			agent_end: () => {
				setStatus("idle");
				setToolCalls(new Map());
			}
		});

		disconnectRef.current = disconnect;

		return () => {
			disconnect();
			disconnectRef.current = null;
		};
	}, [threadId]);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!threadId) return;
			await api.sendMessage(threadId, content);
		},
		[threadId]
	);

	const abort = useCallback(async () => {
		if (!threadId) return;
		await api.abort(threadId);
	}, [threadId]);

	return { messages, status, toolCalls, sendMessage, abort };
};
