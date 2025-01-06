const Joi = require('joi');
const JoiObjectId = require('joi-objectid')(Joi);
const { ORDER_STATUSES} = require('../collectionConstant')
// Define Joi schema for delivery assignment
const deliverySchema = Joi.object({
    orderId: JoiObjectId().required(), // ObjectId validation for orderId (Joi automatically handles this)
    deliveryPersonId: JoiObjectId().required(), // ObjectId validation for deliveryPersonId (Joi automatically handles this)
    status: Joi.string().valid(ORDER_STATUSES.DELIVERED, ORDER_STATUSES.NOT_DELIVERED, ORDER_STATUSES.CANCELED, ORDER_STATUSES.DELIVERYAGENT_ASSIGNED)
        .default(ORDER_STATUSES.DELIVERED),
    createdAt: Joi.date().iso(),
    updatedAt: Joi.date().iso(),
    AssignedBy:JoiObjectId()
});

// Validate the delivery assignment data
const validateDeliveryAssignment = (deliveryData, res) => {
    const schema = Joi.object({
        orderId: JoiObjectId().required(), // ObjectId validation for orderId (Joi automatically handles this)
        deliveryPersonId: JoiObjectId().required()
    })
    const { error } = schema.validate(deliveryData);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true; // Indicate that validation passed
};


// Schema for validating order status update
const validateOrderStatusUpdate = (data,res) => {
    const schema = Joi.object({
        status: Joi.string().valid(ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELED).required() // Example statuses
    });
    const {error}=schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true; // Indicate that validation passed
};
const validateDeliveryId = (deliveryData, res) => {
    const schema = Joi.object({
        deliveryId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid delivery ID format. It must be a 24-character hexadecimal string.',
            'any.required': 'Delivery ID is required.'
        })
    });
    const { error } = schema.validate(deliveryData);
     if (error) {
        res.status(400).json({ message: error.details[0].message });
        return false;
    }
    return true;
};

module.exports = { validateDeliveryAssignment, validateOrderStatusUpdate,validateDeliveryId };
