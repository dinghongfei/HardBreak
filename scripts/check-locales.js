#!/usr/bin/env node
/**
 * HardBreak 多语言一致性校验
 *
 * 用法: node scripts/check-locales.js
 *
 * 校验内容：
 *   1. 各语言 tips 条数一致，且等于 lib.rs 中 rand::random_range 的区间
 *   2. configMessages / breakMessages 键集在所有语言间完全一致
 *   3. HB_LANG_MATCH 的映射目标、HB_FALLBACK_LANG 都存在于 HB_LOCALES
 *   4. lib.rs 的 LOCALES 表（托盘菜单/通知）覆盖 HB_LOCALES 全部语言
 *
 * 任一项失败以非零码退出，可用于 CI 或提交前自查。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

globalThis.window = globalThis;
eval(fs.readFileSync(path.join(root, 'src/locales.js'), 'utf8'));

const locales = window.HB_LOCALES;
const codes = Object.keys(locales);
const libRs = fs.readFileSync(path.join(root, 'src-tauri/src/lib.rs'), 'utf8');

let failures = 0;
const fail = (msg) => { failures++; console.error('  ✗ ' + msg); };
const pass = (msg) => console.log('  ✓ ' + msg);

// 1. tips 条数：与 lib.rs 随机区间一致，且各语言等长
const rangeMatch = libRs.match(/random_range\(0\.\.(\d+)\)/);
const expected = rangeMatch ? parseInt(rangeMatch[1], 10) : 30;
console.log(`[tips] 期望 ${expected} 条（取自 lib.rs 随机区间）`);
for (const code of codes) {
  const n = locales[code].tips.length;
  n === expected ? pass(`${code}: ${n}`) : fail(`${code}: ${n}，应为 ${expected}`);
}

// 2. 两个文案表的键集在所有语言间一致
function checkKeys(field) {
  console.log(`[${field}] 键集一致性`);
  const refKeys = Object.keys(locales[codes[0]][field]).sort();
  for (const code of codes) {
    const keys = Object.keys(locales[code][field]).sort();
    const missing = refKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !refKeys.includes(k));
    if (missing.length === 0 && extra.length === 0) {
      pass(`${code}: ${keys.length} 个键`);
    } else {
      fail(`${code}: 缺 [${missing.join(', ') || '无'}]；多 [${extra.join(', ') || '无'}]`);
    }
  }
}
checkKeys('configMessages');
checkKeys('breakMessages');

// 3. 语言映射与回退目标必须存在
console.log('[HB_LANG_MATCH / HB_FALLBACK_LANG]');
for (const [, code] of window.HB_LANG_MATCH) {
  locales[code] ? pass(`映射目标 ${code}`) : fail(`映射目标 ${code} 不在 HB_LOCALES 中`);
}
locales[window.HB_FALLBACK_LANG]
  ? pass(`回退语言 ${window.HB_FALLBACK_LANG}`)
  : fail(`回退语言 ${window.HB_FALLBACK_LANG} 不在 HB_LOCALES 中`);

// 4. lib.rs LOCALES 表必须覆盖全部语言（托盘菜单与休息前通知）
console.log('[lib.rs LOCALES]');
const localesBlock = libRs.match(/const LOCALES[\s\S]*?\];/);
const rustCodes = localesBlock ? [...localesBlock[0].matchAll(/code: "([^"]+)"/g)].map((m) => m[1]) : [];
for (const code of codes) {
  rustCodes.includes(code) ? pass(`${code}`) : fail(`${code} 缺少 lib.rs LOCALES 行`);
}

if (failures > 0) {
  console.error(`\n${failures} 项校验失败`);
  process.exit(1);
}
console.log('\n全部通过');
