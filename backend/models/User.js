const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
  },
  phoneSuffix: {
    type: String,
    required: true,
    unique: false,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function (v) {
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
  profilePicture: {
    type: String,
    required: false,
  },
  about: {
    type: String,
    required: false,
    },
    lastSeen: {
      type: Date,
      required: false,
    },
    isOnline: {
      type: Boolean,
      required: false,
    },
    isVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    agree: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
