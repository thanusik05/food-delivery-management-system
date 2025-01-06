const Joi = require('joi');
const { ROLES} = require('../collectionConstant')
const userSchema = Joi.object({
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(), // Password must be at least 6 characters long.
    address: Joi.string().max(255).optional(),
    phoneNumber: Joi.string().pattern(/^[0-9]+$/).length(10).optional(), 
    role: Joi.string().valid(ROLES.USER, ROLES.ADMIN,ROLES.DELIVERY_AGENT,ROLES.RESTAURANT_OWNER).default(ROLES.USER)
});

// Function to validate user data against the schema.
const validateUser = (userData) => {
    const {error}= userSchema.validate(userData);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};
const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(), // User's email
        password: Joi.string().required() // Password is required
    });
    const {error}= schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};
module.exports = { userSchema, validateUser,validateLogin };