const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/dbConnect");
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// Connect to MongoDB
connectDB();

app.use(cookieParser());
app.use(cors());
app.use(express.json());



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})