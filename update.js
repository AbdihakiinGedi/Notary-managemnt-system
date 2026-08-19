const fs = require('fs');

const path = 'c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add formatDateTime import
content = content.replace("import formatAssetId from '../../utils/formatAssetId';", "import formatAssetId from '../../utils/formatAssetId';\nimport { formatDateTime } from '../../utils/formatDate';");

// 2. Replace the date
content = content.replace(
    "new Date(h.officer_approved_at || h.created_at).toLocaleString()",
    "formatDateTime(h.officer_approved_at || h.created_at)"
);

fs.writeFileSync(path, content);
console.log('Dashboard updated with formatDateTime');
