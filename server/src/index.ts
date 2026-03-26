import "./load-env.js";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { initDatabase } from "./db.js";

async function main() {
  const port = Number(process.env.PORT) || 8788;
  const prisma = await initDatabase();
  const app = createApp(prisma);

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`[api] http://127.0.0.1:${info.port}  (health: /health)`);
    },
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
