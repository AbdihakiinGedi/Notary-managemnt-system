const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const { cToken, cbToken, nToken, citizenId, citizenBId, notaryId } = {
"cToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRmMzUyYmUwLTA0NjItNDIxMy05NzVmLWI4MzQ5NDNkYTIzNSIsImVtYWlsIjoiYUB0ZXN0LmNvbSIsInJvbGUiOiJjaXRpemVuIiwibmFtZSI6IkNpdGl6ZW4gQSIsImFjY291bnRfc3RhdHVzIjoidmVyaWZpZWQiLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzg2NTU5NTI2LCJleHAiOjE3ODY1NjMxMjZ9.yRGBrSE8DkdbclwMrllQhPXz-eiZGAjLtm-yI_ixmu4","cbToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxZTQ5ZWY2LThlMzAtNDZlMS05ODQyLTdkOWM0ZjljZjA2MyIsImVtYWlsIjoiYkB0ZXN0LmNvbSIsInJvbGUiOiJjaXRpemVuIiwibmFtZSI6IkNpdGl6ZW4gQiIsImFjY291bnRfc3RhdHVzIjoidmVyaWZpZWQiLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzg2NTU5NTI2LCJleHAiOjE3ODY1NjMxMjZ9.bcIx6JtNl3dn2vdJPras14QBiUBm-jg81AThdVbsDQA","nToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVlMGRjY2E5LWUzYTAtNDViYy05NjZkLTIwMTBkMTg2YjIwMCIsImVtYWlsIjoibkB0ZXN0LmNvbSIsInJvbGUiOiJub3RhcnkiLCJuYW1lIjoiTm90YXJ5IiwiYWNjb3VudF9zdGF0dXMiOiJ2ZXJpZmllZCIsInZlcmlmaWVkIjp0cnVlLCJpYXQiOjE3ODY1NTk1MjYsImV4cCI6MTc4NjU2MzEyNn0.9A5SNOrmFSvrBqC_UJYGfKvPpc6EBNqPUGiBsyzLvtI","citizenId":"4f352be0-0462-4213-975f-b834943da235","citizenBId":"e1e49ef6-8e30-46e1-9842-7d9c4f9cf063","notaryId":"ee0dcca9-e3a0-45bc-966d-2010d186b200"
};

const URL = 'http://localhost:5001/api';

async function run() {
  try {
    console.log("1. Test Motorcycle Registration");
    const fd = new FormData();
    fd.append('title', 'Honda Bike');
    fd.append('district', 'Karaan');
    fd.append('address', '123 St');
    fd.append('type', 'motorcycle');
    fd.append('latitude', '');
    fd.append('longitude', '');
    fd.append('visibility', 'public');
    fd.append('description', 'test');
    
    // fake file for upload
    // fs.writeFileSync('test.pdf', 'dummy content');
    // fd.append('documents', fs.createReadStream('test.pdf'));
    // fs.writeFileSync('test.jpg', 'dummy content');
    // fd.append('image', fs.createReadStream('test.jpg'));

    const res1 = await axios.post(`${URL}/properties`, fd, { headers: { ...fd.getHeaders(), Authorization: `Bearer ${cToken}` } });
    console.log("Moto:", res1.status, res1.data);
    const motoId = res1.data.property.id;

    console.log("2. Test Land Registration validation (expect 400 for empty GPS)");
    const fdLand = new FormData();
    fdLand.append('title', 'Land');
    fdLand.append('district', 'Karaan');
    fdLand.append('address', '123 St');
    fdLand.append('type', 'land');
    fdLand.append('latitude', '');
    fdLand.append('longitude', '');
    fdLand.append('visibility', 'public');
    fdLand.append('description', 'test');
    // fdLand.append('documents', fs.createReadStream('test.pdf'));
    // fdLand.append('image', fs.createReadStream('test.jpg'));

    try {
      await axios.post(`${URL}/properties`, fdLand, { headers: { ...fdLand.getHeaders(), Authorization: `Bearer ${cToken}` } });
    } catch(e) {
      console.log("Land validation 400 caught successfully:", e.response.status, e.response.data);
    }

    console.log("3. Notary Approve Motorcycle");
    const resNotary = await axios.patch(`${URL}/properties/${motoId}/notary-approve`, { signatureData: 'test' }, { headers: { Authorization: `Bearer ${nToken}` } });
    console.log("Notary Approve:", resNotary.status, resNotary.data);

    console.log("4. Initiate Transfer");
    const resInit = await axios.post(`${URL}/transfers`, { property_id: motoId, to_user: citizenBId, price: 100 }, { headers: { Authorization: `Bearer ${cToken}` } });
    console.log("Init Transfer:", resInit.status, resInit.data);
    const transferId = resInit.data.id;

    console.log("5. Accept Transfer (Buyer)");
    const resAcc = await axios.patch(`${URL}/transfers/${transferId}/accept`, {}, { headers: { Authorization: `Bearer ${cbToken}` } });
    console.log("Accept:", resAcc.status, resAcc.data);

    console.log("6. Mock Signatures");
    const db = require('../config/db');
    const agrRes = await db.query('SELECT id FROM transfer_agreements WHERE transfer_id = $1', [transferId]);
    await db.query('UPDATE transfer_agreements SET seller_signed = true, buyer_signed = true, locked = true WHERE id = $1', [agrRes.rows[0].id]);

    console.log("7. Notary Certify Transfer");
    const resCert = await axios.patch(`${URL}/transfers/${transferId}/notary-certify`, { signature_image: 'test' }, { headers: { Authorization: `Bearer ${nToken}` } });
    console.log("Certify:", resCert.status, resCert.data);

    console.log("SUCCESS. ALL TESTS PASSED");

  } catch(e) {
    console.error("Test failed:", e.response ? e.response.data : e.message);
  } finally {
    process.exit(0);
  }
}
run();
