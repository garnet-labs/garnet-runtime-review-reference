// Build step: resolve the @kolbo/mcp entrypoints and confirm the package is
// installed and shaped as expected. This reads package metadata only and does
// not import or execute any package code.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const pkgJsonPath = require.resolve('@kolbo/mcp/package.json');
const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

console.log(`@kolbo/mcp resolved: ${pkg.name}@${pkg.version}`);
console.log(`  main: ${pkg.main || '(none)'}`);
console.log(`  bin : ${JSON.stringify(pkg.bin || {})}`);

// Confirm the advertised binary is present on disk.
const binRel = typeof pkg.bin === 'string'
  ? pkg.bin
  : Object.values(pkg.bin || {})[0];
const binPath = binRel && require.resolve(`@kolbo/mcp/${binRel}`);
if (!binPath || !existsSync(binPath)) {
  console.error('build: expected server binary not found');
  process.exit(1);
}
console.log(`  server binary present: ${binPath}`);
console.log('build ok');
