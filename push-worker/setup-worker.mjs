#!/usr/bin/env node
// Secure helper: reads a service-account JSON locally and pipes values to Wrangler secrets.
// Never copy the JSON into this project or commit it to source control.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const credentialPath = process.argv[2];
if (!credentialPath) {
  console.error('Usage: node setup-worker.mjs /absolute/path/to/NEW-service-account.json');
  process.exit(2);
}
const resolved = path.resolve(credentialPath);
let sa;
try { sa = JSON.parse(fs.readFileSync(resolved, 'utf8')); }
catch { console.error('Cannot read/parse service-account JSON.'); process.exit(2); }
if (sa.project_id !== 'crizon-6f77e' || !sa.client_email || !sa.private_key) {
  console.error('Credential file is missing required fields or belongs to a different Firebase project.');
  process.exit(2);
}
console.log('This script will store the new service-account email/private key as Cloudflare Worker secrets.');
console.log('The JSON file itself will not be copied into this folder or uploaded to Git.');

function putSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', 'secret', 'put', name], { stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`wrangler secret put ${name} exited ${code}`)));
    child.stdin.end(value);
  });
}
try {
  await putSecret('FIREBASE_CLIENT_EMAIL', sa.client_email);
  await putSecret('FIREBASE_PRIVATE_KEY', sa.private_key);
  console.log('\nSecrets uploaded. Deploy with: npx wrangler deploy');
} catch (e) {
  console.error('\nSecret setup failed:', e.message);
  process.exit(1);
}
