const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "default_jwt_secret_key", {
    expiresIn: "30d",
  });
};

module.exports = generateToken;