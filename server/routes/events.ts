import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { v4 as uuidv4 } from "uuid";
import { getThread } from "../thread/thread-manager.ts";
import type { SSEEvent } from "../thread/types.ts";

const events = new Hono();

// GET /api/threads/:id/events - SSE stream
events.get("/:id/events", async (c) => {
	const id = c.req.param("id");
	const handle = await getThread(id);
	if (!handle) {
		return c.json({ error: "Thread not found" }, 404);
	}

	return streamSSE(c, async (stream) => {
		const clientId = uuidv4();

		handle.addClient({
			id: clientId,
			send: (event: SSEEvent) => {
				void stream.writeSSE({
					event: event.type,
					data: JSON.stringify(event.data)
				});
			}
		});

		stream.onAbort(() => {
			handle.removeClient(clientId);
		});

		// Keep connection alive until client disconnects
		while (true) {
			await new Promise((r) => setTimeout(r, 30_000));
			if (stream.aborted) break;
		}
	});
});

export { events };
