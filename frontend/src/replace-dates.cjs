const fs = require('fs');
const path = require('path');

const files = [
  'src/components/public/VerificationResultCard.jsx',
  'src/components/ReportTemplates.jsx',
  'src/pages/citizen/Dashboard.jsx',
  'src/pages/Certificates.jsx',
  'src/pages/History.jsx',
  'src/pages/OwnershipTimeline.jsx',
  'src/pages/Properties.jsx',
  'src/pages/PropertyDetail.jsx',
  'src/pages/Reports.jsx'
];

files.forEach(file => {
  const p = path.join('C:/Users/Administrator/Desktop/SND/frontend', file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf8');
  const depth = file.split('/').length - 2;
  const importPath = depth === 0 ? './utils/formatDate' : '../'.repeat(depth) + 'utils/formatDate';
  
  let madeChanges = false;
  if (!content.includes('import formatDate') && content.includes('toLocaleDateString')) {
    const importStmt = "import formatDate from '" + importPath + "';\n";
    const lines = content.split('\n');
    let lastImportIdx = 0;
    for(let i=0; i<lines.length; i++){
      if(lines[i].startsWith('import ')){
        lastImportIdx = i;
      }
    }
    lines.splice(lastImportIdx + 1, 0, importStmt);
    content = lines.join('\n');
    madeChanges = true;
  }
  
  // Try finding standard format
  const before = content;
  content = content.replace(/new Date\(([^)]*)\)\.toLocaleDateString\([^)]*\)/g, 'formatDate($1)');
  
  // Also try replacing ones like new Date().toLocaleDateString()
  content = content.replace(/new Date\(\)\.toLocaleDateString\([^)]*\)/g, 'formatDate(new Date())');

  if (before !== content || madeChanges) {
    fs.writeFileSync(p, content);
    console.log('Processed', file);
  }
});
