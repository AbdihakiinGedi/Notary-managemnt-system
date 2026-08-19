const db = require('../config/db');
const { generateCertificatePDF } = require('../services/pdfService');
const fs = require('fs');

async function verifyPDFs() {
  try {
    // 1. Generate Non-Land Certificate
    console.log("Generating Non-Land Certificate (Motorcycle/Car)...");
    const stream1 = fs.createWriteStream('scratch/test_non_land.pdf');
    await generateCertificatePDF('2b3c2b08-1807-4fbe-a1ec-1419d142a04e', stream1);
    console.log("Non-Land PDF generated successfully.");

    // 2. Generate Land Certificate (Find one from DB)
    const landCertRes = await db.query(`
      SELECT c.id FROM asset_certificates c
      JOIN properties p ON c.property_id = p.id
      WHERE p.type IN ('land', 'residential', 'commercial')
      LIMIT 1
    `);
    
    if (landCertRes.rowCount > 0) {
      console.log(`Generating Land Certificate (${landCertRes.rows[0].id})...`);
      const stream2 = fs.createWriteStream('scratch/test_land.pdf');
      await generateCertificatePDF(landCertRes.rows[0].id, stream2);
      console.log("Land PDF generated successfully.");
    } else {
      console.log("No Land certificate found in DB to test.");
    }
  } catch (error) {
    console.error("Test Failed:", error.message);
  } finally {
    process.exit(0);
  }
}

verifyPDFs();
