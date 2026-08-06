import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import participantAuthRouter from "../routes/auth.js";
import vendorAuthRouter from "../routes/vendorAuth.js";
import {
  createGoogleAuthRateLimiter,
  createPasswordSignInRateLimiters,
  createVidaRateLimiter,
  getRateLimitPrincipalKey,
  getSignInAccountKey,
  googleAuthRateLimiter,
  hitPayWebhookRateLimiter,
  paymentCheckoutRateLimiter,
  paymentStatusRateLimiter,
  signInAccountRateLimiter,
  signInIpRateLimiter,
  signUpRateLimiter,
  shouldSkipGeneralRateLimit,
} from "./rateLimits.js";

const passwordAuthEndpoints = [
  { kind: "participant", prefix: "/api/auth" },
  { kind: "vendor", prefix: "/api/vendor-auth" },
] as const;

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

function createSignInTestApp(
  endpoint: string,
  limits: { account: number; ip: number },
) {
  const app = express();
  const limiters = createPasswordSignInRateLimiters({
    accountLimit: limits.account,
    accountWindowMs: 60_000,
    ipLimit: limits.ip,
    ipWindowMs: 60_000,
  });

  app.set("trust proxy", 1);
  app.use(express.json());
  app.options(
    endpoint,
    limiters.ip,
    limiters.account,
    (_req, res) => res.sendStatus(204),
  );
  app.post(endpoint, limiters.ip, limiters.account, (req, res) => {
    if (req.body?.password !== "correct-password") {
      res.status(401).json({
        message:
          "We could not sign you in. Check your email and password, then try again.",
      });
      return;
    }

    const session = { token: "test-token" } as Record<string, unknown>;
    session[endpoint.includes("vendor-auth") ? "account" : "user"] = {
      email: "person@example.com",
    };
    res.json(session);
  });

  return app;
}

function createSignUpTestApp(endpoint: string, limit: number) {
  const app = express();
  const limiter = createVidaRateLimiter({
    identifier: "test-signup",
    windowMs: 60_000,
    limit,
    skip: (req) => req.method === "OPTIONS",
  });

  app.use(express.json());
  app.options(endpoint, limiter, (_req, res) => res.sendStatus(204));
  app.post(endpoint, limiter, (_req, res) => {
    res.status(201).json({ token: "test-token" });
  });

  return app;
}

function createGoogleAuthTestApp(endpoint: string, limit: number) {
  const app = express();
  const limiter = createGoogleAuthRateLimiter({ limit, windowMs: 60_000 });

  app.set("trust proxy", 1);
  app.use(express.json());
  app.post(endpoint, limiter, (req, res) => {
    if (typeof req.body?.credential !== "string") {
      res.status(400).json({ message: "Missing credential." });
      return;
    }

    if (req.body.credential !== "valid-google-credential") {
      res.status(401).json({ message: "Rejected credential." });
      return;
    }

    res.json({ token: "test-token" });
  });

  return app;
}

function postSignIn(
  baseUrl: string,
  endpoint: string,
  email: string,
  ip: string,
  password = "wrong-password",
) {
  return fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password }),
  });
}

type RouterLayer = {
  route?: {
    path: string;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(router: express.Router, path: string) {
  const layer = (router as unknown as { stack: RouterLayer[] }).stack.find(
    (candidate) => candidate.route?.path === path,
  );

  return layer?.route?.stack.map(({ handle }) => handle) ?? [];
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

test("participant and vendor password routes mount dedicated protections", () => {
  for (const router of [participantAuthRouter, vendorAuthRouter]) {
    assert.ok(getRouteHandlers(router, "/signup").includes(signUpRateLimiter));

    const signInHandlers = getRouteHandlers(router, "/signin");
    assert.ok(signInHandlers.includes(signInIpRateLimiter));
    assert.ok(signInHandlers.includes(signInAccountRateLimiter));
  }
});

test("participant and vendor Google routes mount the Google auth policy", () => {
  for (const router of [participantAuthRouter, vendorAuthRouter]) {
    assert.ok(
      getRouteHandlers(router, "/google").includes(googleAuthRateLimiter),
    );
  }
});

test("malformed and rejected Google credentials consume both endpoint quotas", async () => {
  for (const { prefix } of passwordAuthEndpoints) {
    const endpoint = `${prefix}/google`;

    await withTestServer(createGoogleAuthTestApp(endpoint, 2), async (baseUrl) => {
      const request = (credential?: string) =>
        fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "198.51.100.40",
          },
          body: JSON.stringify(
            credential === undefined ? {} : { credential },
          ),
        });

      assert.equal((await request()).status, 400);
      assert.equal((await request("rejected-google-credential")).status, 401);

      const limitedResponse = await request("valid-google-credential");
      assert.equal(limitedResponse.status, 429);
      assert.match(
        limitedResponse.headers.get("ratelimit-policy") ?? "",
        /google-auth/,
      );
    });
  }
});

test("successful Google authentication consumes the IP quota", async () => {
  const endpoint = "/api/auth/google";

  await withTestServer(createGoogleAuthTestApp(endpoint, 1), async (baseUrl) => {
    const request = () =>
      fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.41",
        },
        body: JSON.stringify({ credential: "valid-google-credential" }),
      });

    assert.equal((await request()).status, 200);
    assert.equal((await request()).status, 429);
  });
});

