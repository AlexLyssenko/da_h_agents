import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';
import * as attachmentsService from '../services/attachments';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? 'unknown';
    const uploadPath = path.join(config.uploadDir, userId, uuidv4());
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename(_req, file, cb) {
    cb(null, file.originalname);
  },
});

function fileSizeLimit(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const isImage = IMAGE_MIME_TYPES.has(file.mimetype);
  // We can't easily check size in fileFilter; rely on multer limits instead
  void isImage;
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: fileSizeLimit,
});

// Post-upload middleware to enforce per-image size limit and validate file type
async function validateUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const file = req.file;
  const isImage = IMAGE_MIME_TYPES.has(file.mimetype);

  if (isImage && file.size > config.maxImageSize) {
    fs.unlinkSync(file.path);
    res.status(413).json({ error: 'Image exceeds 3 MB limit' });
    return;
  }

  // Validate actual file type via magic bytes
  try {
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(file.path);
    if (detected && detected.mime !== file.mimetype) {
      // Check if the declared mime is close enough (e.g. svg+xml won't have magic bytes)
      const isSvg = file.mimetype === 'image/svg+xml';
      if (!isSvg) {
        fs.unlinkSync(file.path);
        res.status(415).json({ error: 'File type mismatch' });
        return;
      }
    }
  } catch {
    // file-type detection failed — proceed with declared mime
  }

  next();
}

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  validateUpload,
  asyncHandler(async (req, res) => {
    const file = req.file!;
    const comment = typeof req.body.comment === 'string' ? req.body.comment : undefined;

    const attachment = await attachmentsService.createAttachment({
      userId: req.user!.id,
      filename: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      comment,
    });
    res.status(201).json(attachment);
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attachment = await attachmentsService.getAttachment(req.user!.id, req.params.id);

    if (!fs.existsSync(attachment.storagePath)) {
      throw new AppError(404, 'File not found on disk');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(path.resolve(attachment.storagePath));
  })
);

export default router;
