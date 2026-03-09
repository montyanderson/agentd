import { app } from "./app.ts";
import { DEFAULTS } from "./thread/types.ts";

const port = DEFAULTS.port;

console.log(`agentd starting on http://localhost:${port}`);

export default {
	port,
	fetch: app.fetch
};
