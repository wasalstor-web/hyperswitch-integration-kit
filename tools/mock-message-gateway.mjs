#!/usr/bin/env node
/**
 * بوابة رسائل وهمية للتطوير: تطبع الجسم وتعيد 200.
 * شغّل: node tools/mock-message-gateway.mjs
 * ثم في أسرار الدوال: MESSAGE_GATEWAY_URL=http://host.docker.internal:8787
 *    (أو http://127.0.0.1:8787 إن كانت الدوال على نفس الجهاز)
 */
import http from "node:http";

const PORT = Number(process.env.MOCK_GATEWAY_PORT || 8787);

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    console.log("\n--- mock gateway ---\n", body, "\n-------------------\n");
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, logged: true }));
  });
});

server.listen(PORT, () => {
  console.log(`Mock MESSAGE_GATEWAY listening on http://127.0.0.1:${PORT}`);
});
