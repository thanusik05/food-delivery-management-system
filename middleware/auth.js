const jwt = require('jsonwebtoken');
const config = require('config');

// Function to generate authentication token
const generateAuthToken = (user) => {
    const token = jwt.sign(
        { _id: user._id, role: user.role },
        config.get('jwtPrivateKey'),
        { expiresIn: '1d' },

    );
    return token;
};

// Middleware to verify authentication token
const verifyAuth = (req, res, next) => {
    const token = req.header('x-auth-token'); // Get the token from the request header
    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }
    
    try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey')); // Verify the token
        req.user = {
            id: decoded._id, // Accessing _id from decoded token
            role: decoded.role // Include role 
        }; 
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(400).send('Token has expired.');
        } else {
            return res.status(400).send('Invalid token');
        }
    }
};

// Exporting functions for use in other parts of the application
exports.generateAuthToken = generateAuthToken;
exports.verifyAuth = verifyAuth;
