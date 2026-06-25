# PavelPayments

A pay-as-you-use billing platform built on the **Interledger Open Payments** protocol.
Users are charged only for the services they actually consume — no flat subscription fees,
no cancellation penalties.

Supports two services:
- **Gym** — charged per visit day; amount reduces the longer you stay, adjusts for peak hours.
  Also supports flat static subscriptions (weekly / monthly / yearly) for users who prefer a fixed fee.
- **Streaming** — charged per minute of content watched; settled at midnight each day.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB CLIENT  (Next.js 14)                      │
│                                                                   │
│  Dashboard  GymDashboard  GymHistory  StreamingDashboard         │
│  GymSubscribe  GymMockTerminal  MockVideoPlayer                  │
│                                                                   │
│  Web NFC API (Android Chrome) → tap phone on gym terminal        │
│  Falls back to on-screen buttons on other browsers               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                  CORE BACKEND  (Node.js + Express)               │
│                                                                   │
│  Gym routes          /api/gym/tap-in, /tap-out, /session,        │
│                      /subscribe, /pricing, /history              │
│  Streaming routes    /api/stream/start, /end, /session,          │
│                      /subscribe, /pricing                        │
│  Grant routes        /api/grants/initiate, /grants/callback      │
│  JWKS                /jwks.json                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  billing.js  │  │ gym-session  │  │  streaming-session   │   │
│  │  (pricing    │  │  (tap-in/out │  │  (play/pause/end)    │   │
│  │   engine)    │  │   daily sum) │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  settlement.js  ← node-cron @ 00:00 every night          │    │
│  │  Sums sessions → billing engine → Open Payments payment   │    │
│  │  Writes DailySettlement record                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  PostgreSQL 16  ·  Redis 7  (via Docker Compose)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ @interledger/open-payments SDK
┌──────────────────────────▼──────────────────────────────────────┐
│            INTERLEDGER OPEN PAYMENTS NETWORK                     │
│  wallet.interledger-test.dev  (testnet — no real money)         │
│  GNAP grant → user approves → access token stored in Mandate     │
│  Outgoing payment created per settlement                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │  EDGE TERMINAL     │
                    │  (Node.js)         │
                    │  NFC scan → HTTP   │
                    │  POST to backend   │
                    └────────────────────┘
```

---

## How Gym Billing Works

### Dynamic (pay-as-you-go)

1. User subscribes via `GymSubscribe` → backend initiates GNAP grant → user approves at their wallet.
2. User taps in (NFC card, phone NFC, or web button) → `POST /api/gym/tap-in` opens a `GymSession`.
3. User taps out → `POST /api/gym/tap-out` closes session, writes `minutesAccumulated`.
4. At **midnight** the `settlement.js` cron fires:
   - Auto-closes any forgotten open sessions.
   - Sums all closed sessions for the day.
   - Calls `calculateGymDynamicCharge()`:

```
charge = base_rate − duration_discount + peak_adjustment

base_rate          per tier:  daily=$6.00  weekly=$5.00  monthly=$4.00  yearly=$3.00
duration_discount  linear 0→50% off as total minutes grows from 0→120
peak_adjustment    +$0.50 if >50% minutes are in peak hours; −$0.30 otherwise
peak hours         06:00–09:00 and 17:00–20:00 local time
```

   - Fires `outgoingPayment.create()` via Open Payments SDK.
   - Writes `DailySettlement` (status: charged / skipped / failed).
   - If user did not visit → status is `skipped`, no charge.

### Static (flat subscription)

Same flow but `calculateGymStaticCharge()` returns a fixed amount regardless of visit duration:

| Tier    | Flat Charge |
|---------|------------|
| Daily   | $6.00      |
| Weekly  | $28.00     |
| Monthly | $80.00     |
| Yearly  | $800.00    |

For weekly/monthly/yearly static plans, the GNAP grant includes an `interval` limit so the wallet
provider enforces the per-period spending cap at the authorization layer.

---

## How Streaming Billing Works

1. User subscribes via `StreamingDashboard` (same GNAP flow as gym).
2. User presses Play on `MockVideoPlayer` → `POST /api/stream/start` opens a `StreamSession`.
3. User pauses/stops → `POST /api/stream/end` closes session, writes `minutesWatched`.
4. At **midnight** the same settlement cron processes streaming subscriptions:
   - Sums all `minutesWatched` for the day.
   - Applies `calculateStreamingCharge()`:

```
charge = totalMinutes × ratePerMinute

