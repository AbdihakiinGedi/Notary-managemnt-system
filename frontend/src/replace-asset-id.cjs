const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'pages');
const compDir = path.join(__dirname, 'components');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Add import if not present and we need it
  if (content.match(/p\.reference_id|property\.id|p\.id\.slice|selectedProp\?\.id/)) {
    if (!content.includes('formatAssetId')) {
      content = "import formatAssetId from '../utils/formatAssetId';\n" + content;
    }
  }

  // Replace {p.reference_id} -> {formatAssetId(p.id)}
  content = content.replace(/\{p\.reference_id\}/g, '{formatAssetId(p.id)}');
  // Replace {p.id.slice(0, 8)}...{p.id.slice(-4)} -> {formatAssetId(p.id)}
  content = content.replace(/\{p\.id\.slice\(0,\s*8\)\}\.\.\.\{p\.id\.slice\(-4\)\}/g, '{formatAssetId(p.id)}');
  // Replace {property.id} -> {formatAssetId(property.id)} where used as display
  content = content.replace(/Property ID:\s*\{property\.id\}/g, 'Asset ID: {formatAssetId(property.id)}');
  
  // Replace references in Transfers.jsx option
  content = content.replace(/key=\{p\.reference_id\}\s*value=\{p\.reference_id\}/g, 'key={p.id} value={p.id}');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Asset IDs in: ${filePath}`);
  }
};

const walk = (dir) => {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.jsx')) {
      replaceInFile(filePath);
    }
  });
};

walk(srcDir);
walk(compDir);
console.log('Asset ID replacement complete.');
