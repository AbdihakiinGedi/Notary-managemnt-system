const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content);
}

// 1. ReportTemplates.jsx
replaceInFile('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\components\\ReportTemplates.jsx', [
    ["format: v => v ? String(v).slice(0,8).toUpperCase() : '-'", "format: v => v ? formatAssetId(v) : '-'"],
    ["format: v => v ? String(v).slice(0,8).toUpperCase() : (v?.id ? String(v.id).slice(0,8).toUpperCase() : '-')", "format: v => (v?.id || v) ? formatAssetId(v?.id || v) : '-'"]
]);

// 2. UserActivityTimeline.jsx
replaceInFile('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\components\\UserActivityTimeline.jsx', [
    ["Asset ID: AST-{activity.affected_property_id.toString().slice(0, 8).toUpperCase()}", "Asset ID: {formatAssetId(activity.affected_property_id)}"]
]);

// 3. AssetSearch.jsx
replaceInFile('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\AssetSearch.jsx', [
    ["{asset.certificate_id.slice(0, 8)}", "{formatAssetId(asset.certificate_id)}"]
]);
// also add import in AssetSearch
let assetSearch = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\AssetSearch.jsx', 'utf8');
if(!assetSearch.includes("formatAssetId")) {
    assetSearch = assetSearch.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../utils/formatAssetId';");
    fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\AssetSearch.jsx', assetSearch);
}

// 4. Certificates.jsx
let cert = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\Certificates.jsx', 'utf8');
if(!cert.includes("formatAssetId")) {
    cert = cert.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../utils/formatAssetId';");
}
cert = cert.replace("TITLE-${cert.id.slice(0, 8).toUpperCase()}.pdf", "TITLE-${formatAssetId(cert.id).replace('AST-', '')}.pdf");
cert = cert.replace("ID: {cert.id.slice(0, 24).toUpperCase()}", "ID: {formatAssetId(cert.id)}");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\Certificates.jsx', cert);

// 5. PropertyDetail.jsx
let propDet = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\PropertyDetail.jsx', 'utf8');
if(!propDet.includes("formatAssetId")) {
    propDet = propDet.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../utils/formatAssetId';");
}
propDet = propDet.replace("Property-Report-${id.slice(0, 8)}.pdf", "Property-Report-${formatAssetId(id).replace('AST-', '')}.pdf");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\PropertyDetail.jsx', propDet);

// 6. Transfers.jsx
let transfers = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\Transfers.jsx', 'utf8');
if(!transfers.includes("formatAssetId")) {
    transfers = transfers.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../utils/formatAssetId';");
}
transfers = transfers.replace("ID: {t.id.slice(0, 16).toUpperCase()}", "ID: {formatAssetId(t.id)}");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\Transfers.jsx', transfers);

// 7. citizen/Dashboard.jsx
let citDash = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\citizen\\Dashboard.jsx', 'utf8');
if(!citDash.includes("formatAssetId")) {
    citDash = citDash.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../../utils/formatAssetId';");
}
citDash = citDash.replace("ID: {asset.id.slice(0, 12).toUpperCase()}", "ID: {formatAssetId(asset.id)}");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\citizen\\Dashboard.jsx', citDash);

// 8. officer/PropertyControl.jsx
let offPropCtrl = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\PropertyControl.jsx', 'utf8');
if(!offPropCtrl.includes("formatAssetId")) {
    offPropCtrl = offPropCtrl.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../../utils/formatAssetId';");
}
offPropCtrl = offPropCtrl.replace("Property-Report-${id.slice(0,8)}.pdf", "Property-Report-${formatAssetId(id).replace('AST-', '')}.pdf");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\officer\\PropertyControl.jsx', offPropCtrl);

// 9. public/VerifyCertificate.jsx
let verCert = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\public\\VerifyCertificate.jsx', 'utf8');
if(!verCert.includes("formatAssetId")) {
    verCert = verCert.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport formatAssetId from '../../utils/formatAssetId';");
}
verCert = verCert.replace("TITLE-${(result.certificate_id || certId).slice(0, 8).toUpperCase()}.pdf", "TITLE-${formatAssetId(result.certificate_id || certId).replace('AST-', '')}.pdf");
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\public\\VerifyCertificate.jsx', verCert);

console.log("Updated asset IDs");
