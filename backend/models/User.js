const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneSuffix: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    emailOtp: {
      type: String,
      required: false,
    },
    emailOtpExpiry: {
      type: Date,
      required: false,
    },
    phoneOtp: {
      type: String,
      required: false,
    },
    phoneOtpExpiry: {
      type: Date,
      required: false,
    },
    profilePicture: {
      type: String,
      required: false,
    },
    about: {
      type: String,
      required: false,
      default: "Hey there! I am using WhatsApp.",
    },
    lastSeen: {
      type: Date,
      required: false,
    },
    isOnline: {
      type: Boolean,
      required: false,
      default: false,
    },
    isVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    agree: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;