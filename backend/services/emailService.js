const nodemailer = require('nodemailer');

// Setup generic transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass'
  }
});

const generateHeader = (title) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .header { background-color: #2563eb; padding: 30px 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; }
    .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>SNDNPRS - ${title}</h2>
    </div>
    <div class="content">
`;

const generateFooter = () => `
    </div>
    <div class="footer">
      <p>Somali National Digital Registry<br>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

exports.sendRegistrationReceivedEmail = async (user) => {
  const html = `
    ${generateHeader('Registration Received')}
    <p>Dear ${user.full_name},</p>
    <p>Thank you for registering with the Somali National Digital Registry.</p>
    <p>Your account is currently <strong>Pending Approval</strong>. Our administrators are reviewing your submitted identity document.</p>
    <p>You will receive another email once your account has been approved or if further action is required.</p>
    ${generateFooter()}
  `;
  try {
    await transporter.sendMail({
      from: '"SNDNPRS Admin" <admin@sndnprs.gov.so>',
      to: user.email,
      subject: 'Registration Received - Pending Approval',
      html
    });
  } catch (err) {
    console.error('Failed to send registration email', err);
  }
};

exports.sendApprovalEmail = async (user) => {
  const html = `
    ${generateHeader('Account Approved')}
    <p>Dear ${user.full_name},</p>
    <p>Great news! Your account has been verified and <strong>approved</strong> by an administrator.</p>
    <p>You now have full access to the registry. You can register properties, initiate transfers, and request certificates.</p>
    <a href="http://localhost:5173/login" class="btn">Login to Dashboard</a>
    ${generateFooter()}
  `;
  try {
    await transporter.sendMail({
      from: '"SNDNPRS Admin" <admin@sndnprs.gov.so>',
      to: user.email,
      subject: 'Your Account Has Been Approved',
      html
    });
  } catch (err) {
    console.error('Failed to send approval email', err);
  }
};

exports.sendRejectionEmail = async (user, reason) => {
  const html = `
    ${generateHeader('Action Required: Identity Verification Failed')}
    <p>Dear ${user.full_name},</p>
    <p>We encountered an issue while verifying your identity document.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>Please log in to your account to resubmit a valid document.</p>
    <a href="http://localhost:5173/login" class="btn">Login to Resubmit</a>
    ${generateFooter()}
  `;
  try {
    await transporter.sendMail({
      from: '"SNDNPRS Admin" <admin@sndnprs.gov.so>',
      to: user.email,
      subject: 'Action Required: Verification Failed',
      html
    });
  } catch (err) {
    console.error('Failed to send rejection email', err);
  }
};

exports.notifyAdminNewUser = async (adminEmails, user) => {
  const html = `
    ${generateHeader('New Registration Requires Approval')}
    <p>A new user has registered and is waiting for identity verification.</p>
    <ul>
      <li><strong>Name:</strong> ${user.full_name}</li>
      <li><strong>Email:</strong> ${user.email}</li>
    </ul>
    <p>Please log in to the admin dashboard to review.</p>
    ${generateFooter()}
  `;
  try {
    await transporter.sendMail({
      from: '"System" <system@sndnprs.gov.so>',
      to: adminEmails.join(','),
      subject: 'New User Registration - Action Required',
      html
    });
  } catch (err) {
    console.error('Failed to send admin notification email', err);
  }
};
