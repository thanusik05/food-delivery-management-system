const Joi = require('joi');
const JoiObjectId = require('joi-objectid')(Joi);
const { AVAILABILITY,CATEGORY} = require('../collectionConstant')
const menuItemSchema = Joi.object({
    restaurantId: JoiObjectId().required(), // ObjectId validation for restaurantId
    itemName: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(255).optional(),
    price: Joi.number().positive().required(),
    category: Joi.string().valid(CATEGORY.VEG, CATEGORY.NON_VEG).default(CATEGORY.VEG).required(),
    availability: Joi.string().valid(AVAILABILITY.AVAILABLE, AVAILABILITY.NOT_AVAILABLE).default(AVAILABILITY.AVAILABLE).required(),
    addedBy : JoiObjectId(),
    addedAt:Joi.date().iso() 
});

// Function to validate menu item data against the schema.
const validateMenuItem = (menuItemData,res) => {
    const { error } = menuItemSchema.validate(menuItemData);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};

const validateMenuItemUpdate = (data,res) => {
    const schema = Joi.object({
        itemName: Joi.string().min(1).max(100).optional(), // Optional name
        description: Joi.string().optional(), // Optional description
        price: Joi.number().positive().strict().optional(), // Optional price
        category: Joi.string().valid(CATEGORY.VEG, CATEGORY.NON_VEG).optional(),
        availability: Joi.string().valid(AVAILABILITY.AVAILABLE, AVAILABILITY.NOT_AVAILABLE).optional(),
    });
    const {error}=schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};

// Schema for validating the deletion of a menu item (just itemId here)
const validateMenuItemId = (data,res) => {
    const schema = Joi.object({
        itemId: JoiObjectId().required() // ObjectId validation for itemId
    });
    const {error}= schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};

module.exports = { 
    menuItemSchema, 
    validateMenuItem, 
    validateMenuItemUpdate, 
    validateMenuItemId 
};
