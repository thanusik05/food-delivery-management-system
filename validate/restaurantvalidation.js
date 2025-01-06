const Joi = require('joi');
const JoiObjectId = require('joi-objectid')(Joi);

// Restaurant validation schema.
const restaurantSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(255).optional(),
    cuisineType: Joi.string().max(50).optional(),
    address: Joi.object({
        addressLine1: Joi.string().max(255).required(), // Required first line of the address
        addressLine2: Joi.string().max(255).optional(), // Optional second line of the address
        pincode: Joi.string().pattern(/^[0-9]{6}$/).required() // Assuming a 6-digit pincode
    }).required(),
    phoneNumber: Joi.string().pattern(/^[0-9]+$/).length(10).required(),
    rating: Joi.number().max(10),
   website : Joi.string(),
   timings : Joi.string().required(),
   restaurantOwnerId :  JoiObjectId().required(),
   addedBy : JoiObjectId(),
    addedAt:Joi.date().iso()

});

const validateRestaurant = (restaurantData,res) => {
    const Schema = Joi.object({
        name: Joi.string().min(1).max(100).required(),
        description: Joi.string().max(255).optional(),
        cuisineType: Joi.string().max(50).optional(),
        address: Joi.object({
            addressLine1: Joi.string().max(255).required(), // Required first line of the address
            addressLine2: Joi.string().max(255).optional(), // Optional second line of the address
            pincode: Joi.string().pattern(/^[0-9]{6}$/).required() // Assuming a 6-digit pincode
        }).required(),
        phoneNumber: Joi.string().pattern(/^[0-9]+$/).length(10).required(),
        rating: Joi.number().max(10),
       website : Joi.string(),
       timings : Joi.string().required(),
       restaurantOwnerId :  JoiObjectId().required(),
    });

    const {error}=Schema.validate(restaurantData);
    if(error){
        res.status(400).json({ message: error.details[0].message });
        return false;
    }
    return true;
};
const validateRestaurantId = (data,res) => {
    const schema = Joi.object({
        restaurantId: Joi.string().required() // Assuming restaurantId is a string
    });
    const {error}= schema.validate(data);
    if(error){
        res.status(400).json({ message: error.details[0].message });
        return false;
    }
    return true;
};
module.exports = { restaurantSchema, validateRestaurant , validateRestaurantId };