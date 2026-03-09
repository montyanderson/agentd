export type ThreadMetadata = {
	id: string;
	title: string;
	cwd: string;
	provider: string;
	model: string;
	thinkingLevel?: string;
	createdAt: string;
	updatedAt: string;
};

export type ThreadSummary = ThreadMetadata & {
	status: "idle" | "streaming";
};

export type ThreadDetail = ThreadMetadata & {
	status: "idle" | "streaming";
	messages: AppMessage[];
};

export type AppMessage = {
	role: string;
	content: unknown;
	[key: string]: unknown;
};

export type SSEEventType =
	| "snapshot"
	| "agent_start"
	| "message_update"
	| "tool_execution_start"
	| "tool_execution_end"
	| "message_end"
	| "agent_end"
	| "ping"
	| "error";
