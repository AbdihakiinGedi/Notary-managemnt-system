const db = require('./db');
const crypto = require('crypto');

/**
 * Unified Sovereign Notification Dispatcher
 * Features: SHA-256 Recipient-Specific Deduplication, Role-Aware Routing, Real DB-backed Notifications
 */
const notifyService = async ({ event_type, actor_id, asset_id, payload_json = {}, category = 'system' }) => {
  try {
    const recipients = new Set(); // Set of user IDs to receive the notification
    let title = event_type.replace(/_/g, ' ');
    let message = payload_json.message || `Registry action: ${title}`;

    // Helper: Add recipients by role
    const addRecipientsByRole = async (roleName) => {
      const res = await db.query(`
        SELECT u.id 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE LOWER(r.name) = $1 AND u.is_active = true
      `, [roleName.toLowerCase()]);
      for (const row of res.rows) recipients.add(row.id);
    };

    const normalizedEvent = event_type.toUpperCase();

    // ==========================================
    // CITIZEN NOTIFICATIONS (1-8)
    // ==========================================
    if (normalizedEvent === 'REGISTRATION_SUBMITTED') {
      if (actor_id) recipients.add(actor_id);
      title = 'Registration Submitted';
      message = 'Your registration has been submitted and is awaiting administrator approval.';
    } 
    else if (normalizedEvent === 'ACCOUNT_APPROVED') {
      if (payload_json.target_user) recipients.add(payload_json.target_user);
      title = 'Account Approved';
      message = 'Your account has been approved.';
    }
    else if (normalizedEvent === 'ACCOUNT_REJECTED') {
      if (payload_json.target_user) recipients.add(payload_json.target_user);
      title = 'Account Rejected';
      message = payload_json.rejection_reason 
        ? `Your account was rejected. Reason: ${payload_json.rejection_reason}`
        : 'Your account was rejected.';
    }
    else if (normalizedEvent === 'PROPERTY_APPROVED') {
      if (payload_json.owner_id) recipients.add(payload_json.owner_id);
      title = 'Property Approved';
      message = 'Your property registration has been approved.';
    }
    else if (normalizedEvent === 'PROPERTY_REJECTED') {
      if (payload_json.owner_id) recipients.add(payload_json.owner_id);
      title = 'Property Rejected';
      message = 'Your property registration was rejected.';
    }
    else if (normalizedEvent === 'TRANSFER_REQUEST_RECEIVED') {
      if (payload_json.to_user) recipients.add(payload_json.to_user);
      title = 'Transfer Request Received';
      message = 'A new property transfer has been initiated and is awaiting your acceptance.';
    }
    else if (normalizedEvent === 'TRANSFER_COMPLETED_CITIZEN') {
      if (payload_json.from_user) recipients.add(payload_json.from_user);
      if (payload_json.to_user) recipients.add(payload_json.to_user);
      title = 'Transfer Completed';
      message = 'Your property transfer has been successfully certified and completed.';
    }
    else if (normalizedEvent === 'CERTIFICATE_GENERATED') {
      if (payload_json.owner_id) recipients.add(payload_json.owner_id);
      title = 'Certificate Generated';
      message = 'A new official Ownership Certificate has been generated for your property.';
    }

    // ==========================================
    // ADMINISTRATOR NOTIFICATIONS (9-15)
    // ==========================================
    else if (normalizedEvent === 'USER_REGISTERED') {
      await addRecipientsByRole('admin');
      title = 'New User Registration';
      message = 'A new citizen has registered and is awaiting approval.';
    }
    else if (normalizedEvent === 'ID_VERIFICATION_RESUBMITTED') {
      await addRecipientsByRole('admin');
      title = 'Identity Verification Resubmitted';
      message = 'A user has resubmitted their identity verification documents.';
    }
    else if (normalizedEvent === 'NEW_PROPERTY_REGISTERED') {
      await addRecipientsByRole('admin');
      title = 'New Property Registered';
      message = 'A new property has been submitted for registration.';
    }
    else if (normalizedEvent === 'TRANSFER_INITIATED_ADMIN') {
      await addRecipientsByRole('admin');
      title = 'Transfer Initiated';
      message = 'A new property transfer process has been initiated.';
    }
    else if (normalizedEvent === 'TRANSFER_COMPLETED_ADMIN') {
      await addRecipientsByRole('admin');
      title = 'Transfer Completed';
      message = 'A property transfer process has been completed successfully.';
    }
    else if (['INTEGRITY_FAILURE', 'SUSPICIOUS_ACTIVITY', 'SYSTEM_ERROR'].includes(normalizedEvent)) {
      await addRecipientsByRole('admin');
      title = 'System Error / Audit Alert';
      message = payload_json.message || 'Suspicious activity or database integrity failure detected.';
      category = 'security';
    }
    else if (normalizedEvent === 'NEW_STAFF_ACCOUNT') {
      await addRecipientsByRole('admin');
      title = 'New Staff Account Created';
      message = 'A new Officer or Notary account has been created.';
    }

    // ==========================================
    // NOTARY NOTIFICATIONS (16-20)
    // ==========================================
    else if (normalizedEvent === 'PROPERTY_WAITING_VERIFICATION') {
      if (payload_json.assigned_notary_id) {
        recipients.add(payload_json.assigned_notary_id);
      } else {
        await addRecipientsByRole('notary');
      }
      title = 'New Property Waiting Verification';
      message = 'A new property has been submitted and is awaiting your verification.';
    }
    else if (normalizedEvent === 'TRANSFER_ASSIGNED') {
      if (payload_json.assigned_notary_id) recipients.add(payload_json.assigned_notary_id);
      title = 'Transfer Assigned';
      message = 'You have been assigned to certify a new property transfer.';
    }
    else if (normalizedEvent === 'BUYER_ACCEPTED_TRANSFER') {
      if (payload_json.assigned_notary_id) recipients.add(payload_json.assigned_notary_id);
      title = 'Buyer Accepted Transfer';
      message = 'The buyer has accepted the transfer terms. You may proceed with certification.';
    }
    else if (normalizedEvent === 'DOCUMENTS_READY_REVIEW') {
      if (payload_json.assigned_notary_id) recipients.add(payload_json.assigned_notary_id);
      title = 'Documents Ready for Review';
      message = 'Transfer documents are ready for your review and certification.';
    }
    else if (normalizedEvent === 'WAITING_NOTARY_SIGNATURE') {
      if (payload_json.assigned_notary_id) recipients.add(payload_json.assigned_notary_id);
      title = 'Waiting for Notary Signature';
      message = 'A transfer agreement is awaiting your digital signature.';
    }
    else if (normalizedEvent === 'TRANSFER_COMPLETED_NOTARY') {
      if (payload_json.assigned_notary_id) recipients.add(payload_json.assigned_notary_id);
      title = 'Transfer Completed';
      message = 'A property transfer you certified has been successfully completed.';
    }

    // ==========================================
    // OFFICER NOTIFICATIONS (21-25)
    // ==========================================
    else if (normalizedEvent === 'LAND_TRANSFER_WAITING_APPROVAL') {
      if (payload_json.assigned_officer_id) recipients.add(payload_json.assigned_officer_id);
      else await addRecipientsByRole('officer');
      title = 'Land Transfer Waiting Approval';
      message = 'A land transfer has been notarized and is waiting for your final approval.';
    }
    else if (normalizedEvent === 'NEW_PROPERTY_WAITING_VERIFICATION') {
      if (payload_json.assigned_officer_id) recipients.add(payload_json.assigned_officer_id);
      else await addRecipientsByRole('officer');
      title = 'New Property Waiting Verification';
      message = 'A new property registration has been notarized and awaits your verification.';
    }
    else if (normalizedEvent === 'NOTARY_CERTIFICATION_COMPLETED') {
      if (payload_json.assigned_officer_id) recipients.add(payload_json.assigned_officer_id);
      else await addRecipientsByRole('officer');
      title = 'Notary Certification Completed';
      message = 'Notary certification has been completed for a pending record.';
    }
    else if (normalizedEvent === 'PROPERTY_APPROVED_OFFICER') {
      if (payload_json.assigned_officer_id) recipients.add(payload_json.assigned_officer_id);
      else await addRecipientsByRole('officer');
      title = 'Property Approved';
      message = 'The property registration has been successfully approved.';
    }
    else if (normalizedEvent === 'TRANSFER_COMPLETED_OFFICER') {
      if (payload_json.assigned_officer_id) recipients.add(payload_json.assigned_officer_id);
      else await addRecipientsByRole('officer');
      title = 'Transfer Completed';
      message = 'The property transfer has been successfully approved and completed.';
    }
    else if (normalizedEvent === 'PROPERTY_LOCKED') {
      if (payload_json.owner_id) recipients.add(payload_json.owner_id);
      title = 'Property Locked';
      message = `Your property has been locked. Reason: ${payload_json.reason || 'N/A'}. Officer: ${payload_json.officer_name || 'System'}. Date: ${new Date().toLocaleDateString()}. View Property.`;
    }
    else if (normalizedEvent === 'PROPERTY_LOCKED_OFFICER') {
      if (actor_id) recipients.add(actor_id);
      title = 'Property Locked Successfully';
      message = `You locked property ${payload_json.property_name || 'N/A'}`;
    }
    else if (normalizedEvent === 'PROPERTY_UNLOCKED') {
      if (payload_json.owner_id) recipients.add(payload_json.owner_id);
      title = 'Property Unlocked';
      message = `Your property has been unlocked. Reason: ${payload_json.reason || 'N/A'}. Officer: ${payload_json.officer_name || 'System'}. Date: ${new Date().toLocaleDateString()}. View Property.`;
    }
    else if (normalizedEvent === 'PROPERTY_UNLOCKED_OFFICER') {
      if (actor_id) recipients.add(actor_id);
      title = 'Property Unlocked Successfully';
      message = `You unlocked property ${payload_json.property_name || 'N/A'}`;
    }
    else {
      // Unmapped events - fallback
      if (actor_id) recipients.add(actor_id);
    }

    // ==========================================
    // NOTIFICATION DISPATCH (DB + Sockets)
    // ==========================================
    for (const userId of recipients) {
      const rawString = `${event_type}:${userId}:${actor_id}:${asset_id}:${JSON.stringify(payload_json)}:${message}`;
      const dedupHash = crypto.createHash('sha256').update(rawString).digest('hex');

      const insertRes = await db.query(`
        INSERT INTO notifications (user_id, title, message, category, metadata, dedup_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (dedup_hash) DO NOTHING
        RETURNING id
      `, [
        userId,
        title,
        message,
        category,
        JSON.stringify({ ...payload_json, asset_id }),
        dedupHash
      ]);

      if (insertRes.rowCount > 0 && global.io) {
        global.io.to(userId.toString()).emit('refresh_notifications');
      }
    }

    return true;
  } catch (err) {
    console.error('[NOTIFY_SERVICE_ERROR]', err.message);
    return false;
  }
};

module.exports = { notifyService };
