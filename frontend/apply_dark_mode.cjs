const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /bg-white(?!\s+dark:bg-slate-900)/g, replace: 'bg-white dark:bg-slate-900' },
  { regex: /text-slate-900(?!\s+dark:text-white)/g, replace: 'text-slate-900 dark:text-white' },
  { regex: /bg-slate-50(?!\s+dark:bg-slate-950)/g, replace: 'bg-slate-50 dark:bg-slate-950' },
  { regex: /border-slate-200(?!\s+dark:border-slate-800)/g, replace: 'border-slate-200 dark:border-slate-800' },
  { regex: /text-slate-500(?!\s+dark:text-slate-400)/g, replace: 'text-slate-500 dark:text-slate-400' },
  { regex: /text-slate-600(?!\s+dark:text-slate-400)/g, replace: 'text-slate-600 dark:text-slate-400' },
  { regex: /text-slate-700(?!\s+dark:text-slate-300)/g, replace: 'text-slate-700 dark:text-slate-300' },
  { regex: /text-slate-800(?!\s+dark:text-slate-300)/g, replace: 'text-slate-800 dark:text-slate-300' },
  { regex: /bg-slate-100(?!\s+dark:bg-slate-800)/g, replace: 'bg-slate-100 dark:bg-slate-800' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const { regex, replace } of replacements) {
        content = content.replace(regex, replace);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated dark mode in ${fullPath}`);
      }
    }
  }
}

processDirectory('c:/Users/Administrator/Desktop/SND/frontend/src/pages');
processDirectory('c:/Users/Administrator/Desktop/SND/frontend/src/components');
