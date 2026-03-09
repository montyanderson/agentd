import { z } from "zod/v4";

// ── Thread metadata (persisted as metadata.json) ──

export const ThreadMetadataSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	cwd: z.string(),
	provider: z.string(),
	model: z.string(),
	thinkingLevel: z.string().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
});

export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;

// ── API request schemas ──

export const CreateThreadBodySchema = z.object({
	title: z.string().optional(),
	model: z.string().optional(),
	cwd: z.string().optional(),
	provider: z.string().optional(),
	thinkingLevel: z.string().optional()
});

export type CreateThreadBody = z.infer<typeof CreateThreadBodySchema>;

export const SendMessageBodySchema = z.object({
	content: z.string().min(1)
});

export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;

// ── SSE event types ──

export const SSE_EVENT_TYPES = [
	"snapshot",
	"agent_start",
	"message_update",
	"tool_execution_start",
	"tool_execution_end",
	"message_end",
	"agent_end",
	"ping",
	"error"
] as const;

export type SSEEventType = (typeof SSE_EVENT_TYPES)[number];

export const SSEEventSchema = z.object({
	type: z.enum(SSE_EVENT_TYPES),
	data: z.unknown()
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// ── Thread status ──

export type ThreadStatus = "idle" | "streaming";

// ── Defaults ──

export const DEFAULTS = {
	provider: process.env.AGENTD_PROVIDER ?? "anthropic",
	model:
		process.env.AGENTD_MODEL ?? "claude-opus-4-20250514",
	port: parseInt(process.env.AGENTD_PORT ?? "4747", 10),
	dataDir: process.env.AGENTD_DATA_DIR ?? "data"
} as const;