ratePerMinute  daily=$0.05  weekly=$0.04  monthly=$0.03  yearly=$0.02
```

---

## Database Schema

| Table             | Purpose |
|-------------------|---------|
| `Users`           | NFC UID → wallet address mapping |
| `Mandates`        | Open Payments access token per user (stored after GNAP consent) |
| `Subscriptions`   | A user's chosen plan (serviceType, type, tier, isActive) |
| `GymSessions`     | Tap-in/tap-out records — one per gym visit segment |
| `DailySettlements`| One record per user per day — written by midnight cron |
| `StreamSessions`  | Play/pause records — one per streaming segment |
| `Transactions`    | Open Payments payment records |

---

## Stack

| Layer            | Technology |
|------------------|-----------|
| Backend          | Node.js 20, Express 4 |
| ORM              | Sequelize 6 + PostgreSQL 16 |
| Payments SDK     | `@interledger/open-payments` |
| Auth protocol    | GNAP + HTTP Signatures (Ed25519) |
| Cron             | `node-cron` |
| Frontend         | Next.js 14, React 18, TypeScript |
| NFC (phone)      | Web NFC API (`navigator.nfc`) + button fallback |
| Containers       | Docker Compose |
| Testnet          | wallet.interledger-test.dev |

---

## Setup

### 1. Prerequisites

- Docker Desktop running
- Node.js 20+
- An account at [wallet.interledger-test.dev](https://wallet.interledger-test.dev/)

### 2. Generate Ed25519 keys

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
fs.writeFileSync('./keys/private.key', privateKey.export({ type:'pkcs8', format:'pem' }));
const jwk = publicKey.export({ format:'jwk' });
fs.writeFileSync('./keys/public.json', JSON.stringify({ keys: [{ ...jwk, kid: 'key-1', alg: 'EdDSA' }] }, null, 2));
console.log('Keys written.');
"
```

Upload the public key to your testnet wallet: Settings → Developer Keys → Add Key.

### 3. Configure environment

Copy and fill in:

```bash
cp .env.example .env
```

Required variables:

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pavel_payments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

REDIS_URL=redis://localhost:6379

WALLET_ADDRESS=https://ilp.interledger-test.dev/yourname
KEY_ID=<uuid-from-testnet-wallet>

BACKEND_PUBLIC_URL=http://localhost:4001
FRONTEND_URL=http://localhost:3000

NODE_ENV=development
```

### 4. Start infrastructure

```bash
docker-compose up -d
```

### 5. Install and run

```bash
npm install
npm run dev          # starts backend (:4001) + web client (:3000) concurrently
```

### 6. Verify

```bash
curl http://localhost:4001/health   # {"status":"ok"}
curl http://localhost:4001/api/gym/pricing
```

---

## API Reference

### Gym

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| POST | `/api/gym/tap-in` | `{ uid, terminalId? }` | Record gym entry |
| POST | `/api/gym/tap-out` | `{ uid, terminalId? }` | Record gym exit |
| GET | `/api/gym/session/:uid` | — | Live session status + estimated charge |
| POST | `/api/gym/subscribe` | `{ walletAddress, nfcUid, subscriptionType, tier }` | Initiate GNAP grant + create subscription |
| GET | `/api/gym/subscriptions/:uid` | — | Active subscriptions |
| GET | `/api/gym/pricing` | — | Rate constants for frontend |
| GET | `/api/gym/history/:uid` | — | DailySettlement records (last 90 days) |

### Streaming

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| POST | `/api/stream/start` | `{ uid, contentId, contentTitle?, contentType? }` | Start stream session |
| POST | `/api/stream/end` | `{ sessionId }` | End stream session |
| GET | `/api/stream/session/:uid` | — | Current session + today's minutes + estimated charge |
| POST | `/api/stream/subscribe` | `{ walletAddress, nfcUid, subscriptionType, tier }` | Subscribe |
| GET | `/api/stream/subscriptions/:uid` | — | Active subscriptions |
| GET | `/api/stream/pricing` | — | Rate constants |

### Grants & Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/grants/initiate` | Start GNAP grant (wallet connect) |
| GET | `/api/grants/callback` | GNAP redirect handler (wallet → backend) |
| POST | `/api/trigger-payment` | Legacy NFC one-shot payment trigger |
| GET | `/api/transactions` | Transaction history by wallet address |
| GET | `/jwks.json` | Public key set for HTTP Signature verification |

