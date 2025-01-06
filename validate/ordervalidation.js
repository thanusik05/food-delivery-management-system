const Joi = require('joi');
const JoiObjectId = require('joi-objectid')(Joi);
const { ORDER_STATUSES} = require('../collectionConstant')
// Order validation schema.
const orderSchema = Joi.object({
    userId: JoiObjectId(), // Should be an ObjectId in real implementation.
    orderNo:Joi.number(),
    items: Joi.array()
        .items(Joi.object({
            itemId: JoiObjectId().required(), // Should be an ObjectId in real implementation.
            quantity: Joi.number().integer().positive().required()
        }))
        .min(1)
        .required(),
    totalAmount: Joi.number().positive(),
    deliveryAddress: Joi.string().max(255).required(),
    createdAt: Joi.date().iso() ,// Validate that createdAt is a valid ISO date-time string
    status : Joi.string().valid(ORDER_STATUSES.DELIVERED, ORDER_STATUSES.NOT_DELIVERED,ORDER_STATUSES.CANCELED,ORDER_STATUSES.DELIVERYAGENT_ASSIGNED).default(ORDER_STATUSES.NOT_DELIVERED)
});
const validateOrder = (orderData,res) => {
    const schema = Joi.object({
        items: Joi.array()
        .items(Joi.object({
            itemId: Joi.string().required(), // Should be an ObjectId in real implementation.
            quantity: Joi.number().integer().positive().required()
        }))
        .min(1)
        .required(),
        deliveryAddress: Joi.string().max(255).required()
    });
    const {error}= schema.validate(orderData);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};
const validateOrderId = (data,res) => {
    const schema = Joi.object({
        orderId: Joi.string().required() // Assuming orderId is a string
    });
    const {error}= schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};
const validateDateRange = (data,res) => {
    const schema = Joi.object({
        restaurantId:JoiObjectId(), 
        startDate: Joi.date().iso().required(), // Start date must be a valid ISO date
        endDate: Joi.date().iso().required() // End date must be a valid ISO date
    });
    const {error}= schema.validate(data);
    if (error) {
        // Send the error response directly
        res.status(400).json({ message: error.details[0].message });
        return false; // Indicate that validation failed
    }
    return true;
};

module.exports = { orderSchema, validateOrder ,validateOrderId , validateDateRange};