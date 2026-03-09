import { useState, useRef, useEffect } from "react";
import { useThread } from "../hooks/useThread";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessage } from "./StreamingMessage";

type Props = {
	threadId: string;
};

export const ThreadView = ({ threadId }: Props) => {
	const { messages, status, toolCalls, sendMessage, abort } =
		useThread(threadId);
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, toolCalls]);

	useEffect(() => {
		inputRef.current?.focus();
	}, [threadId]);

	const handleSend = async () => {
		const text = input.trim();
		if (!text) return;
		setInput("");
		try {
			await sendMessage(text);
		} catch (err) {
			console.error("Send failed:", err);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSend();
		}
	};

	return (
		<div className="flex h-full flex-col bg-zinc-950">
			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{messages.map((msg, i) => (
					<MessageBubble key={i} message={msg} />
				))}
				{status === "streaming" && (
					<StreamingMessage toolCalls={toolCalls} />
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="border-t border-zinc-800 p-3">
				<div className="flex items-end gap-2">
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Send a message..."
						rows={1}
						className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
					/>
					{status === "streaming" ? (
						<button
							onClick={() => void abort()}
							className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
						>
							Stop
						</button>
					) : (
						<button
							onClick={() => void handleSend()}
							disabled={!input.trim()}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-40"
						>
							Send
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
