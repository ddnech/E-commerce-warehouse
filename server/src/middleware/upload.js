const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { uploadDir } = require("../config/env");

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE_MB = 5;

function makeUploader(folder, fieldName, maxCount) {
  const target = path.join(uploadDir, folder);
  fs.mkdirSync(target, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: target,
      // Random file names: no clashes, and nothing from the user ends up in the path.
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${ALLOWED[file.mimetype]}`),
    }),
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: maxCount },
    fileFilter: (req, file, cb) => {
      if (ALLOWED[file.mimetype]) return cb(null, true);
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", fieldName));
    },
  });

  const handler = maxCount > 1 ? upload.array(fieldName, maxCount) : upload.single(fieldName);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) {
        const files = req.files || (req.file ? [req.file] : []);
        req.uploadedPaths = files.map((f) => `/uploads/${folder}/${f.filename}`);
        req.uploadedPath = req.uploadedPaths[0];
        return next();
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `Image is too big. The limit is ${MAX_SIZE_MB} MB.` });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({ message: `You can upload up to ${maxCount} images at once.` });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Use JPG, PNG or WEBP images." });
      }
      return res.status(400).json({ message: err.message });
    });
  };
}

/** One optional image in `fieldName`, saved to uploads/<folder>. Path ends up in req.uploadedPath. */
const imageUpload = (folder, fieldName) => makeUploader(folder, fieldName, 1);

/** Several images in `fieldName`. Paths end up in req.uploadedPaths. */
const imagesUpload = (folder, fieldName, maxCount = 5) => makeUploader(folder, fieldName, maxCount);

/** Delete previously uploaded files. Quietly ignores files that are already gone. */
function removeUpload(...publicPaths) {
  for (const publicPath of publicPaths.flat()) {
    if (!publicPath || !publicPath.startsWith("/uploads/")) continue;
    const file = path.join(uploadDir, publicPath.replace("/uploads/", ""));
    if (!file.startsWith(uploadDir)) continue;
    fs.promises.unlink(file).catch(() => {});
  }
}

module.exports = { imageUpload, imagesUpload, removeUpload };
