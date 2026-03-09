import Markdown from "react-markdown";
import type { AppMessage } from "../lib/types";

type Props = {
	message: AppMessage;
};

const extractText = (content: unknown): string => {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				if (typeof block === "string") return block;
				if (block && typeof block === "object") {
					if ("text" in block && typeof block.text === "string")
						return block.text;
					if (
						"type" in block &&
						block.type === "tool_use" &&
						"name" in block
					) {
						return `[Tool: ${block.name}]`;
					}
					if (
						"type" in block &&
						block.type === "thinking" &&
						"thinking" in block
					) {
						return "";
					}
				}
				return "";
			})
			.filter(Boolean)
			.join("\n");
	}
	return "";
};

export const MessageBubble = ({ message }: Props) => {
	const { role } = message;
	const text = extractText(message.content);

	if (!text.trim()) return null;

	if (role === "user") {
		return (
			<div className="flex justify-end">
				<div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
					{text}
				</div>
			</div>
		);
	}

	if (role === "assistant") {
		return (
			<div className="flex justify-start">
				<div className="prose prose-invert prose-sm max-w-[80%] rounded-lg bg-zinc-800 px-4 py-2 text-sm">
					<Markdown>{text}</Markdown>
				</div>
			</div>
		);
	}

	// tool results, etc - show as collapsible
	if (role === "toolResult") {
		const toolName =
			typeof message.toolName === "string"
				? message.toolName
				: "tool_result";
		return (
			<div className="flex justify-start">
				<details className="max-w-[80%] rounded-lg bg-zinc-850 border border-zinc-700 text-xs">
					<summary className="cursor-pointer px-3 py-1.5 text-zinc-400">
						{toolName}
					</summary>
					<pre className="max-h-48 overflow-auto px-3 py-2 text-zinc-500">
						{text.slice(0, 2000)}
					</pre>
				</details>
			</div>
		);
	}

	return null;
};
