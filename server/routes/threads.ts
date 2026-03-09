import { Hono } from "hono";
import { CreateThreadBodySchema, SendMessageBodySchema } from "../thread/types.ts";
import {
	createThread,
	listThreads,
	getThread,
	deleteThread
} from "../thread/thread-manager.ts";

const threads = new Hono();

// GET /api/threads - list all threads
threads.get("/", async (c) => {
	const list = await listThreads();
	return c.json(list);
});

// POST /api/threads - create a new thread
threads.post("/", async (c) => {
	const raw = await c.req.json();
	const parsed = CreateThreadBodySchema.safeParse(raw);
	if (!parsed.success) {
		return c.json({ error: "Invalid request body", issues: parsed.error.issues }, 400);
	}
	const meta = await createThread(parsed.data);
	return c.json(meta, 201);
});

// GET /api/threads/:id - thread detail + messages
threads.get("/:id", async (c) => {
	const id = c.req.param("id");
	const handle = await getThread(id);
	if (!handle) {
		return c.json({ error: "Thread not found" }, 404);
	}
	return c.json({
		...handle.metadata,
		status: handle.status,
		messages: handle.currentMessages
	});
});

// DELETE /api/threads/:id
threads.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const deleted = await deleteThread(id);
	if (!deleted) {
		return c.json({ error: "Thread not found" }, 404);
	}
	return c.json({ ok: true });
});

// POST /api/threads/:id/messages - send a message
threads.post("/:id/messages", async (c) => {
	const id = c.req.param("id");
	const raw = await c.req.json();
	const parsed = SendMessageBodySchema.safeParse(raw);
	if (!parsed.success) {
		return c.json({ error: "Invalid request body", issues: parsed.error.issues }, 400);
	}

	const handle = await getThread(id);
	if (!handle) {
		return c.json({ error: "Thread not found" }, 404);
	}

	try {
		await handle.sendMessage(parsed.data.content);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: msg }, 500);
	}

	return c.json({ ok: true }, 202);
});

// POST /api/threads/:id/abort - abort current run
threads.post("/:id/abort", async (c) => {
	const id = c.req.param("id");
	const handle = await getThread(id);
	if (!handle) {
		return c.json({ error: "Thread not found" }, 404);
	}
	await handle.abort();
	return c.json({ ok: true });
});

export { threads };
