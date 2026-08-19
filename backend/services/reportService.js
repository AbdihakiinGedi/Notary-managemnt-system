const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function generatePropertyReportPDF(propertyId, res) {
  const pRes = await db.query(`
    SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.national_id as owner_national_id
    FROM properties p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = $1
  `, [propertyId]);

  if (pRes.rowCount === 0) throw new Error('Property not found');
  const property = pRes.rows[0];

  const oRes = await db.query(`
    SELECT o.start_date, o.end_date, o.active, u.full_name as owner_name 
    FROM asset_ownerships o 
    JOIN users u ON o.owner_id = u.id 
    WHERE o.asset_id = $1 
    ORDER BY o.start_date ASC
  `, [propertyId]);
  const ownershipHistory = oRes.rows;

  const tRes = await db.query(`
    SELECT t.status, t.price, t.created_at, u1.full_name as seller, u2.full_name as buyer
    FROM ownership_transfers t
    JOIN users u1 ON t.from_user = u1.id
    JOIN users u2 ON t.to_user = u2.id
    WHERE t.property_id = $1
    ORDER BY t.created_at DESC
  `, [propertyId]);
  const transferHistory = tRes.rows;

  const eRes = await db.query(`
    SELECT e.action, e.created_at, COALESCE(u.full_name, 'System Authority') as actor_name
    FROM audit_logs e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.affected_property_id = $1
    ORDER BY e.created_at DESC
  `, [propertyId]);
  const timeline = eRes.rows;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const primaryBlue = '#1E3A8A';
  const textDark = '#0F172A';
  const textMuted = '#475569';
  const bgLight = '#F8FAFC';
  const borderLight = '#E2E8F0';

  // --- HEADER ---
  doc.fillColor(primaryBlue).fontSize(16).font('Helvetica-Bold')
     .text('SOMALI NATIONAL REGISTRY', { align: 'center' });
  doc.fillColor(textDark).fontSize(12).font('Helvetica-Bold')
     .text('FULL PROPERTY REPORT', { align: 'center', characterSpacing: 1 });
     
  doc.moveDown(2);

  const drawSectionHeader = (title, yPos) => {
    doc.fillColor(bgLight).rect(40, yPos, 515, 20).fill();
    doc.strokeColor(borderLight).lineWidth(1).rect(40, yPos, 515, 20).stroke();
    doc.fillColor(primaryBlue).fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), 50, yPos + 6);
    return yPos + 30;
  };

  let curY = doc.y;

  // 1. Property Information
  curY = drawSectionHeader('Property Information', curY);
  doc.fillColor(textDark).fontSize(9).font('Helvetica');
  doc.text(`ID: ${property.id}`, 40, curY);
  doc.text(`Title: ${property.title}`, 40, curY + 15);
  doc.text(`Type: ${(property.type || '').toUpperCase()}`, 40, curY + 30);
  doc.text(`District: ${property.district}`, 300, curY);
  doc.text(`Address: ${property.address}`, 300, curY + 15);
  doc.text(`Status: ${property.status}`, 300, curY + 30);
  curY += 55;

  // 2. Current Owner
  curY = drawSectionHeader('Current Owner', curY);
  doc.text(`Name: ${property.owner_name}`, 40, curY);
  doc.text(`Email: ${property.owner_email}`, 40, curY + 15);
  doc.text(`National ID: ${property.owner_national_id || 'N/A'}`, 300, curY);
  curY += 40;

  // 3. Ownership History
  curY = drawSectionHeader('Ownership History', curY);
  ownershipHistory.forEach((oh, i) => {
    if (curY > 750) { doc.addPage(); curY = 40; }
    doc.text(`${oh.owner_name}: ${new Date(oh.start_date).toLocaleDateString()} -> ${oh.end_date ? new Date(oh.end_date).toLocaleDateString() : 'Current'}`, 40, curY);
    curY += 15;
  });
  curY += 15;

  // 4. Transfer History
  if (curY > 700) { doc.addPage(); curY = 40; }
  curY = drawSectionHeader('Transfer History', curY);
  if (transferHistory.length === 0) {
    doc.text('No transfers recorded.', 40, curY);
    curY += 20;
  } else {
    transferHistory.forEach((th, i) => {
      if (curY > 750) { doc.addPage(); curY = 40; }
      doc.text(`${new Date(th.created_at).toLocaleDateString()} - ${th.status.toUpperCase()}: ${th.seller} -> ${th.buyer} ($${th.price})`, 40, curY);
      curY += 15;
    });
    curY += 15;
  }

  // 5. Timeline
  if (curY > 700) { doc.addPage(); curY = 40; }
  curY = drawSectionHeader('Event Timeline', curY);
  timeline.forEach((tl, i) => {
    if (curY > 750) { doc.addPage(); curY = 40; }
    doc.text(`${new Date(tl.created_at).toLocaleDateString()} - ${tl.action} by ${tl.actor_name}`, 40, curY);
    curY += 15;
  });

  doc.end();
}

module.exports = { generatePropertyReportPDF };
