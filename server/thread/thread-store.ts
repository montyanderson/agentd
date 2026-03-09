import fs from "node:fs/promises";
import path from "node:path";
import { ThreadMetadataSchema, type ThreadMetadata, DEFAULTS } from "./types.ts";

const dataDir = () => path.resolve(DEFAULTS.dataDir, "threads");

export const threadDir = (id: string): string => path.join(dataDir(), id);

export const metadataPath = (id: string): string =>
	path.join(threadDir(id), "metadata.json");

export const conversationPath = (id: string): string =>
	path.join(threadDir(id), "conversation.ndjson");

export const ensureThreadDir = async (id: string): Promise<void> => {
	await fs.mkdir(threadDir(id), { recursive: true });
};

export const writeMetadata = async (meta: ThreadMetadata): Promise<void> => {
	await ensureThreadDir(meta.id);
	await fs.writeFile(metadataPath(meta.id), JSON.stringify(meta, null, "\t"));
};

export const readMetadata = async (
	id: string
): Promise<ThreadMetadata | null> => {
	try {
		const raw = await fs.readFile(metadataPath(id), "utf-8");
		return ThreadMetadataSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
};

export const listThreadIds = async (): Promise<string[]> => {
	try {
		const entries = await fs.readdir(dataDir(), { withFileTypes: true });
		return entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
};

export const listAllMetadata = async (): Promise<ThreadMetadata[]> => {
	const ids = await listThreadIds();
	const results = await Promise.all(ids.map(readMetadata));
	return results.filter((m): m is ThreadMetadata => m !== null);
};

export const deleteThreadDir = async (id: string): Promise<void> => {
	await fs.rm(threadDir(id), { recursive: true, force: true });
};
