const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\Dashboard.jsx', 'utf8');
content = content.replace(/\\"/g, '"');
content = content.replace(/The above content shows the entire.*/g, '');
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\Dashboard.jsx', content.trim() + '\n');
console.log('Cleaned');
