type ToolCall = {
	toolCallId: string;
	toolName: string;
	args?: unknown;
	done: boolean;
	isError?: boolean;
};

type Props = {
	toolCalls: Map<string, ToolCall>;
};

export const StreamingMessage = ({ toolCalls }: Props) => {
	const active = Array.from(toolCalls.values());
	if (active.length === 0) return null;

	return (
		<div className="flex justify-start">
			<div className="max-w-[80%] space-y-1 rounded-lg bg-zinc-800 px-4 py-2 text-xs text-zinc-400">
				{active.map((tc) => (
					<div key={tc.toolCallId} className="flex items-center gap-2">
						{tc.done ? (
							tc.isError ? (
								<span className="text-red-400">✕</span>
							) : (
								<span className="text-green-400">✓</span>
							)
						) : (
							<span className="animate-spin">⟳</span>
						)}
						<span className="font-mono">{tc.toolName}</span>
					</div>
				))}
			</div>
		</div>
	);
};
