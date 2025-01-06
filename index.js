// src/index.js

const express = require('express');
const connectDB = require('./config/db');
const startupRoutes = require('./startup/routes');

require('dotenv').config();

connectDB.connectDB();

const app = express();

// Middleware setup 
app.use(express.json()); // Built-in middleware for JSON parsing

// Initialize routes from startup file.
startupRoutes(app);

// Start server 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
