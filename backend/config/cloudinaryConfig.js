const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
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

  return new Promise((resolve, reject) => {
    const uploader = isImage
      ? cloudinary.uploader.upload
      : cloudinary.uploader.upload_large;
    uploader(file.path, options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

const multerMiddleware = multer({ dest: "uploads/" }).single("file");

module.exports = { uploadOnCloudinary, cloudinary, multerMiddleware };