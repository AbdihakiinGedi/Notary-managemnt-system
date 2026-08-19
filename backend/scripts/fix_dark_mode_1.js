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

// 1. src/index.css
replaceInFile('src/index.css', [
  { search: ':root {', replace: `:root {
  --bg: #ffffff;
  --card: #ffffff;
  --primary: #2563EB;
  --primary-light: #EFF6FF;
  --text: #1E293B;
  --text-soft: #64748B;
  --border: #E2E8F0;
  --accent: #F59E0B;
}

.dark {
  --bg: #090D16;
  --card: #0F172A;
  --primary: #3B82F6;
  --primary-light: #1E293B;
  --text: #F8FAFC;
  --text-soft: #94A3B8;
  --border: #1E293B;
  --accent: #FACC15;
}
`, all: false },
  { search: '.inst-table thead {\n  @apply bg-slate-50', replace: '.inst-table thead {\n  @apply bg-slate-50 dark:bg-slate-950', all: false },
  { search: '.inst-table th {\n  @apply text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200;', replace: '.inst-table th {\n  @apply text-left px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800;', all: false },
  { search: '.inst-table tr:hover td {\n  @apply bg-slate-50;', replace: '.inst-table tr:hover td {\n  @apply bg-slate-50 dark:bg-slate-800/50;', all: false },
  { search: '.btn-ghost {\n  @apply bg-transparent text-slate-700 hover:bg-slate-100', replace: '.btn-ghost {\n  @apply bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200', all: false },
  { search: '.badge-success {\n  @apply bg-green-50 text-green-700 border border-green-200;', replace: '.badge-success {\n  @apply bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800;', all: false },
  { search: '.badge-warning {\n  @apply bg-amber-50 text-amber-700 border border-amber-200;', replace: '.badge-warning {\n  @apply bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800;', all: false },
  { search: '.badge-error {\n  @apply bg-red-50 text-red-700 border border-red-200;', replace: '.badge-error {\n  @apply bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800;', all: false },
  { search: '.badge-blue {\n  @apply bg-blue-50 text-blue-700 border border-blue-200;', replace: '.badge-blue {\n  @apply bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800;', all: false },
  { search: '.badge-gold {\n  @apply bg-amber-50 text-amber-600 border border-amber-200;', replace: '.badge-gold {\n  @apply bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700;', all: false }
]);

