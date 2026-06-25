/**
 * config/keys.js
 *
 * Loads the Ed25519 private key from disk and exposes:
 *  - privateKeyBuffer  — raw Buffer of the PEM/raw key (consumed by the SDK)
 *  - publicJwks        — the JSON Web Key Set served at GET /jwks.json
 *
 * Key generation (run once, keep keys/ out of git):
 *   node -e "
 *     const { generateKeyPairSync } = require('crypto');
 *     const { privateKey, publicKey } = generateKeyPairSync('ed25519');
 *     require('fs').writeFileSync('./keys/private.key', privateKey.export({ type:'pkcs8', format:'pem' }));
 *     const jwk = publicKey.export({ format:'jwk' });
 *     require('fs').writeFileSync('./keys/public.json', JSON.stringify({ keys: [{ ...jwk, kid: 'key-1', alg: 'EdDSA' }] }, null, 2));
 *   "
 */

"use strict";

const fs = require("fs");
const path = require("path");

const KEY_DIR = path.resolve(__dirname, "../../../../keys");

let privateKeyBuffer;
let publicJwks;

try {
  privateKeyBuffer = fs.readFileSync(path.join(KEY_DIR, "private.key"));
  publicJwks = JSON.parse(fs.readFileSync(path.join(KEY_DIR, "public.json"), "utf8"));
} catch {
  console.warn(
    "[keys] Key files not found in ./keys/. " +
    "Run the key-generation command in config/keys.js to create them before starting the server."
  );
  privateKeyBuffer = null;
  publicJwks = { keys: [] };
}

module.exports = { privateKeyBuffer, publicJwks };
