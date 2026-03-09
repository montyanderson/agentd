import { useState, useCallback } from "react";
import { useThreads } from "./hooks/useThreads";
import { Sidebar } from "./components/Sidebar";
import { ThreadView } from "./components/ThreadView";

const App = () => {
	const { threads, createThread, deleteThread, refresh } = useThreads();
	const [activeId, setActiveId] = useState<string | null>(null);

	const handleCreate = useCallback(async () => {
		const thread = await createThread({ title: "New Thread" });
		setActiveId(thread.id);
	}, [createThread]);

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteThread(id);
			if (activeId === id) setActiveId(null);
		},
		[deleteThread, activeId]
	);

	const handleSelect = useCallback(
		(id: string) => {
			setActiveId(id);
			void refresh();
		},
		[refresh]
	);

	return (
		<div className="flex h-full bg-zinc-950 text-zinc-200">
			<Sidebar
				threads={threads}
				activeId={activeId}
				onSelect={handleSelect}
				onCreate={() => void handleCreate()}
				onDelete={(id) => void handleDelete(id)}
			/>
			<div className="flex-1">
				{activeId ? (
					<ThreadView threadId={activeId} />
				) : (
					<div className="flex h-full items-center justify-center text-zinc-500">
						Select or create a thread to get started
					</div>
				)}
			</div>
		</div>
	);
};

export default App;
