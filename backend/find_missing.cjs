const fs = require('fs');
const path = require('path');

const srcDir = 'g:/silal_market_pro_parking/src';
const enPath = path.join(srcDir, 'translations', 'en.json');
const arPath = path.join(srcDir, 'translations', 'ar.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

function flattenDict(d, parentKey = '', sep = '.') {
  let items = {};
  for (const [k, v] of Object.entries(d)) {
    const newKey = parentKey ? parentKey + sep + k : k;
    if (v && typeof v === 'object') {
      Object.assign(items, flattenDict(v, newKey, sep));
    } else {
      items[newKey] = v;
    }
  }
  return items;
}

const enFlat = flattenDict(enData);
const arFlat = flattenDict(arData);

const usedKeys = new Set();
const pattern = /(?:[^a-zA-Z])t\(\s*['"`]([\w\.]+)['"`]/g;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.match(/\.(js|jsx|ts|tsx)$/)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = pattern.exec(content)) !== null) {
        usedKeys.add(match[1]);
      }
    }
  }
}

walk(srcDir);

const missingEn = [...usedKeys].filter(k => !(k in enFlat)).sort();
const missingAr = [...usedKeys].filter(k => !(k in arFlat)).sort();

console.log('Total used keys:', usedKeys.size);
console.log('Missing EN:', missingEn);
console.log('Missing AR:', missingAr);
