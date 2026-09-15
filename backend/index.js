const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

const connectDB = require("./config/dbConnect");
const authRoute = require("./routes/authRoute");
const chatRoute = require("./routes/chatRoute");
const statusRoute = require("./routes/statusRoute");
const { initializeSocket } = require("./services/socketService");
require("./services/firebaseService");

const path = require("path");
const PORT = process.env.PORT || 5000;
const app = express();

// Middlewares
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to allow seamless dev connections
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Create HTTP Server & Initialize Socket.io
const server = http.createServer(app);
const io = initializeSocket(server);

// Attach Socket.io instance to Express request object
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/chat", chatRoute);
app.use("/api/status", statusRoute);

// Start HTTP server with WebSockets
server.listen(PORT, () => {
  console.log(`Server and Socket.io are running on port ${PORT}`);
});