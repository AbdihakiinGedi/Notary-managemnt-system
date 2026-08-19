const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/c048a971-3d30-44bf-975f-06a4bf956804/.system_generated/logs/transcript_full.jsonl', 'utf8');
const fileLines = {};
const matches = content.matchAll(/(\\n|^)(\d+): (.*?)(?=\\n|$)/g);
for (const match of matches) {
  const num = parseInt(match[2]);
  if (fileLines[num] === undefined) {
    fileLines[num] = match[3];
  }
}
const out = [];
const keys = Object.keys(fileLines).map(Number);
if (keys.length === 0) {
  console.log("No lines found.");
  process.exit(0);
}
const max = Math.max(...keys);
for (let i=1; i<=max; i++) {
  if (fileLines[i] !== undefined) {
    let l = fileLines[i].replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '\\r').replace(/\\\\"/g, '"');
    out.push(l);
  } else {
    out.push('// MISSING LINE ' + i);
  }
}
fs.writeFileSync('backend/routes/propertyRoutes.js.recovered2', out.join('\n'));
console.log(`Recovered ${keys.length} lines up to line ${max}.`);
