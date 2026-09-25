#!/usr/bin/env node
// Copies addon/KithKinKeys into World of Warcraft/_retail_/Interface/AddOns.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'bot', '.env') });

const roots = [process.env.WOW_PATH].filter(Boolean);
for (const d of ['C', 'D', 'E', 'F', 'G']) {
  roots.push(`${d}:\\Program Files (x86)\\World of Warcraft\\_retail_`, `${d}:\\Program Files\\World of Warcraft\\_retail_`,
    `${d}:\\World of Warcraft\\_retail_`, `${d}:\\Games\\World of Warcraft\\_retail_`, `${d}:\\Battle.net\\World of Warcraft\\_retail_`);
}
const root = roots.find(r => fs.existsSync(path.join(r, 'Interface')) || fs.existsSync(path.join(r, 'Wow.exe')));
if (!root) {
  console.error('World of Warcraft not found. Add WOW_PATH=...\\World of Warcraft\\_retail_ to bot/.env and run again.');
  process.exit(1);
}
const src = path.join(__dirname, '..', 'addon', 'KithKinKeys');
const dest = path.join(root, 'Interface', 'AddOns', 'KithKinKeys');
fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) fs.copyFileSync(path.join(src, file), path.join(dest, file));
console.log(`Installed KithKinKeys to ${dest}`);
