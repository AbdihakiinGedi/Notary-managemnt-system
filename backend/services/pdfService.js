const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const https = require('https');

/**
 * Generates an official, legally binding PDF agreement for a property transfer,
 * embeds all signed signatures, saves the file to disk, computes its SHA-256 hash,
 * and updates the transfer_agreements database record.
 * 
 * @param {string} transferId - UUID of the transfer
 * @param {object} tx - Optional database transaction client
 */
async function generateAgreementPDF(transferId, tx = null) {
  const client = tx || db;

  // 1. Fetch comprehensive transfer, property, citizen, notary, and officer details
  const tRes = await client.query(`
    WITH unified_assets AS (
      SELECT id, title, type::text, district, address, metadata, owner_id, status FROM properties
      UNION ALL
      SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, NULL as district, NULL as address, metadata, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
    )
    SELECT 
      t.id as transfer_id,
      t.price,
      t.status as transfer_status,
      t.created_at as transfer_created_at,
      p.id as property_id,
      p.title as property_title,
      p.type as property_type,
      p.district as property_district,
      p.address as property_address,
      p.metadata as property_metadata,
      
      -- Seller Details
      u_sel.id as seller_id,
      u_sel.full_name as seller_name,
      u_sel.email as seller_email,
      u_sel.phone as seller_phone,
      u_sel.national_id as seller_national_id,
      u_sel.profile_photo as seller_photo,
      
      -- Buyer Details
      u_buy.id as buyer_id,
      u_buy.full_name as buyer_name,
      u_buy.email as buyer_email,
      u_buy.phone as buyer_phone,
      u_buy.national_id as buyer_national_id,
      u_buy.profile_photo as buyer_photo,
      
      -- Notary Details
      u_not.id as notary_id,
      u_not.full_name as notary_name,
      u_not.email as notary_email,
      
      -- Agreement Record
      ta.id as agreement_id,
      ta.agreement_number
    FROM ownership_transfers t
    JOIN unified_assets p ON t.property_id = p.id
    JOIN users u_sel ON t.from_user = u_sel.id
    JOIN users u_buy ON t.to_user = u_buy.id
    LEFT JOIN users u_not ON t.notary_request_id = u_not.id
    LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
    WHERE t.id = $1
  `, [transferId]);

  if (tRes.rowCount === 0) {
    throw new Error('Transfer record not found.');
  }

  const t = tRes.rows[0];

  // Validation: Missing photos should block generation
  if (!t.seller_photo || !t.buyer_photo) {
    throw new Error('Profile photo is required before continuing.');
  }

  let notaryName = t.notary_name || 'Pending notary assignment';
  let notaryLicense = t.notary_id ? `NTR-${t.notary_id.slice(0, 8).toUpperCase()}` : 'N/A';
  
  const sigsRes = await client.query(`
    SELECT ds.*, u.full_name as signer_name
    FROM digital_signatures ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.agreement_id = $1
  `, [t.agreement_id]);

  const signatures = sigsRes.rows;
  const sellerSig = signatures.find(s => s.role === 'seller' || s.signature_type === 'seller_signature');
  const buyerSig = signatures.find(s => s.role === 'buyer' || s.signature_type === 'buyer_signature');
  const notarySig = signatures.find(s => s.role === 'notary' || s.signature_type === 'notary_signature');
  const officerSig = signatures.find(s => s.role === 'officer' || s.signature_type === 'officer_signature');

  if (notarySig) {
    notaryName = notarySig.signer_name;
    notaryLicense = `NTR-${notarySig.user_id.slice(0, 8).toUpperCase()}`;
  }

  const isLand = t.property_type && ['land', 'residential', 'commercial', 'industrial'].includes(t.property_type.toLowerCase());
  let officerName = 'N/A';
  let officerOffice = 'N/A';

  if (isLand) {
    officerName = officerSig ? officerSig.signer_name : 'Pending Land Officer Approval';
    officerOffice = officerSig ? 'Somali Land Registry Headquarters' : 'Land Registry Branch Office';
  }

  // 2. Prepare Directory
  const dirPath = path.join(__dirname, '../uploads/agreements');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const pdfFileName = `agreement-${t.agreement_number}.pdf`;
  const pdfFilePath = path.join(dirPath, pdfFileName);

  // 3. Initiate PDFKit Document
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const writeStream = fs.createWriteStream(pdfFilePath);
  
  // Variables & Theme
  const primaryBlue = '#1D4ED8';
  const textDark = '#111827';
  const textMuted = '#6B7280';
  const borderLight = '#CBD5E1';
  const bgLight = '#F8FAFC';
  const pageWidth = 595.28;
  const contentWidth = pageWidth - 100;

  // Global Watermark & Footer Listener
  let pageNumber = 0;
  doc.on('pageAdded', () => {
    pageNumber++;
    doc.save();
    doc.rotate(-45, { origin: [doc.page.width/2, doc.page.height/2] });
    doc.fillColor('#F9FAFB').fontSize(60).font('Helvetica-Bold');
    doc.text('SNDNPRS OFFICIAL', doc.page.width/2 - 300, doc.page.height/2 - 20, { align: 'center', width: 600, lineBreak: false });
    doc.restore();

    // Footer
    const bottom = doc.page.height - 40;
    
    // Temporarily adjust bottom margin to prevent infinite loops from text wrap
    const oldMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    
    doc.strokeColor(borderLight).lineWidth(1).moveTo(50, bottom - 15).lineTo(doc.page.width - 50, bottom - 15).stroke();
    
    doc.fontSize(7).font('Helvetica-Bold').fillColor(primaryBlue)
       .text('This agreement was digitally generated by the Somali National Digital Notary & Property Registry System (SNDNPRS).', 50, bottom - 5, { lineBreak: false });
       
    doc.font('Helvetica').fontSize(7).fillColor(textMuted)
       .text('Scan the QR Code to verify authenticity.', 50, bottom + 5, { lineBreak: false });
    
    doc.text(`Page ${pageNumber}`, doc.page.width - 100, bottom, { align: 'right', width: 50, lineBreak: false });
    
    doc.page.margins.bottom = oldMargin;
  });

  doc.pipe(writeStream);

  // --- HEADER ---
  // Coat of Arms proxy
  doc.save();
  doc.translate(doc.page.width/2, 55);
  doc.scale(0.8);
  doc.fillColor('#3B82F6');
  doc.path('M 0 -25 L 5.8 -7.5 L 23.7 -7.5 L 9.3 3.5 L 14.7 21.2 L 0 11.2 L -14.7 21.2 L -9.3 3.5 L -23.7 -7.5 L -5.8 -7.5 Z').fill();
  doc.restore();

  doc.moveDown(3);
  doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold')
     .text('SOMALI NATIONAL DIGITAL NOTARY & PROPERTY REGISTRY SYSTEM (SNDNPRS)', 50, 85, { align: 'center', width: contentWidth });
     
  doc.fillColor(primaryBlue).fontSize(18).font('Helvetica-Bold')
     .text('OFFICIAL PROPERTY AGREEMENT', 50, 105, { align: 'center', width: contentWidth, characterSpacing: 1 });
     
  const agreementTypeStr = isLand ? 'LAND SALES AGREEMENT' : 'NON-LAND ASSET SALES AGREEMENT';
  doc.fillColor(textMuted).fontSize(12).font('Helvetica-Bold')
     .text(agreementTypeStr, 50, 125, { align: 'center', width: contentWidth, characterSpacing: 2 });

  doc.strokeColor(primaryBlue).lineWidth(2).moveTo(50, 145).lineTo(doc.page.width - 50, 145).stroke();
  
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(`Agreement Number: ${t.agreement_number}`, 50, 155);
  doc.text(`Agreement Date: ${new Date().toLocaleDateString()}`, doc.page.width - 200, 155, { align: 'right', width: 150 });
  
  let curY = 180;

  // --- HELPER FUNCTIONS ---
  const drawSectionHeader = (title, yPos) => {
    doc.fillColor(bgLight).rect(50, yPos, contentWidth, 16).fill();
    doc.strokeColor(primaryBlue).lineWidth(1).rect(50, yPos, contentWidth, 16).stroke();
    doc.fillColor(primaryBlue).fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), 60, yPos + 4);
    return yPos + 20;
  };

  const drawTable = (startX, startY, rows, colWidths) => {
    let currentY = startY;
    const rowHeight = 15;
    
    rows.forEach((row, rowIndex) => {
      let currentX = startX;
      if (rowIndex === 0) {
        doc.fillColor(primaryBlue).rect(startX, currentY, colWidths.reduce((a,b)=>a+b,0), rowHeight).fill();
      }
      doc.strokeColor(borderLight).lineWidth(1).rect(startX, currentY, colWidths.reduce((a,b)=>a+b,0), rowHeight).stroke();
      
      row.forEach((cell, i) => {
        if (i > 0) doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke();
        doc.fillColor(rowIndex === 0 ? 'white' : textDark)
           .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5);
        doc.text(String(cell || 'N/A'), currentX + 5, currentY + 4, { width: colWidths[i] - 10, align: 'left', height: rowHeight, lineBreak: false });
        currentX += colWidths[i];
      });
      currentY += rowHeight;
    });
    return currentY;
  };

  const md = typeof t.property_metadata === 'string' ? JSON.parse(t.property_metadata) : (t.property_metadata || {});
  const regDate = md.registration_date ? new Date(md.registration_date).toLocaleDateString() : 'N/A';
  const landSize = md.size ? `${md.size} sq meters` : 'N/A';
  const propNum = `PN-${t.property_id.slice(0, 8).toUpperCase()}`;
  const regRef = `REG-${t.property_id.slice(9, 13).toUpperCase()}`;

  // 1. Property / Asset Information
  curY = drawSectionHeader(isLand ? 'Property Information' : 'Asset Information', curY);
  if (isLand) {
    curY = drawTable(50, curY, [
      ['Field', 'Details', 'Field', 'Details'],
      ['Property ID', t.property_id.slice(0, 18) + '...', 'Property Number', propNum],
      ['Registry Reference', regRef, 'Property Type', (t.property_type || '').toUpperCase()],
      ['District', (t.property_district || '').toUpperCase(), 'Address', t.property_address || 'N/A'],
      ['Land Size', landSize, 'Registration Date', regDate]
    ], [100, 147.5, 100, 147.5]);
  } else {
    const assetIdShort = t.property_id.slice(0, 18) + '...';
    const allKeys = Object.keys(md).filter(k => k !== 'title' && k !== 'registration_date');
    const idKey1 = allKeys[0] || 'Identifier 1';
    const idVal1 = md[idKey1] || 'N/A';
    const idKey2 = allKeys.length > 1 ? allKeys[1] : 'Identifier 2';
    const idVal2 = md[idKey2] || 'N/A';
    
    curY = drawTable(50, curY, [
      ['Field', 'Details', 'Field', 'Details'],
      ['Asset ID', assetIdShort, 'Asset Type', (t.property_type || '').toUpperCase()],
      ['Asset Name', String(t.property_title || 'N/A').toUpperCase(), 'Registration Date', regDate],
      [idKey1.toUpperCase().replace(/_/g, ' '), String(idVal1).toUpperCase(), idKey2.toUpperCase().replace(/_/g, ' '), String(idVal2).toUpperCase()],
      ['', '', '', '']
    ], [100, 147.5, 100, 147.5]);
  }
  curY += 8;
  
  // 2. Sale Information
  curY = drawSectionHeader('Sale Information', curY);
  curY = drawTable(50, curY, [
    ['Transfer Number', 'Transfer Date', 'Payment Method', 'Sale Price', 'Currency'],
    [`TR-${t.transfer_id.slice(0, 8).toUpperCase()}`, new Date(t.transfer_created_at).toLocaleDateString(), 'Bank Transfer', parseFloat(t.price || 0).toLocaleString(), 'USD']
  ], [100, 100, 100, 100, 95]);
  curY += 8;

  // 3. Contracting Parties
  curY = drawSectionHeader('Contracting Parties', curY);
  
  const drawPartyInfo = (x, y, title, data, photoPath) => {
    doc.fillColor(bgLight).rect(x, y, 235, 105).fill();
    doc.strokeColor(borderLight).lineWidth(1).rect(x, y, 235, 105).stroke();
    
    // Photo Box
    doc.strokeColor(borderLight).rect(x + 10, y + 10, 60, 60).stroke();
    
    let isPlaceholder = true;
    if (photoPath) {
      try {
        const relativePath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
        const absolutePath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(absolutePath)) {
          doc.image(absolutePath, x + 11, y + 11, { width: 58, height: 58 });
          isPlaceholder = false;
        }
      } catch (err) { }
    }
    
    // Silhouette Drawing (Fallback)
    if (isPlaceholder) {
      doc.save();
      doc.translate(x + 40, y + 40);
      doc.fillColor('#D1D5DB');
      doc.circle(0, -10, 10).fill(); // Head
      doc.path('M -20 20 Q -20 5 0 5 Q 20 5 20 20 Z').fill(); // Shoulders
      doc.restore();
    }
    
    doc.fillColor(primaryBlue).fontSize(8).font('Helvetica-Bold').text(title, x + 5, y + 75, { width: 70, align: 'center' });
    
    // Details
    let dy = y + 10;
    const drawRow = (lbl, val) => {
      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text(lbl, x + 85, dy);
      doc.fillColor(textDark).fontSize(7.5).font('Helvetica').text(String(val).slice(0, 30), x + 85, dy + 8);
      dy += 19;
    };
    
    drawRow('Full Name', data.name);
    drawRow('National ID', data.nid);
    drawRow('Phone / Email', `${data.phone} | ${data.email}`);
    drawRow('Signature Date', data.date);
  };
  
  drawPartyInfo(50, curY, 'SELLER\n(Transferor)', {
    name: t.seller_name, nid: t.seller_national_id || 'Not specified', phone: t.seller_phone || 'N/A', email: t.seller_email, date: sellerSig ? new Date(sellerSig.signed_at).toLocaleDateString() : 'Pending'
  }, t.seller_photo);
  
  drawPartyInfo(310, curY, 'BUYER\n(Transferee)', {
    name: t.buyer_name, nid: t.buyer_national_id || 'Not specified', phone: t.buyer_phone || 'N/A', email: t.buyer_email, date: buyerSig ? new Date(buyerSig.signed_at).toLocaleDateString() : 'Pending'
  }, t.buyer_photo);

  curY += 113;

  // 4. Terms & Conditions
  curY = drawSectionHeader('Terms & Conditions', curY);
  doc.fillColor(textDark).font('Helvetica').fontSize(7.5);
  const terms = [
    'Seller confirms they are the legal and rightful owner of the property and hold full authority to sell.',
    'Property is free from all disputes, encumbrances, mortgages, and legal claims.',
    'Buyer agrees to accept full ownership and responsibilities upon execution of this agreement.',
    'Both parties agree to abide by the property laws and regulations of the Federal Republic of Somalia.',
    'The digital signatures appended to this document are legally binding under Somali law.',
    'The Somali National Digital Notary & Property Registry System maintains the official ownership record.'
  ];
  terms.forEach((tm, i) => {
    doc.text(`${i+1}. ${tm}`, 55, curY);
    curY += 11;
  });
  curY += 5;

  // 5. Signature Section
  curY = drawSectionHeader('Official Signatures & Verification', curY);
  
  const drawSigBox = (x, y, title, name, sigObj, isGov = false) => {
    doc.strokeColor(borderLight).lineWidth(1).rect(x, y, 235, 65).stroke();
    doc.fillColor(isGov ? primaryBlue : bgLight).rect(x+1, y+1, 233, 14).fill();
    doc.fillColor(isGov ? 'white' : primaryBlue).font('Helvetica-Bold').fontSize(7.5).text(title, x + 5, y + 4);
    
    if (sigObj) {
      try {
        const sigBuffer = Buffer.from(sigObj.signature_image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        doc.image(sigBuffer, x + 10, y + 17, { width: 100, height: 28 });
      } catch (err) {
        doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7).text('[Signature Rendering Error]', x + 10, y + 25);
      }
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(7.5).text(name, x+5, y+48);
      doc.fillColor(textMuted).font('Helvetica').fontSize(6.5).text(`Date: ${new Date(sigObj.signed_at).toLocaleDateString()}`, x+5, y+56);
    } else {
      doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7.5).text('PENDING DIGITAL SIGNATURE', x + 10, y + 25);
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(7.5).text(name, x+5, y+48);
    }
  };
  
  // Row 1: Seller & Buyer
  drawSigBox(50, curY, 'SELLER SIGNATURE (Transferor)', t.seller_name, sellerSig, false);
  drawSigBox(310, curY, 'BUYER SIGNATURE (Transferee)', t.buyer_name, buyerSig, false);
  curY += 70;
  
  // Row 2: Notary & Officer
  drawSigBox(50, curY, 'ASSIGNED NOTARY', notaryName, notarySig, true);
  if (isLand) {
    drawSigBox(310, curY, 'LAND REGISTRATION OFFICER', officerName, officerSig, true);
  } else {
    doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(8).text('Land Registration Officer Signature not required for non-land transfers.', 310, curY + 25, { width: 235 });
  }
  
  curY += 75;
  
  // QR Code
  doc.strokeColor(borderLight).rect(50, curY, 60, 60).stroke();
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrBuffer = await getQRBuffer(`${baseUrl}/verify/${t.agreement_number}`);
    if (qrBuffer) {
      doc.image(qrBuffer, 52, curY + 2, { width: 56, height: 56 });
    } else {
      doc.fillColor(primaryBlue).rect(52, curY + 2, 56, 56).fill();
    }
  } catch (err) {
    doc.fillColor(primaryBlue).rect(52, curY + 2, 56, 56).fill();
  }
  
  doc.fillColor(textDark).font('Helvetica-Bold').fontSize(8.5).text('Scan QR Code to verify authenticity', 120, curY + 15);
  doc.fillColor(textMuted).font('Helvetica').fontSize(7.5).text(`Agreement ID: ${t.agreement_number}`, 120, curY + 30);
  doc.text(`Digital Hash: ${t.agreement_id}`, 120, curY + 45);

  doc.end();

  // 4. Update the Database Record with File Path & Cryptographic SHA256 Hash
  return new Promise((resolve, reject) => {
    writeStream.on('finish', async () => {
      try {
        const fileBuffer = fs.readFileSync(pdfFilePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const shaHash = hashSum.digest('hex');

        // Save PDF path relative to standard server access URL or direct disk
        const dbPdfPath = `/uploads/agreements/${pdfFileName}`;

        await client.query(`
          UPDATE transfer_agreements
          SET 
            pdf_path = $1,
            agreement_hash = $2,
            updated_at = NOW()
          WHERE transfer_id = $3
        `, [dbPdfPath, shaHash, transferId]);

        console.log(`✓ PDF Generated and saved: ${pdfFileName} (SHA: ${shaHash})`);
        resolve({ pdfPath: dbPdfPath, hash: shaHash });
      } catch (err) {
        reject(err);
      }
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

function getQRBuffer(text) {
  return new Promise((resolve) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
    https.get(url, (res) => {
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

/**
 * Generates an official, government-grade PDF Certificate of Ownership,
 * dynamically building it with vector styles, borders, stamps, and QR codes.
 * 
 * @param {string} certificateId - UUID of the certificate
 * @param {object} tx - Optional database transaction client
 */
async function generateCertificatePDF(certificateId, res = null, tx = null) {
  let client = db;
  let responseStream = null;

  if (res) {
    if (typeof res.query === 'function') {
      client = res;
    } else {
      responseStream = res;
      if (tx) client = tx;
    }
  }

  const cRes = await client.query(`
    SELECT c.*, 
           p.id as property_id, p.title as property_title, p.type as property_type, 
           p.district as property_district, p.address as property_address, p.metadata as property_metadata, p.created_at as property_created_at,
           u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone, u.national_id as owner_national_id, u.profile_photo as owner_photo,
           notary.full_name as notary_name, notary.email as notary_email,
           officer.full_name as land_officer_name,
           t.id as transfer_ref_id, t.created_at as transfer_date,
           u_prev.full_name as previous_owner_name
    FROM asset_certificates c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN ownership_transfers t ON c.ownership_transfer_id = t.id
    LEFT JOIN users notary ON notary.id = t.notary_request_id
    LEFT JOIN users officer ON officer.id = c.notary_id
    LEFT JOIN users u_prev ON t.from_user = u_prev.id
    WHERE c.id = $1
  `, [certificateId]);

  if (cRes.rowCount === 0) throw new Error('Certificate not found');
  const cert = cRes.rows[0];

  // Validation: Missing owner photo triggers fallback
  // Silhouette drawing will be used automatically in Section 2

  let signatures = [];
  if (cert.ownership_transfer_id) {
    const sigsRes = await client.query(`
      SELECT ds.*, u.full_name as signer_name, u.national_id
      FROM digital_signatures ds
      JOIN users u ON ds.user_id = u.id
      JOIN transfer_agreements ta ON ta.id = ds.agreement_id
      WHERE ta.transfer_id = $1
    `, [cert.ownership_transfer_id]);
    signatures = sigsRes.rows;
  } else {
    // Initial Registration
    try {
      const sigsRes = await client.query(`
        SELECT ds.*, u.full_name as signer_name, u.national_id
        FROM digital_signatures ds
        JOIN users u ON ds.user_id = u.id
        WHERE ds.property_id = $1
      `, [cert.property_id]);
      signatures = sigsRes.rows;
    } catch (e) {
      // ignore
    }
  }

  const notarySig = signatures.find(s => s.role === 'notary' || s.signature_type === 'notary_signature');
  const officerSig = signatures.find(s => s.role === 'officer' || s.signature_type === 'officer_signature');

  const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false, bufferPages: true });
  if (responseStream) doc.pipe(responseStream);

  const primaryBlue = '#1D4ED8';
  const textDark = '#111827';
  const textMuted = '#475569';
  const borderLight = '#E2E8F0';
  const bgLight = '#F8FAFC';
  const pageWidth = 595.28;
  const contentWidth = pageWidth - 100;

  // Global Watermark, Border & Footer Listener
  let pageNumber = 0;
  doc.on('pageAdded', () => {
    pageNumber++;
    doc.save();
    
    // Watermark
    doc.rotate(-45, { origin: [doc.page.width/2, doc.page.height/2] });
    doc.fillColor('#F1F5F9').fontSize(60).font('Helvetica-Bold');
    doc.text('SNDNPRS OFFICIAL CERTIFICATE', doc.page.width/2 - 400, doc.page.height/2 - 20, { align: 'center', width: 800, lineBreak: false });
    doc.restore();

    // Border
    doc.strokeColor(primaryBlue).lineWidth(2).rect(15, 15, doc.page.width - 30, doc.page.height - 30).stroke();
    doc.strokeColor(primaryBlue).lineWidth(0.5).rect(18, 18, doc.page.width - 36, doc.page.height - 36).stroke();

    // Footer
    const bottom = doc.page.height - 40;
    const oldMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    
    doc.strokeColor(borderLight).lineWidth(1).moveTo(50, bottom - 15).lineTo(doc.page.width - 50, bottom - 15).stroke();
    
    doc.fontSize(7).font('Helvetica-Bold').fillColor(primaryBlue)
       .text('This certificate is digitally generated by the Somali National Digital Notary & Property Registry System (SNDNPRS). Any alteration invalidates this certificate.', 50, bottom - 5, { lineBreak: false, width: 450 });
       
    doc.font('Helvetica').fontSize(7).fillColor(textMuted)
       .text(`Generated: ${new Date().toISOString()} | Certificate ID: ${cert.id}`, 50, bottom + 5, { lineBreak: false });
    
    doc.text(`Page ${pageNumber}`, doc.page.width - 100, bottom, { align: 'right', width: 50, lineBreak: false });
    
    doc.page.margins.bottom = oldMargin;
  });

  // Manually trigger the first page to properly fire pageAdded for our borders and watermark
  doc.addPage();

  // --- HEADER ---
  doc.save();
  doc.translate(doc.page.width/2, 55);
  doc.scale(0.8);
  doc.fillColor('#3B82F6');
  doc.path('M 0 -25 L 5.8 -7.5 L 23.7 -7.5 L 9.3 3.5 L 14.7 21.2 L 0 11.2 L -14.7 21.2 L -9.3 3.5 L -23.7 -7.5 L -5.8 -7.5 Z').fill();
  doc.restore();

  doc.moveDown(3);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold')
     .text('FEDERAL REPUBLIC OF SOMALIA', 50, 85, { align: 'center', width: contentWidth });
  doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold')
     .text('SOMALI NATIONAL DIGITAL NOTARY & PROPERTY REGISTRY SYSTEM (SNDNPRS)', 50, 97, { align: 'center', width: contentWidth });
     
  doc.fillColor(primaryBlue).fontSize(18).font('Helvetica-Bold')
     .text('OFFICIAL OWNERSHIP CERTIFICATE', 50, 115, { align: 'center', width: contentWidth, characterSpacing: 1 });
     
  doc.fillColor(textMuted).fontSize(12).font('Helvetica-Bold')
     .text('PROPERTY OWNERSHIP CERTIFICATE', 50, 135, { align: 'center', width: contentWidth, characterSpacing: 2 });

  doc.strokeColor(primaryBlue).lineWidth(2).moveTo(50, 155).lineTo(doc.page.width - 50, 155).stroke();
  
  const regNum = `REG-${cert.property_id.slice(9, 13).toUpperCase()}`;
  const certNum = `CERT-${cert.id.slice(0, 8).toUpperCase()}`;

  doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(`Certificate Number: ${certNum} | Registry Number: ${regNum}`, 50, 165);
  doc.text(`Issue Date: ${new Date(cert.issued_at).toLocaleDateString()} | Status: ACTIVE`, doc.page.width - 250, 165, { align: 'right', width: 200 });
  
  let curY = 190;

  // --- HELPER FUNCTIONS ---
  const drawSectionHeader = (title, yPos) => {
    doc.fillColor(bgLight).rect(50, yPos, contentWidth, 16).fill();
    doc.strokeColor(primaryBlue).lineWidth(1).rect(50, yPos, contentWidth, 16).stroke();
    doc.fillColor(primaryBlue).fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), 60, yPos + 4);
    return yPos + 20;
  };

  const drawTable = (startX, startY, rows, colWidths) => {
    let currentY = startY;
    const rowHeight = 15;
    
    rows.forEach((row, rowIndex) => {
      let currentX = startX;
      if (rowIndex === 0) {
        doc.fillColor(primaryBlue).rect(startX, currentY, colWidths.reduce((a,b)=>a+b,0), rowHeight).fill();
      }
      doc.strokeColor(borderLight).lineWidth(1).rect(startX, currentY, colWidths.reduce((a,b)=>a+b,0), rowHeight).stroke();
      
      row.forEach((cell, i) => {
        if (i > 0) doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke();
        doc.fillColor(rowIndex === 0 ? 'white' : textDark)
           .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5);
        doc.text(String(cell || 'N/A'), currentX + 5, currentY + 4, { width: colWidths[i] - 10, align: 'left', height: rowHeight, lineBreak: false });
        currentX += colWidths[i];
      });
      currentY += rowHeight;
    });
    return currentY;
  };

  const md = typeof cert.property_metadata === 'string' ? JSON.parse(cert.property_metadata) : (cert.property_metadata || {});
  const rawDate = md.registration_date || cert.property_created_at;
  const regDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  const isLand = ['land', 'residential', 'commercial', 'industrial'].includes((cert.property_type || '').toLowerCase());
  
  // Section 1 - Property Information
  curY = drawSectionHeader(isLand ? 'Property Information' : 'Asset Information', curY);
  
  if (isLand) {
    const landSize = md.size || md.area || md.sqft || 'Not specified';
    const gpsCoord = md.gps_coordinates || 'N/A';
    curY = drawTable(50, curY, [
      ['Field', 'Details', 'Field', 'Details'],
      ['Property ID', cert.property_id.slice(0, 18) + '...', 'Certificate Number', certNum],
      ['Registry Number', regNum, 'Property Type', (cert.property_type || '').toUpperCase()],
      ['District', (cert.property_district || '').toUpperCase(), 'Region', 'Banaadir'],
      ['Full Address', cert.property_address || 'N/A', 'Land Size', landSize],
      ['GPS Coordinates', gpsCoord, 'Registration Date', regDate]
    ], [100, 147.5, 100, 147.5]);
  } else {
    const allKeys = Object.keys(md);
    const idKey1 = allKeys[0] || 'Identifier 1';
    const idVal1 = md[idKey1] || 'N/A';
    const idKey2 = allKeys.length > 1 ? allKeys[1] : 'Identifier 2';
    const idVal2 = md[idKey2] || 'N/A';
    
    curY = drawTable(50, curY, [
      ['Field', 'Details', 'Field', 'Details'],
      ['Asset ID', cert.property_id.slice(0, 18) + '...', 'Certificate Number', certNum],
      ['Registry Number', regNum, 'Asset Type', (cert.property_type || '').toUpperCase()],
      ['District', cert.property_district ? cert.property_district.toUpperCase() : 'N/A', 'Address', cert.property_address || 'N/A'],
      [idKey1.toUpperCase().replace(/_/g, ' '), String(idVal1).toUpperCase(), idKey2.toUpperCase().replace(/_/g, ' '), String(idVal2).toUpperCase()],
      ['Registration Date', regDate, '', '']
    ], [100, 147.5, 100, 147.5]);
  }
  curY += 8;

  // Section 2 - Registered Owner
  curY = drawSectionHeader('Registered Owner', curY);
  
  const drawOwnerCard = (x, y) => {
    doc.fillColor(bgLight).rect(x, y, contentWidth, 75).fill();
    doc.strokeColor(borderLight).lineWidth(1).rect(x, y, contentWidth, 75).stroke();
    
    // Photo Box
    doc.strokeColor(borderLight).rect(x + 10, y + 10, 55, 55).stroke();
    
    let isPlaceholder = true;
    if (cert.owner_photo) {
      try {
        const relativePath = cert.owner_photo.startsWith('/') ? cert.owner_photo.slice(1) : cert.owner_photo;
        const absolutePath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(absolutePath)) {
          doc.image(absolutePath, x + 11, y + 11, { width: 53, height: 53 });
          isPlaceholder = false;
        }
      } catch (err) { }
    }
    
    // Silhouette Drawing (Fallback)
    if (isPlaceholder) {
      doc.save();
      doc.translate(x + 37.5, y + 37.5);
      doc.fillColor('#D1D5DB');
      doc.circle(0, -8, 10).fill(); // Head
      doc.path('M -20 17 Q -20 2 0 2 Q 20 2 20 17 Z').fill(); // Shoulders
      doc.restore();
    }
    
    // Details
    let dy = y + 12;
    const drawRow = (lbl, val) => {
      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text(lbl, x + 85, dy);
      doc.fillColor(textDark).fontSize(7.5).font('Helvetica').text(String(val), x + 85, dy + 8);
      dy += 19;
    };
    
    drawRow('Full Name', cert.owner_name);
    drawRow('National ID', cert.owner_national_id || 'N/A');
    drawRow('Phone Number', cert.owner_phone || 'N/A');
    
    dy = y + 12;
    const drawRowRight = (lbl, val) => {
      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text(lbl, x + 285, dy);
      doc.fillColor(textDark).fontSize(7.5).font('Helvetica').text(String(val), x + 285, dy + 8);
      dy += 19;
    };
    
    drawRowRight('Email', cert.owner_email || 'N/A');
    drawRowRight('Address', 'Mogadishu, Somalia');
    drawRowRight('Registration Date', regDate);
  };
  
  drawOwnerCard(50, curY);
  curY += 83;

  // Section 3 - Property Description
  curY = drawSectionHeader(isLand ? 'Property Description' : 'Asset Description', curY);
  
  if (isLand) {
    const landUse = md.land_use || 'Not Specified';
    const buildingType = md.building_type || 'Not Specified';
    const ownershipType = md.ownership_type || 'Private';
    const propCondition = md.condition || 'Not Specified';
    const prevRef = md.previous_reference || 'N/A';
    
    curY = drawTable(50, curY, [
      ['Land Use', 'Building Type', 'Ownership Type', 'Condition', 'Previous Ref.'],
      [landUse, buildingType, ownershipType, propCondition, prevRef]
    ], [99, 99, 99, 99, 99]);
  } else {
    const allKeys = Object.keys(md);
    const skipKeys = [allKeys[0], allKeys.length > 1 ? allKeys[1] : null, 'registration_date', 'previous_reference'];
    const keys = allKeys.filter(k => !skipKeys.includes(k)).slice(0, 5);
    while (keys.length < 5) keys.push(''); 
    
    const headers = keys.map(k => k ? k.replace(/_/g, ' ').toUpperCase() : '');
    const values = keys.map(k => k ? String(md[k] || 'N/A') : '');
    
    curY = drawTable(50, curY, [headers, values], [99, 99, 99, 99, 99]);
  }
  curY += 8;

  // Section 4 - Legal Declaration
  curY = drawSectionHeader('Legal Declaration', curY);
  doc.fillColor(textDark).font('Helvetica-Oblique').fontSize(8.5);
  doc.text(
    "This certificate confirms that the above-named individual is the lawful registered owner of the described property according to the Somali National Digital Notary & Property Registry System (SNDNPRS). This ownership is recorded in the national property registry and is protected under the applicable laws of the Federal Republic of Somalia.",
    55, curY, { width: contentWidth - 10, align: 'justify', lineGap: 3 }
  );
  curY += 40;

  // Section 5 & 6 - Verification and Government Authentication
  curY = drawSectionHeader('Verification & Authentication', curY);
  
  // Left: Verification QR
  doc.strokeColor(borderLight).rect(50, curY, 60, 60).stroke();
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrText = `${baseUrl}/verify/${cert.id}`;
    const qrBuf = await getQRBuffer(qrText);
    if (qrBuf) {
      doc.image(qrBuf, 52, curY + 2, { width: 56, height: 56 });
    } else {
      doc.fillColor(primaryBlue).rect(52, curY + 2, 56, 56).fill();
    }
  } catch (err) {
    doc.fillColor(primaryBlue).rect(52, curY + 2, 56, 56).fill();
  }
  doc.fillColor(textDark).font('Helvetica-Bold').fontSize(8.5).text('Scan QR Code to verify authenticity', 120, curY + 15);
  doc.fillColor(textMuted).font('Helvetica').fontSize(7.5).text(`Certificate ID: ${cert.id}`, 120, curY + 30);
  doc.text(`Issued: ${new Date(cert.issued_at).toLocaleString()}`, 120, curY + 45);

  curY += 75;

  const drawSigBox = (x, y, title, name, sigObj, isGov = false) => {
    doc.strokeColor(borderLight).lineWidth(1).rect(x, y, 235, 65).stroke();
    doc.fillColor(isGov ? primaryBlue : bgLight).rect(x+1, y+1, 233, 14).fill();
    doc.fillColor(isGov ? 'white' : primaryBlue).font('Helvetica-Bold').fontSize(7.5).text(title, x + 5, y + 4);
    
    if (sigObj) {
      try {
        const sigBuffer = Buffer.from(sigObj.signature_image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        doc.image(sigBuffer, x + 10, y + 17, { width: 100, height: 28 });
      } catch (err) {
        doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7).text('[Signature Rendering Error]', x + 10, y + 25);
      }
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(7.5).text(name, x+5, y+48);
      doc.fillColor(textMuted).font('Helvetica').fontSize(6.5).text(`Date: ${new Date(sigObj.signed_at).toLocaleDateString()}`, x+5, y+56);
    } else {
      doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7.5).text('PENDING DIGITAL SIGNATURE', x + 10, y + 25);
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(7.5).text(name, x+5, y+48);
    }
  };
  
  const notaryName = cert.notary_name || (notarySig && notarySig.signer_name) || 'Notary Public';
  const officerName = cert.land_officer_name || (officerSig && officerSig.signer_name) || 'National Land Registrar';
  
  drawSigBox(50, curY, 'GOVERNMENT NOTARY', notaryName, notarySig, true);
  
  if (cert.property_type && ['land', 'residential', 'commercial', 'industrial'].includes(cert.property_type.toLowerCase())) {
    drawSigBox(310, curY, 'LAND REGISTRATION OFFICER', officerName, officerSig, true);
  } else {
    doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(8).text('Land Registration Officer Signature not required for non-land property.', 310, curY + 25, { width: 235 });
  }
  
  doc.fillColor(primaryBlue).font('Helvetica-Bold').fontSize(8).text('CERTIFICATE ISSUED BY: SOMALI NATIONAL REGISTRY', 50, curY + 75);

  doc.end();
  return doc;
}

module.exports = { generateAgreementPDF, generateCertificatePDF };
