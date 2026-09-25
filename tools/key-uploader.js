#!/usr/bin/env node
/**
 * Kith & Kin key uploader.
 * Watches the KithKinKeys addon's SavedVariables file and sends new keystones to the site.
 *
 *   node tools/key-uploader.js           keep running, upload whenever WoW saves (/reload or logout)
 *   node tools/key-uploader.js --once    upload once and exit
 *
 * Settings come from bot/.env: SYNC_SECRET (required), WOW_PATH (optional), SITE_URL (optional).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'bot', '.env') });

const SITE_URL = (process.env.SITE_URL || 'https://knkmplus.netlify.app').replace(/\/$/, '');
const SECRET = process.env.SYNC_SECRET || '';
const ONCE = process.argv.includes('--once');

function candidateRoots() {
  const list = [];
  if (process.env.WOW_PATH) list.push(process.env.WOW_PATH);
  for (const drive of ['C', 'D', 'E', 'F', 'G']) {
    list.push(`${drive}:\\Program Files (x86)\\World of Warcraft\\_retail_`);
    list.push(`${drive}:\\Program Files\\World of Warcraft\\_retail_`);
    list.push(`${drive}:\\World of Warcraft\\_retail_`);
    list.push(`${drive}:\\Games\\World of Warcraft\\_retail_`);
    list.push(`${drive}:\\Battle.net\\World of Warcraft\\_retail_`);
  }
  list.push('/Applications/World of Warcraft/_retail_');
  return list;
}

function savedVariableFiles() {
  const files = [];
  for (const root of candidateRoots()) {
    const accounts = path.join(root, 'WTF', 'Account');
    let names = [];
    try { names = fs.readdirSync(accounts); } catch (err) { continue; }
    for (const account of names) {
      const file = path.join(accounts, account, 'SavedVariables', 'KithKinKeys.lua');
      if (fs.existsSync(file)) files.push(file);
    }
  }
  return files;
}

// Reads the simple table the addon writes: KithKinKeysDB = { ["keys"] = { ["Name-Realm"] = { ["level"] = 12, ... }, ... } }
function parseSavedVariables(text) {
  const keys = [];
  const start = text.indexOf('["keys"]');
  if (start === -1) return keys;
  const blockRe = /\["([^"]+)"\]\s*=\s*\{([^{}]*)\}/g;
  blockRe.lastIndex = start;
  let m;
  while ((m = blockRe.exec(text))) {
    const entry = {};
    const fieldRe = /\["(\w+)"\]\s*=\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)/g;
    let f;
    while ((f = fieldRe.exec(m[2]))) {
      const raw = f[2];
      entry[f[1]] = raw.startsWith('"') ? raw.slice(1, -1).replace(/\\(.)/g, '$1') : (raw === 'true' ? true : raw === 'false' ? false : Number(raw));
    }
    if (entry.name && entry.level) keys.push(entry);
  }
  return keys;
}

async function upload(file) {
  const keys = parseSavedVariables(fs.readFileSync(file, 'utf8'));
  if (!keys.length) {
    console.log(`[keys] ${file}: no keystones yet (type /kkkeys in game, then /reload)`);
    return;
  }
  const res = await fetch(`${SITE_URL}/api/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sync-secret': SECRET },
    body: JSON.stringify({ source: 'KithKinKeys', keys })
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
  console.log(`[keys] ${new Date().toLocaleTimeString()} sent ${keys.length} keys → matched ${out.matched}, updated ${out.updated}, not on roster ${out.unknown}, old ${out.stale}`);
}

async function main() {
  if (!SECRET) {
    console.error('SYNC_SECRET is missing from bot/.env');
    process.exit(1);
  }
  const seen = new Map();
  const tick = async () => {
    const files = savedVariableFiles();
    if (!files.length && !tick.warned) {
      tick.warned = true;
      console.log('[keys] KithKinKeys.lua not found yet. In WoW: /kkkeys, then /reload. (Set WOW_PATH in bot/.env if WoW is somewhere unusual.)');
    }
    for (const file of files) {
      const mtime = fs.statSync(file).mtimeMs;
      if (seen.get(file) === mtime) continue;
      try {
        await upload(file);
        seen.set(file, mtime);
      } catch (err) {
        console.error(`[keys] upload failed (${err.message}); will retry`);
      }
    }
  };
  await tick();
  if (ONCE) return;
  console.log('[keys] watching for /reload or logout… (Ctrl+C to stop)');
  setInterval(tick, 20000);
}

if (require.main === module) main();
module.exports = { parseSavedVariables };
