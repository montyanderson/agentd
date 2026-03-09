import type { ThreadSummary } from "../lib/types";

type Props = {
	threads: ThreadSummary[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
};

const formatDate = (iso: string) => {
	const d = new Date(iso);
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
};

export const Sidebar = ({
	threads,
	activeId,
	onSelect,
	onCreate,
	onDelete
}: Props) => {
	return (
		<div className="flex h-full w-72 flex-col border-r border-zinc-700 bg-zinc-900">
			<div className="flex items-center justify-between p-3 border-b border-zinc-700">
				<h1 className="text-sm font-semibold text-zinc-200">agentd</h1>
				<button
					onClick={onCreate}
					className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
				>
					+ New
				</button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{threads.map((t) => (
					<div
						key={t.id}
						onClick={() => onSelect(t.id)}
						className={`group flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-zinc-800 ${
							activeId === t.id
								? "bg-zinc-800 text-white"
								: "text-zinc-400"
						}`}
					>
						<div className="min-w-0 flex-1">
							<div className="truncate font-medium">
								{t.title}
							</div>
							<div className="text-xs text-zinc-500">
								{formatDate(t.updatedAt)}
								{t.status === "streaming" && (
									<span className="ml-2 text-green-400">
										●
									</span>
								)}
							</div>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDelete(t.id);
							}}
							className="ml-2 hidden rounded p-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-red-400 group-hover:block"
						>
							✕
						</button>
					</div>
				))}
				{threads.length === 0 && (
					<div className="p-4 text-center text-xs text-zinc-500">
						No threads yet
					</div>
				)}
			</div>
		</div>
	);
};
