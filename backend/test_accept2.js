const db = require('./config/db');
const { generateAgreementPDF } = require('./services/pdfService');

async function test() {
  try {
    console.log("Connected");
    
    const transfers = await db.query("SELECT id FROM ownership_transfers LIMIT 1");
    console.log("Transfers:", transfers.rows);
    
    if(transfers.rowCount > 0) {
      const id = transfers.rows[0].id;
      console.log("Testing generateAgreementPDF for:", id);
      try {
        await generateAgreementPDF(id, db);
        console.log("SUCCESS");
      } catch(err) {
        console.error("PDF ERROR:", err.message);
        console.error(err.stack);
      }
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

test();