// 2. src/components/Header.jsx
replaceInFile('src/components/Header.jsx', [
  { search: 'text-slate-300', replace: 'text-slate-300 dark:text-slate-600', all: false },
  { search: 'className="text-registryBlue font-medium"', replace: 'className="text-registryBlue dark:text-blue-400 font-medium"', all: false },
  { search: 'className="h-full border-r border-white mx-2"', replace: 'className="h-full border-r border-white dark:border-slate-900 mx-2"', all: false },
  { search: 'text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-950 dark:hover:text-registryBlue hover:text-registryBlue', replace: 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400', all: true }
]);

// 3. src/components/Sidebar.jsx
replaceInFile('src/components/Sidebar.jsx', [
  { search: 'className="text-2xl font-black text-registryBlue tracking-tight"', replace: 'className="text-2xl font-black text-registryBlue dark:text-blue-400 tracking-tight"', all: false },
  { search: 'className="mt-auto p-4 bg-slate-50 dark:bg-slate-950 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 dark:border-slate-700"', replace: 'className="mt-auto p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800"', all: false },
  { search: 'className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900 font-medium bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 dark:border-slate-700 shadow-sm mt-3"', replace: 'className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm mt-3"', all: false }
]);

// 4. src/components/PublicNavbar.jsx
replaceInFile('src/components/PublicNavbar.jsx', [
  { search: 'hover:bg-slate-50 dark:bg-slate-950', replace: 'hover:bg-slate-50 dark:hover:bg-slate-800', all: true },
  { search: 'hover:text-registryBlue', replace: 'hover:text-registryBlue dark:hover:text-blue-400', all: true }
]);

// 5. src/components/DigitalSignatureModal.jsx
replaceInFile('src/components/DigitalSignatureModal.jsx', [
  { search: 'className="text-2xl font-black text-registryBlue tracking-tight"', replace: 'className="text-2xl font-black text-registryBlue dark:text-blue-400 tracking-tight"', all: false },
  { search: 'className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-medium animate-in fade-in"', replace: 'className="p-4 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-lg text-sm font-medium animate-in fade-in"', all: false },
  { search: 'className="p-5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium text-center animate-in fade-in"', replace: 'className="p-5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-medium text-center animate-in fade-in"', all: false },
  { search: 'text-registryBlue hover:text-blue-800', replace: 'text-registryBlue dark:text-blue-400 dark:hover:text-blue-300', all: false },
  { search: 'className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner relative"', replace: 'className="border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white shadow-inner relative"', all: false },
  { search: 'className="ml-2 text-sm text-slate-700 cursor-pointer"', replace: 'className="ml-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"', all: false }
]);

// 6. src/components/TransferDetailsModal.jsx
replaceInFile('src/components/TransferDetailsModal.jsx', [
  { search: 'className="text-registryBlue"', replace: 'className="text-registryBlue dark:text-blue-400"', all: false }, // Header icon
  { search: 'className="text-xs font-semibold text-slate-500"', replace: 'className="text-xs font-semibold text-slate-500 dark:text-slate-400"', all: true },
  { search: 'className="text-2xl font-bold text-registryBlue"', replace: 'className="text-2xl font-bold text-registryBlue dark:text-blue-400"', all: false },
  { search: 'className="text-registryBlue"', replace: 'className="text-registryBlue dark:text-blue-400"', all: false }, // External link icon
  { search: 'btn-secondary text-red-600 hover:bg-red-50 border-red-200', replace: 'btn-secondary text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30', all: false }
]);

// 7. src/components/ReportTemplates.jsx
replaceInFile('src/components/ReportTemplates.jsx', [
  { search: 'text-2xl font-black text-registryBlue', replace: 'text-2xl font-black text-registryBlue dark:text-blue-400', all: false },
  { search: 'text-2xl font-black text-registryBlue mt-1', replace: 'text-2xl font-black text-registryBlue dark:text-blue-400 mt-1', all: true },
  { search: 'divide-slate-200', replace: 'divide-slate-200 dark:divide-slate-800', all: true },
  { search: 'border-slate-200 bg-slate-50 dark:bg-slate-950', replace: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950', all: true }, // Empty boxes and QR container
  { search: 'border-slate-200', replace: 'border-slate-200 dark:border-slate-700', all: true }, // Add general border fixes
  { search: 'bg-slate-800', replace: 'bg-slate-800 dark:bg-slate-200', all: true }, // QR dots
  { search: 'text-lg font-bold text-registryBlue tracking-widest', replace: 'text-lg font-bold text-registryBlue dark:text-blue-400 tracking-widest', all: false },
  { search: 'text-sm font-bold text-registryBlue', replace: 'text-sm font-bold text-registryBlue dark:text-blue-400', all: false }
]);

// 8. src/components/QRGenerator.jsx
replaceInFile('src/components/QRGenerator.jsx', [
  { search: 'border-[#DEE2E6]', replace: 'border-[#DEE2E6] dark:border-slate-800', all: true },
  { search: 'text-[#1A1A1A]', replace: 'text-[#1A1A1A] dark:text-white', all: true },
  { search: 'text-[#6C757D]', replace: 'text-[#6C757D] dark:text-slate-400', all: true },
  { search: 'bg-[#F8F9FA] rounded-xl p-6 flex flex-col items-center justify-center border-2 border-[#DEE2E6]', replace: 'bg-[#F8F9FA] dark:bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center border-2 border-[#DEE2E6] dark:border-slate-800', all: false },
  { search: 'text-[#0056D2]', replace: 'text-[#0056D2] dark:text-blue-400', all: false },
  { search: 'bg-[#0056D2]', replace: 'bg-[#0056D2] dark:bg-slate-800 dark:hover:bg-blue-600', all: false },
  { search: 'bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#F8F9FA]', replace: 'bg-white dark:bg-slate-900 border-2 border-[#1A1A1A] dark:border-slate-700 text-[#1A1A1A] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-slate-800', all: false }
]);

// 9. src/components/UserActivityTimeline.jsx
replaceInFile('src/components/UserActivityTimeline.jsx', [
  { search: 'className="text-registryBlue"', replace: 'className="text-registryBlue dark:text-blue-400"', all: false },
  { search: 'className="text-registryBlue ml-1 hover:underline"', replace: 'className="text-registryBlue dark:text-blue-400 ml-1 hover:underline"', all: false },
  { search: "activity.result === 'SUCCESS' ? 'text-green-600' : 'text-slate-500'", replace: "activity.result === 'SUCCESS' ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'", all: false }
]);

// 10. src/components/public/VerificationResultCard.jsx
replaceInFile('src/components/public/VerificationResultCard.jsx', [
  { search: 'bg-red-50 border border-red-200', replace: 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800', all: false },
  { search: 'bg-red-100', replace: 'bg-red-100 dark:bg-red-900/50', all: false },
  { search: 'text-red-700', replace: 'text-red-700 dark:text-red-300', all: true },
  { search: 'text-red-600', replace: 'text-red-600 dark:text-red-400', all: true },
  { search: 'bg-blue-50 text-registryBlue border-blue-100', replace: 'bg-blue-50 dark:bg-blue-950/50 text-registryBlue dark:text-blue-300 border-blue-100 dark:border-blue-800', all: false },
  { search: 'text-green-700', replace: 'text-green-700 dark:text-green-400', all: false },
  { search: 'border-slate-300', replace: 'border-slate-300 dark:border-slate-700', all: false },
  { search: 'bg-green-50 border-green-200', replace: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', all: false },
  { search: 'hover:bg-slate-50 dark:bg-slate-950 hover:text-registryBlue', replace: 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300', all: true }
]);

console.log('Script execution finished.');
