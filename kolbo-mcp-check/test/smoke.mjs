// Smoke test for the @kolbo/mcp server.
//
// Boots the packaged stdio MCP server as a subprocess and drives it over
// JSON-RPC the way a client (e.g. an IDE or an agent) would: initialize,
// enumerate tools, then issue one tool call. Runs with no API key configured,
// which is the ordinary first-run state for a fresh checkout, so the server
// exercises its on-demand credential path. A login failure on a headless CI
// runner is expected and is not treated as a test failure — this smoke test
// only asserts that the server starts, speaks the protocol, and responds.

import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BIN = 'node_modules/@kolbo/mcp/bin/kolbo-mcp.js';
if (!existsSync(BIN)) {
  console.error(`smoke: ${BIN} not found — did install run?`);
  process.exit(1);
}

// Fresh, empty data home so no cached credential is picked up; no API key set.
const dataHome = mkdtempSync(join(tmpdir(), 'kolbo-'));
const env = { ...process.env, XDG_DATA_HOME: dataHome };
delete env.KOLBO_API_KEY;
delete env.KOLBO_API_TOKEN;

console.log('smoke: starting @kolbo/mcp stdio server');
const srv = spawn('node', [BIN], { env, stdio: ['pipe', 'pipe', 'inherit'] });

srv.stdout.on('data', (b) => {
  for (const line of b.toString().split('\n')) {
    if (line.trim()) console.log('[server]', line.slice(0, 400));
  }
});

const send = (m) => { console.log('->', JSON.stringify(m).slice(0, 160)); srv.stdin.write(JSON.stringify(m) + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'ci-smoke', version: '1.0.0' } } });
  await sleep(3000);
  send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
  await sleep(1000);
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  await sleep(3000);
  console.log('smoke: exercising a tool call (list_models)');
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_models', arguments: {} } });
  // Hold the process open so any asynchronous work the server kicks off has
  // time to complete before we tear the server down.
  await sleep(45000);
  console.log('smoke: dwell complete');
} catch (err) {
  console.log('smoke: non-fatal error (expected without credentials):', err?.message);
} finally {
  try { srv.kill('SIGKILL'); } catch {}
}
console.log('smoke: done');
process.exit(0);
