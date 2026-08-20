const jwt = require('jsonwebtoken');
const User = require('../models/userModel');


const authMiddleware = async (req, res, next) => {
    const authToken = req.cookies?.auth_token;
    if (!authToken) {
        return res.status(401).json({ message: "Unauthorized: No authentication token provided" });
    }

    try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: Invalid authentication token" });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid authentication token" });
    }
};

module.exports = authMiddleware;