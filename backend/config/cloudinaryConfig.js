const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (file) => {
    const options = {
        resource_type: file.minetype.startWith("image") ? "image" : "video",
    }

    return new Promise((resolve, reject) => {
        const uploader = file.minetype.startWith("image") ? cloudinary.uploader.upload : cloudinary.uploader.upload_large;
        uploader(file.path, options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}


const multerMiddleware = multer({dist:"uploads/"}).single("file");

module.exports = { uploadOnCloudinary, cloudinary, multerMiddleware };