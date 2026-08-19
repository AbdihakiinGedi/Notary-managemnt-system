const fs = require('fs');

const logContent = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\officer_dashboard_logs.txt', 'utf8');

const lines = logContent.split('\n');
for (const line of lines) {
    if (!line.includes('step_index":3593')) continue;
    try {
        const data = JSON.parse(line.trim());
        const content = data.content;
        const parts = content.split("leading space.\n");
        if (parts.length > 1) {
            const fileContentLines = parts[1].split('\n');
            const cleanLines = fileContentLines.map(l => l.replace(/^\d+: /, ''));
            fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\Dashboard.jsx', cleanLines.join('\n'));
            console.log("Restored Dashboard.jsx!");
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
    }
}
console.log("Not found.");
