const db = require('../config/db');
const { generateCertificatePDF } = require('../services/pdfService');

async function testPDF() {
  try {
    // monkey patch the db query to inject a fake photo just to bypass the photo check and see if it fails later
    const originalQuery = db.query.bind(db);
    db.query = async (...args) => {
      const res = await originalQuery(...args);
      if (res && res.rows && res.rows[0] && res.rows[0].id === '2b3c2b08-1807-4fbe-a1ec-1419d142a04e') {
        res.rows[0].owner_photo = 'fake.jpg';
      }
      return res;
    };
    
    const fs = require('fs');
    const stream = fs.createWriteStream('test_cert.pdf');
    await generateCertificatePDF('2b3c2b08-1807-4fbe-a1ec-1419d142a04e', stream);
    console.log("PDF generated!");
  } catch (err) {
    console.error("PDF_ERROR:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

testPDF();

testPDF();
