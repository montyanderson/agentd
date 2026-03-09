import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { threads } from "./routes/threads.ts";
import { events } from "./routes/events.ts";

const app = new Hono();

app.use("*", logger());
app.use(
	"/api/*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type"]
	})
);

// Mount routes
app.route("/api/threads", threads);
app.route("/api/threads", events);

// Health check
app.get("/api/health", (c) => c.json({ ok: true }));

// llms.txt
const llmsTxtPath = path.resolve(import.meta.dir, "../llms.txt");
const llmsTxt = fs.readFileSync(llmsTxtPath, "utf-8");
app.get("/llms.txt", (c) => {
	c.header("Content-Type", "text/plain; charset=utf-8");
	return c.body(llmsTxt);
});

// Static file serving for production (web/dist)
const distPath = path.resolve(import.meta.dir, "../web/dist");
app.use("/*", serveStatic({ root: distPath }));
app.get("*", serveStatic({ root: distPath, path: "/index.html" }));

export { app };
