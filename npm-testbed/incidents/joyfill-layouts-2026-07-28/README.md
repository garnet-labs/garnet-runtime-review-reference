# Incident replay: `@joyfill/layouts` (npm, 2026-07-28)

## The incident

On 2026-07-28 two beta releases in the `@joyfill` namespace were published with
an **import-time** JavaScript implant. Socket's Threat Research Team documented
it in [Two Joyfill npm Beta Releases Compromised to Deliver DEV#POPPER Remote
Access Trojan](https://socket.dev/blog/joyfill-npm-beta-releases-compromised).

| | |
|---|---|
| Impacted version | `@joyfill/layouts@0.1.2-2773.beta.0` (published `2026-07-28T10:54:57Z`) |
| Clean previous version | `@joyfill/layouts@0.1.1` |
| Second impacted package | `@joyfill/components@4.0.0-rc24-2773-beta.4` |
| Trigger | module load of the CommonJS entrypoint — **no lifecycle hook**, so `--ignore-scripts` does not stop it |
| Recorded behaviour | Tron address read, Aptos account fallback, BNB Smart Chain `eth_getTransactionByHash`; a detached `node -e` child requesting `23[.]27[.]13[.]43/$/boot` with the marker header `Sec-V: A9-0135-3` |

Both impacted versions have since been removed from the registry
(`https://registry.npmjs.org/@joyfill/layouts/-/layouts-0.1.2-2773.beta.0.tgz`
returns `404`), so the real artifact cannot be installed in CI.

## What is in this directory

A **benign replay fixture** in two versions, so a PR can bump from the clean
version to the impacted one and the runtime record can show the difference.

```
src/clean/      → joyfill-layouts-replay@0.1.1
src/impacted/   → joyfill-layouts-replay@0.1.2-2773.beta.0
```

`src/impacted/index.js` reproduces the implant's **network and process shape**
at import time and nothing else. It downloads no payload, decodes nothing and
evaluates nothing. It contacts the public read-only endpoints the implant used
(`api.trongrid.io`, `fullnode.mainnet.aptoslabs.com`, `bsc-dataseed.binance.org`)
and spawns the same detached `node -e` child — but that child requests
`httpbin.org/anything`, **not** the attacker host `23[.]27[.]13[.]43`. Read the
file: everything it does is 50 lines of plain JavaScript.

Rebuild the tarballs with `./build.sh`.

## How to use it

See `.agents/skills/package-replay-demo/SKILL.md` — the replay flow that turns
this fixture into a Runtime Review comparison comment.
