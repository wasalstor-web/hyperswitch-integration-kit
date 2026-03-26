import assert from "node:assert/strict";
import test from "node:test";
import { readPaymentGatewayOAuthConfig } from "./payment-provider-oauth.js";

test("readPaymentGatewayOAuthConfig returns null when vars missing", () => {
  delete process.env.PAYMENT_GATEWAY_TOKEN_URL;
  delete process.env.PAYMENT_GATEWAY_CLIENT_ID;
  delete process.env.PAYMENT_GATEWAY_CLIENT_SECRET;
  assert.equal(readPaymentGatewayOAuthConfig(), null);
});

test("readPaymentGatewayOAuthConfig parses when all required set", () => {
  process.env.PAYMENT_GATEWAY_TOKEN_URL = "https://idp.example/oauth/token";
  process.env.PAYMENT_GATEWAY_CLIENT_ID = "id";
  process.env.PAYMENT_GATEWAY_CLIENT_SECRET = "secret";
  process.env.PAYMENT_GATEWAY_SCOPE = "pay.read";
  process.env.PAYMENT_GATEWAY_AUTH_MODE = "basic";
  const c = readPaymentGatewayOAuthConfig();
  assert.ok(c);
  assert.equal(c.tokenUrl, "https://idp.example/oauth/token");
  assert.equal(c.clientId, "id");
  assert.equal(c.clientSecret, "secret");
  assert.equal(c.scope, "pay.read");
  assert.equal(c.authMode, "basic");
  delete process.env.PAYMENT_GATEWAY_TOKEN_URL;
  delete process.env.PAYMENT_GATEWAY_CLIENT_ID;
  delete process.env.PAYMENT_GATEWAY_CLIENT_SECRET;
  delete process.env.PAYMENT_GATEWAY_SCOPE;
  delete process.env.PAYMENT_GATEWAY_AUTH_MODE;
});