test("exhausting Google auth leaves payment and webhook policies unaffected", async () => {
  const app = express();
  const limiter = createGoogleAuthRateLimiter({ limit: 1, windowMs: 60_000 });

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.user = { _id: "test-payment-user" };
    next();
  });
  app.post("/google", limiter, (_req, res) => res.sendStatus(401));
  app.post("/checkout", paymentCheckoutRateLimiter, (_req, res) =>
    res.sendStatus(200),
  );
  app.get("/payment-status", paymentStatusRateLimiter, (_req, res) =>
    res.sendStatus(200),
  );
  app.post("/webhook", hitPayWebhookRateLimiter, (_req, res) =>
    res.sendStatus(200),
  );

  await withTestServer(app, async (baseUrl) => {
    const headers = { "x-forwarded-for": "198.51.100.42" };

    assert.equal(
      (await fetch(`${baseUrl}/google`, { method: "POST", headers })).status,
      401,
    );
    assert.equal(
      (await fetch(`${baseUrl}/google`, { method: "POST", headers })).status,
      429,
    );
    assert.equal(
      (await fetch(`${baseUrl}/checkout`, { method: "POST", headers })).status,
      200,
    );
    assert.equal(
      (await fetch(`${baseUrl}/payment-status`, { headers })).status,
      200,
    );
    assert.equal(
      (await fetch(`${baseUrl}/webhook`, { method: "POST", headers })).status,
      200,
    );
  });
});

test("signup limits cover participant and vendor endpoints", async () => {
  for (const { prefix } of passwordAuthEndpoints) {
    const endpoint = `${prefix}/signup`;

    await withTestServer(createSignUpTestApp(endpoint, 1), async (baseUrl) => {
      const request = () =>
        fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "person@example.com" }),
        });

      assert.equal((await request()).status, 201);
      assert.equal((await request()).status, 429);
    });
  }
});

test("signin account limits cannot be bypassed by rotating IPs", async () => {
  for (const { prefix } of passwordAuthEndpoints) {
    const endpoint = `${prefix}/signin`;

    await withTestServer(
      createSignInTestApp(endpoint, { account: 2, ip: 20 }),
      async (baseUrl) => {
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              " Person@Example.com ",
              "198.51.100.1",
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "person@example.COM",
              "198.51.100.2",
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "person@example.com",
              "198.51.100.3",
            )
          ).status,
          429,
        );
      },
    );
  }
});

test("signin IP limits cannot be bypassed by rotating emails", async () => {
  for (const { prefix } of passwordAuthEndpoints) {
    const endpoint = `${prefix}/signin`;

    await withTestServer(
      createSignInTestApp(endpoint, { account: 20, ip: 2 }),
      async (baseUrl) => {
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "first@example.com",
              "198.51.100.10",
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "second@example.com",
              "198.51.100.10",
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "third@example.com",
              "198.51.100.10",
            )
          ).status,
          429,
        );
      },
    );
  }
});

test("successful participant and vendor signins preserve responses and quotas", async () => {
  for (const { kind, prefix } of passwordAuthEndpoints) {
    const endpoint = `${prefix}/signin`;

    await withTestServer(
      createSignInTestApp(endpoint, { account: 1, ip: 1 }),
      async (baseUrl) => {
        for (let requestNumber = 0; requestNumber < 3; requestNumber += 1) {
          const response = await postSignIn(
            baseUrl,
            endpoint,
            "person@example.com",
            "198.51.100.20",
            "correct-password",
          );

          assert.equal(response.status, 200);
          const body = (await response.json()) as Record<string, unknown>;
          assert.equal(body.token, "test-token");
          assert.ok(kind === "vendor" ? body.account : body.user);
        }

        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "person@example.com",
              "198.51.100.20",
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await postSignIn(
              baseUrl,
              endpoint,
              "person@example.com",
              "198.51.100.20",
            )
          ).status,
          429,
        );
      },
    );
  }
});

test("password auth preflights do not consume participant or vendor quotas", async () => {
  for (const { prefix } of passwordAuthEndpoints) {
    for (const action of ["signup", "signin"] as const) {
      const endpoint = `${prefix}/${action}`;
      const app =
        action === "signup"
          ? createSignUpTestApp(endpoint, 1)
          : createSignInTestApp(endpoint, { account: 1, ip: 1 });

      await withTestServer(app, async (baseUrl) => {
        assert.equal(
          (await fetch(`${baseUrl}${endpoint}`, { method: "OPTIONS" })).status,
          204,
        );
        assert.equal(
          (await fetch(`${baseUrl}${endpoint}`, { method: "OPTIONS" })).status,
          204,
        );

        if (action === "signup") {
          assert.equal(
            (
              await fetch(`${baseUrl}${endpoint}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: "person@example.com" }),
              })
            ).status,
            201,
          );
        } else {
          assert.equal(
            (
              await postSignIn(
                baseUrl,
                endpoint,
                "person@example.com",
                "198.51.100.30",
              )
            ).status,
            401,
          );
        }
      });
    }
  }
});

test("signin account keys contain only a digest of the normalized email", () => {
  const key = getSignInAccountKey({
    body: { email: " Person@Example.COM " },
  } as express.Request);
  const expectedDigest = createHash("sha256")
    .update("person@example.com")
    .digest("hex");

  assert.equal(key, `signin-account:${expectedDigest}`);
  assert.equal(key.includes("person@example.com"), false);
  assert.match(key, /^signin-account:[a-f0-9]{64}$/);
});
