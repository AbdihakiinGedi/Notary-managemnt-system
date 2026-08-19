const nodemailer = require('nodemailer');
const { safeExecute } = require('../middleware/systemMiddleware');
const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Configure Nodemailer transporter (Using ethereal or a generic SMTP)
// For this application, we'll use a standard local mockup if real creds aren't provided
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'etherealpassword'
    }
});

const generateHTMLTemplate = (title, message, propertyRef = null, verifyLink = null) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1E3A8A; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">SNDNPRS</h2>
        <p style="color: #D1D5DB; margin: 5px 0 0 0;">Somali National Digital Notary & Property Registry</p>
    </div>
    
    <div style="padding: 30px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1E3A8A; margin-top: 0;">${title}</h3>
        
        <p style="font-size: 16px;">${message}</p>
        
        ${propertyRef ? `
        <div style="background-color: #F3F4F6; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0;">
            <strong>Property Reference:</strong> ${propertyRef}
        </div>` : ''}
        
        ${verifyLink ? `
        <div style="text-align: center; margin-top: 30px;">
            <a href="${verifyLink}" style="background-color: #1E3A8A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Details / Verify</a>
        </div>` : ''}
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
        
        <p style="font-size: 12px; color: #6B7280; text-align: center;">
            Date: ${new Date().toUTCString()}<br/>
            This is an automated official notification from the SNDNPRS system. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
`;

const dispatchEmail = async (to, subject, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: '"SNDNPRS Official" <noreply@sndnprs.gov.so>',
            to,
            subject,
            html: htmlContent
        });
        
        console.log(`[EMAIL_DISPATCHED] To: ${to} | Subject: ${subject} | MsgID: ${info.messageId}`);
        // Log the email dispatch as an audit
        // Find a system user or use null for system actions
        safeExecute(() => logAudit('EMAIL_DISPATCHED', null, null, { recipient: to, subject: subject }))();
        return true;
    } catch (err) {
        console.error(`[EMAIL_DISPATCH_FAILED] To: ${to} | Subject: ${subject}`, err);
        return false;
    }
};

const sendPropertyRegistered = async (user, property) => {
    const title = 'Property Registration Submitted';
    const message = `Dear ${user.full_name},<br/><br/>Your property registration request has been successfully submitted and is now pending Notary verification.`;
    const html = generateHTMLTemplate(title, message, property.id);
    return dispatchEmail(user.email, title, html);
};

const sendPropertyNotaryApproved = async (ownerEmail, ownerName, propertyId) => {
    const title = 'Property Notary Verified';
    const message = `Dear ${ownerName},<br/><br/>Your property registration documents have been verified by a Notary. The application is now with the Officer for final approval.`;
    const html = generateHTMLTemplate(title, message, propertyId);
    return dispatchEmail(ownerEmail, title, html);
};

const sendPropertyOfficerApproved = async (ownerEmail, ownerName, propertyId) => {
    const title = 'Property Registration Approved';
    const message = `Dear ${ownerName},<br/><br/>Your property registration has been fully approved. The asset is now registered on the national ledger.`;
    const html = generateHTMLTemplate(title, message, propertyId, `http://localhost:3000/properties/${propertyId}`);
    return dispatchEmail(ownerEmail, title, html);
};

const sendPropertyLocked = async (admin, property) => {
    // Notify owner
    const ownerRes = await db.query('SELECT u.email, u.full_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [property.id]);
    if (ownerRes.rowCount > 0) {
        const owner = ownerRes.rows[0];
        const title = 'Property Officially Locked';
        const message = `Dear ${owner.full_name},<br/><br/>Your property has been administratively LOCKED by the registry authority. Transfers are currently restricted.`;
        const html = generateHTMLTemplate(title, message, property.id);
        return dispatchEmail(owner.email, title, html);
    }
};

const sendPropertyUnlocked = async (admin, property) => {
    const ownerRes = await db.query('SELECT u.email, u.full_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [property.id]);
    if (ownerRes.rowCount > 0) {
        const owner = ownerRes.rows[0];
        const title = 'Property Unlocked';
        const message = `Dear ${owner.full_name},<br/><br/>Your property has been UNLOCKED and is now active for transfers.`;
        const html = generateHTMLTemplate(title, message, property.id);
        return dispatchEmail(owner.email, title, html);
    }
};

const sendTransferInitiated = async (seller, buyer, propertyId) => {
    const title = 'Transfer Initiated';
    const message = `Dear ${buyer.full_name},<br/><br/>A property transfer has been initiated to you by ${seller.full_name}. Please log in to review and accept the transfer.`;
    const html = generateHTMLTemplate(title, message, propertyId, 'http://localhost:3000/transfers');
    return dispatchEmail(buyer.email, title, html);
};

const sendTransferAccepted = async (sellerEmail, buyerName, propertyId) => {
    const title = 'Transfer Accepted by Buyer';
    const message = `Dear Seller,<br/><br/>Your transfer has been accepted by ${buyerName}. It is now awaiting Notary verification.`;
    const html = generateHTMLTemplate(title, message, propertyId);
    return dispatchEmail(sellerEmail, title, html);
};

const sendTransferRejected = async (sellerEmail, buyerName, propertyId) => {
    const title = 'Transfer Rejected';
    const message = `Dear Seller,<br/><br/>Your transfer offer was rejected by ${buyerName}. The process has been aborted.`;
    const html = generateHTMLTemplate(title, message, propertyId);
    return dispatchEmail(sellerEmail, title, html);
};

const sendCertificateGenerated = async (ownerEmail, ownerName, propertyId, certificateId) => {
    const title = 'Official Certificate Generated';
    const message = `Dear ${ownerName},<br/><br/>A new official Ownership Certificate has been generated for your property.`;
    const html = generateHTMLTemplate(title, message, propertyId, `http://localhost:3000/verify/${certificateId}`);
    return dispatchEmail(ownerEmail, title, html);
};

const sendUserActivation = async (user, is_active) => {
    const title = is_active ? 'Account Activated' : 'Account Deactivated';
    const message = is_active 
        ? `Dear ${user.full_name},<br/><br/>Your account on the SNDNPRS has been activated. You may now log in.`
        : `Dear ${user.full_name},<br/><br/>Your account on the SNDNPRS has been deactivated by an Administrator. Please contact support for assistance.`;
    const html = generateHTMLTemplate(title, message);
    return dispatchEmail(user.email, title, html);
};

module.exports = {
    sendPropertyRegistered,
    sendPropertyNotaryApproved,
    sendPropertyOfficerApproved,
    sendPropertyLocked,
    sendPropertyUnlocked,
    sendTransferInitiated,
    sendTransferAccepted,
    sendTransferRejected,
    sendCertificateGenerated,
    sendUserActivation
};