### Dev only

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/dev/settle-now` | Trigger settlement immediately (skips midnight wait) |

---

## Manual Settlement Test

Without waiting for midnight:

```bash
curl -X POST http://localhost:4001/api/dev/settle-now
```

---

## Key Files — AI Agent Context

> Paste this section into your AI assistant when extending this codebase.

**Project:** PavelPayments — Node.js monorepo. Backend: Express + Sequelize + PostgreSQL.
Frontend: Next.js 14 + React 18 + TypeScript. Payments: `@interledger/open-payments` SDK.

**Open Payments SDK patterns (from working code):**
```js
const client = await createAuthenticatedClient({
  walletAddressUrl, keyId,
  privateKey: keyConfig.privateKeyBuffer  // Buffer from fs.readFileSync
});

const wallet = await client.walletAddress.get({ url: walletAddressUrl });
// wallet.authServer      → use for grant.request()
// wallet.resourceServer  → use for outgoingPayment.create()
// wallet.id              → use as walletAddress in create() bodies

// Non-interactive grant:
const grant = await client.grant.request({ url: wallet.authServer }, { access_token: { access: [...] } });

// Interactive grant with interval (static recurring):
const pending = await client.grant.request({ url: wallet.authServer }, {
  access_token: { access: [{ type: "outgoing-payment", actions: [...], limits: {
    debitAmount: { value: "8000", assetCode: "USD", assetScale: 2 },
    interval: "R/2026-06-25T00:00:00Z/P1M"
  }}] },
  interact: { start: ["redirect"], finish: { method: "redirect", uri: callbackUrl, nonce } }
});

// After callback:
const final = await client.grant.continue(
  { url: pending.continue.uri, accessToken: pending.continue.access_token.value },
  { interact_ref }
);

// Create payment:
await client.outgoingPayment.create(
  { url: wallet.resourceServer, accessToken: final.access_token.value },
  { walletAddress: wallet.id, incomingAmount: { value: "600", assetCode: "USD", assetScale: 2 } }
);
```

**DB schema summary:** `Users` (id, nfcUid, walletAddress, preferredCurrency, isPremium),
`Mandates` (id, userId, accessToken, manageUrl, expiresAt, isActive),
`Subscriptions` (id, userId, mandateId, serviceType, subscriptionType, tier, baseRateCents, nextBillingDate, isActive),
`GymSessions` (id, userId, terminalId, tapInAt, tapOutAt, minutesAccumulated, date),
`DailySettlements` (id, userId, serviceType, settlementDate, totalMinutes, chargeAmountCents, currency, transactionId, status, breakdown),
`StreamSessions` (id, userId, contentId, contentTitle, contentType, startedAt, endedAt, minutesWatched, date),
`Transactions` (id, userId, walletAddress, paymentId, amount, currency, description, status).

**Key files to modify:**
- Add pricing rules → `apps/core-backend/src/services/billing.js`
- Add session logic → `apps/core-backend/src/services/gym-session.js` or `streaming-session.js`
- Add settlement logic → `apps/core-backend/src/services/settlement.js`
- Add a route → create controller in `apps/core-backend/src/controllers/`, wire in `apps/core-backend/src/index.js`
- Add a frontend page → `apps/web-client/src/pages/`, component → `apps/web-client/src/components/`

**How settlement works:**
`settlement.runDailySettlement()` runs at 00:00 via node-cron. It queries all `Subscriptions` where
`isActive=true` and `nextBillingDate <= today`. For each: auto-closes open sessions, sums daily
minutes, calls the billing engine, fires `createOutgoingPaymentFromMandate()`, writes `DailySettlement`.
Dynamic subscriptions with 0 minutes get status `skipped` (no charge). Static subscriptions always charge.
To test without waiting for midnight: `POST /api/dev/settle-now` (development only).

**GNAP callback flow:**
`POST /api/gym/subscribe` → creates pending Subscription (isActive:false) + sets cookies
(`gnap_continue_token`, `pending_subscription_id`) → returns `interactRedirectUrl`.
User approves at wallet → wallet redirects to `GET /api/grants/callback` → backend calls
`grant.continue()` → `Mandate.upsert()` → `Subscription.update({ isActive: true, mandateId })`.
