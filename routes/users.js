const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { generateAuthToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { verifyAuth } = require('../middleware/auth');
const uservalidation = require('../validate/uservalidation');
const dbModule = require('../models/dbmodules'); // Import the dbmodule
const {COLLECTION_USER} = require('../collectionConstant');
// User Management Routes

// Add a new user
router.post('/', verifyAuth, isAdmin, async (req, res) => {
    if (!uservalidation.validateUser(req.body,res)) {
        return;
    }

    try {
        // Check if the user already exists using the email
        const existingUser = await dbModule.findOne(COLLECTION_USER, { email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already registered.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const userData = { ...req.body, password: hashedPassword };

        // Add the new user
        const result = await dbModule.insertOne(COLLECTION_USER, userData);

        res.status(200).json({ message: 'User added successfully', userId: result.insertedId });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ message: error.message });
    }
});

// User login
router.post('/login', async (req, res) => {
    
    if (!uservalidation.validateLogin(req.body.res)) {
        return;
    }

    const { email, password } = req.body;

    try {
        // Find the user by email using dbModule
        const user = await dbModule.findOne(COLLECTION_USER, { email });
        if (!user) {
            return res.status(400).send('Invalid email or password.');
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid email or password.');
        }

        // Generate auth token
        const token = generateAuthToken(user);

        // Respond with user data and token
        res.json({
            message: 'Login successful',
            token,
            userId: user._id // Optionally send back the user's ID
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
