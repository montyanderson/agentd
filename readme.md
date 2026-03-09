# agentd

Multi-agent thread daemon. Manages concurrent coding agent threads using pi-mono, with a REST+SSE API and React chat UI.

Each thread wraps a full coding agent with file read/write/edit, bash execution, and grep/find tools — all bound to a per-thread working directory for true parallelism. Threads persist to disk as NDJSON and survive server restarts.

## quickstart

```sh
bun install
cd web && bun install && cd ..

# dev mode (two terminals)
bun run dev          # api server on :4747
bun run dev:web      # vite dev server on :5173

# production
bun run build:web
bun run start        # serves api + frontend on :4747
```

Set your API key:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
```

## api

| method | path | description |
|--------|------|-------------|
| GET | `/api/threads` | list all threads |
| POST | `/api/threads` | create thread `{ title?, model?, cwd?, provider?, thinkingLevel? }` |
| GET | `/api/threads/:id` | thread detail + full message history |
| DELETE | `/api/threads/:id` | delete thread |
| POST | `/api/threads/:id/messages` | send message `{ content }` → returns 202 |
| POST | `/api/threads/:id/abort` | abort current run |
| GET | `/api/threads/:id/events` | SSE stream |

## sse protocol

On connect, a `snapshot` event delivers current messages and status. During runs: `agent_start`, `message_update`, `tool_execution_start`, `tool_execution_end`, `message_end`, `agent_end`. Keepalive `ping` every 15s.

## configuration

| env var | default |
|---------|---------|
| `AGENTD_PROVIDER` | `anthropic` |
| `AGENTD_MODEL` | `claude-opus-4-20250514` |
| `AGENTD_PORT` | `4747` |
| `AGENTD_DATA_DIR` | `data` |

## architecture

```
server/
  index.ts                  bun.serve entry point
  app.ts                    hono app, routes, cors, static serving
  routes/threads.ts         REST crud + send message + abort
  routes/events.ts          SSE streaming
  thread/types.ts           zod schemas and defaults
  thread/thread-store.ts    disk i/o (metadata.json + conversation.ndjson)
  thread/thread-handle.ts   agent + session wrapper with sse fan-out
  thread/thread-manager.ts  in-memory registry, lazy loading

web/
  src/api/client.ts         fetch + eventsource helpers
  src/hooks/                useThreads, useThread
  src/components/           sidebar, thread view, message bubble, streaming indicator
```

Data stored in `data/threads/{uuid}/` with `metadata.json` and `conversation.ndjson`.
