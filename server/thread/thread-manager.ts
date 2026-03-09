import { v4 as uuidv4 } from "uuid";
import type { ThreadMetadata, CreateThreadBody, ThreadStatus } from "./types.ts";
import { DEFAULTS } from "./types.ts";
import {
	writeMetadata,
	readMetadata,
	listAllMetadata,
	deleteThreadDir
} from "./thread-store.ts";
import { ThreadHandle } from "./thread-handle.ts";

export type ThreadSummary = ThreadMetadata & { status: ThreadStatus };

const handles = new Map<string, ThreadHandle>();

const getOrCreateHandle = async (
	id: string
): Promise<ThreadHandle | null> => {
	const existing = handles.get(id);
	if (existing) return existing;

	const meta = await readMetadata(id);
	if (!meta) return null;

	const handle = new ThreadHandle(meta);
	handles.set(id, handle);
	return handle;
};

export const createThread = async (
	body: CreateThreadBody
): Promise<ThreadMetadata> => {
	const now = new Date().toISOString();
	const metadata: ThreadMetadata = {
		id: uuidv4(),
		title: body.title ?? "New Thread",
		cwd: body.cwd ?? process.cwd(),
		provider: body.provider ?? DEFAULTS.provider,
		model: body.model ?? DEFAULTS.model,
		thinkingLevel: body.thinkingLevel,
		createdAt: now,
		updatedAt: now
	};

	await writeMetadata(metadata);
	return metadata;
};

export const listThreads = async (): Promise<ThreadSummary[]> => {
	const allMeta = await listAllMetadata();
	return allMeta
		.map((meta) => {
			const handle = handles.get(meta.id);
			const status: ThreadStatus = handle?.status ?? "idle";
			return { ...meta, status };
		})
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		);
};

export const getThread = async (
	id: string
): Promise<ThreadHandle | null> => {
	return getOrCreateHandle(id);
};

export const deleteThread = async (id: string): Promise<boolean> => {
	const handle = handles.get(id);
	if (handle) {
		await handle.abort();
		handle.dispose();
		handles.delete(id);
	}

	const meta = await readMetadata(id);
	if (!meta) return false;

	await deleteThreadDir(id);
	return true;
};
