// src/config/db.js

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

let db;

const connectDB = async () => {
    try {
        const client = new MongoClient(process.env.MONGODB_URL);
        await client.connect();
        db = client.db(process.env.DB_NAME);
        console.log('MongoDB connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
};

module.exports = { connectDB, getDB };
