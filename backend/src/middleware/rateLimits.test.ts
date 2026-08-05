import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import {
  createVidaRateLimiter,
  getRateLimitPrincipalKey,
  shouldSkipGeneralRateLimit,
} from "./rateLimits.js";

async function withTestServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("returns a JSON 429 response with standard rate-limit headers", async () => {
  const app = express();
  app.use(
    createVidaRateLimiter({
      identifier: "test-general",
      windowMs: 60_000,
      limit: 2,
    }),
  );
  app.get("/", (_req, res) => res.json({ ok: true }));

  await withTestServer(app, async (baseUrl) => {
    assert.equal((await fetch(baseUrl)).status, 200);
    assert.equal((await fetch(baseUrl)).status, 200);

    const limitedResponse = await fetch(baseUrl);

    assert.equal(limitedResponse.status, 429);
    assert.deepEqual(await limitedResponse.json(), {
      message: "Too many requests. Please try again shortly.",
    });
    assert.ok(limitedResponse.headers.get("ratelimit"));
    assert.ok(limitedResponse.headers.get("ratelimit-policy"));
    assert.ok(limitedResponse.headers.get("retry-after"));
  });
});

test("authenticated rate-limit keys isolate principals", async () => {
  const app = express();
  app.use((req, res, next) => {
    res.locals.user = { _id: req.headers["x-test-user"] };
    next();
  });
  app.use(
    createVidaRateLimiter({
      identifier: "test-principal",
      windowMs: 60_000,
      limit: 1,
      keyGenerator: getRateLimitPrincipalKey,
    }),
  );
  app.post("/", (_req, res) => res.json({ ok: true }));

  await withTestServer(app, async (baseUrl) => {
    const requestFor = (userId: string) =>
      fetch(baseUrl, {
        method: "POST",
        headers: { "x-test-user": userId },
      });

    assert.equal((await requestFor("user-a")).status, 200);
    assert.equal((await requestFor("user-a")).status, 429);
    assert.equal((await requestFor("user-b")).status, 200);
  });
});

test("the general policy excludes operational and preflight requests", () => {
  const request = (method: string, path: string) =>
    ({ method, path } as express.Request);

  assert.equal(shouldSkipGeneralRateLimit(request("GET", "/health")), true);
  assert.equal(
    shouldSkipGeneralRateLimit(
      request("POST", "/payments/webhook/hitpay/"),
    ),
    true,
  );
  assert.equal(shouldSkipGeneralRateLimit(request("OPTIONS", "/feed")), true);
  assert.equal(shouldSkipGeneralRateLimit(request("GET", "/feed")), false);
});
