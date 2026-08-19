const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { fromBuffer } = require('file-type');

const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'temp')); // Stage in temp folder (#6)
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExts.join(', ')}`), false);
  }
};

const multerInstance = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

const validateMagicBytes = async (req, res, next) => {
  if (!req.files && !req.file) return next();
  try {
    const validate = async (file) => {
      const buffer = Buffer.alloc(4100);
      let fd;
      try {
        fd = await fs.promises.open(file.path, 'r');
        await fd.read(buffer, 0, 4100, 0);
        await fd.close();
      } catch (e) {
        if (fd) await fd.close();
        throw e;
      }
      
      const type = await fromBuffer(buffer);
      
      const ext = path.extname(file.originalname).toLowerCase();
      const isValidImage = type && type.mime.startsWith('image/');
      const isValidPdf = type && type.mime === 'application/pdf';
      const isMSDoc = type && (type.mime.includes('word') || type.mime.includes('excel') || type.mime.includes('officedocument'));
      const isZipDoc = type && type.mime === 'application/zip' && ['.docx', '.xlsx'].includes(ext);
      const isTxt = !type && ext === '.txt'; // Text files often don't have magic bytes file-type detects

      if (!isValidImage && !isValidPdf && !isMSDoc && !isZipDoc && !isTxt) {
        await fs.promises.unlink(file.path);
        throw new Error('Spoofed file detected.');
      }

      // Compute SHA256 hash
      const hash = crypto.createHash('sha256');
      const fileBuffer = await fs.promises.readFile(file.path);
      hash.update(fileBuffer);
      file.hash = hash.digest('hex');
    };

    if (req.files) {
      if (Array.isArray(req.files)) {
        for (const f of req.files) await validate(f);
      } else {
        for (const key in req.files) {
          for (const f of req.files[key]) await validate(f);
        }
      }
    } else if (req.file) {
      await validate(req.file);
    }
    next();
  } catch (err) {
    console.error(`[UPLOAD_SECURITY_INCIDENT] IP: ${req.ip}, User: ${req.user ? req.user.id : 'ANONYMOUS'}, Reason: ${err.message}`);
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'REJECTED_UPLOAD',
        payload_json: { message: `Rejected Upload (Security Incident): IP: ${req.ip}, User: ${req.user ? req.user.id : 'ANONYMOUS'}. Reason: ${err.message}` },
        category: 'security'
      });
    } catch (notifyErr) {
      console.error('Failed to notify upload incident:', notifyErr.message);
    }
    return res.status(400).json({ error: `Upload validation failed: ${err.message}` });
  }
};

module.exports = {
  fields: (f) => [multerInstance.fields(f), validateMagicBytes],
  array: (f, max) => [multerInstance.array(f, max), validateMagicBytes],
  single: (f) => [multerInstance.single(f), validateMagicBytes]
};
