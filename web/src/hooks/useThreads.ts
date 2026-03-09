import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { ThreadSummary } from "../lib/types";

export const useThreads = () => {
	const [threads, setThreads] = useState<ThreadSummary[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const list = await api.listThreads();
			setThreads(list);
		} catch (err) {
			console.error("Failed to list threads:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const createThread = useCallback(
		async (body: Parameters<typeof api.createThread>[0] = {}) => {
			const thread = await api.createThread(body);
			await refresh();
			return thread;
		},
		[refresh]
	);

	const deleteThread = useCallback(
		async (id: string) => {
			await api.deleteThread(id);
			await refresh();
		},
		[refresh]
	);

	return { threads, loading, refresh, createThread, deleteThread };
};
