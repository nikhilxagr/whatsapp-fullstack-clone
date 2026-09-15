const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (file) => {
  if (!file) return null;
  const isImage = file.mimetype?.startsWith("image");
  const options = {
    resource_type: isImage ? "image" : "video",
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const uploader = isImage
        ? cloudinary.uploader.upload
        : cloudinary.uploader.upload_large;
      uploader(file.path, options, (error, result) => {
        if (error) return reject(error);
        if (fs.existsSync(file.path)) {
          fs.unlink(file.path, () => {});
        }
        resolve(result);
      });
    });
    return result;
  } catch (cloudinaryError) {
    console.warn("⚠️ Cloudinary upload skipped / failed (403):", cloudinaryError.message);
    const filename = path.basename(file.path);
    const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const localUrl = `${host}/uploads/${filename}`;
    console.log(`ℹ️ [Media Fallback] Serving uploaded file locally: ${localUrl}`);
    return { secure_url: localUrl, url: localUrl };
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const multerMiddleware = multer({ storage }).single("file");

module.exports = { uploadOnCloudinary, cloudinary, multerMiddleware };