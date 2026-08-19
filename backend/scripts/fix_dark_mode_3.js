const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = 'c:\\Users\\Administrator\\Desktop\\SND\\frontend';

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  for (const { search, replace, all } of replacements) {
    if (all) {
      content = content.split(search).join(replace);
    } else {
      content = content.replace(search, replace);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes made to: ${filePath}`);
  }
}

// 21. src/pages/Login.jsx
replaceInFile('src/pages/Login.jsx', [
  { search: 'dark:bg-slate-900/50 dark:bg-slate-900/50', replace: 'dark:bg-slate-900/50', all: true }
]);

// 22. src/pages/Notifications.jsx
replaceInFile('src/pages/Notifications.jsx', [
  { search: 'border-l-registryBlue', replace: 'border-l-registryBlue dark:border-l-blue-500', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'bg-blue-50 text-registryBlue border-blue-200', replace: 'bg-blue-50 dark:bg-blue-950/40 text-registryBlue dark:text-blue-300 border border-blue-200 dark:border-blue-800', all: true },
  { search: 'text-green-600', replace: 'text-green-600 dark:text-green-400', all: true }
]);

// 23. src/pages/Profile.jsx
replaceInFile('src/pages/Profile.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-green-200 bg-green-50 text-green-800', replace: 'border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300', all: true },
  { search: 'border-yellow-200 bg-yellow-50 text-yellow-700', replace: 'border border-yellow-200 dark:border-amber-800 bg-yellow-50 dark:bg-amber-950/40 text-yellow-700 dark:text-amber-300', all: true },
  { search: 'border-red-200 bg-red-50 text-red-700', replace: 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300', all: true }
]);

// 24. src/pages/Properties.jsx
replaceInFile('src/pages/Properties.jsx', [
  { search: 'group-hover:text-registryBlue', replace: 'group-hover:text-registryBlue dark:group-hover:text-blue-400', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-slate-100', replace: 'border-slate-100 dark:border-slate-800', all: true }
]);

// 25. src/pages/PropertyDetail.jsx
replaceInFile('src/pages/PropertyDetail.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-slate-200 hover:bg-slate-50', replace: 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800', all: true },
  { search: 'border-registryBlue bg-blue-50', replace: 'border-registryBlue bg-blue-50 dark:bg-blue-950/50 dark:border-blue-700', all: true }
]);

// 26. src/pages/PublicHome.jsx
replaceInFile('src/pages/PublicHome.jsx', [
  { search: 'bg-registryLight', replace: 'bg-registryLight dark:bg-slate-950', all: true },
  { search: 'bg-blue-50 text-registryBlue border-blue-100', replace: 'bg-blue-50 dark:bg-blue-950/50 text-registryBlue dark:text-blue-300 border-blue-100 dark:border-blue-800', all: true },
  { search: 'text-black', replace: 'text-black dark:text-white', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'hover:text-registryBlue', replace: 'hover:text-registryBlue dark:hover:text-blue-400', all: true }
]);

// 27. src/pages/Reports.jsx
replaceInFile('src/pages/Reports.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-slate-200', replace: 'border-slate-200 dark:border-slate-800', all: true },
  { search: 'group-hover:text-[#152C69]', replace: 'group-hover:text-[#152C69] dark:group-hover:text-blue-300', all: true },
  { search: 'hover:text-registryBlue', replace: 'hover:text-registryBlue dark:hover:text-blue-400', all: true }
]);

// 28. src/pages/Transfers.jsx
replaceInFile('src/pages/Transfers.jsx', [
  { search: 'border-registryBlue text-registryBlue', replace: 'border-registryBlue text-registryBlue dark:border-blue-400 dark:text-blue-400', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'text-green-600', replace: 'text-green-600 dark:text-green-400', all: true },
  { search: 'text-amber-500', replace: 'text-amber-500 dark:text-amber-400', all: true },
  { search: 'bg-amber-50 text-amber-700', replace: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300', all: true },
  { search: 'border-slate-300', replace: 'border-slate-300 dark:border-slate-800', all: true }
]);

// 29. src/pages/public/About.jsx
replaceInFile('src/pages/public/About.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true }
]);

// 30. src/pages/public/Contact.jsx
replaceInFile('src/pages/public/Contact.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true }
]);

// 31. src/pages/public/VerifyCertificate.jsx
replaceInFile('src/pages/public/VerifyCertificate.jsx', [
  { search: 'bg-registryLight', replace: 'bg-registryLight dark:bg-slate-950', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'bg-red-50 border border-red-200 text-red-700', replace: 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300', all: true }
]);

console.log('Script execution finished.');
