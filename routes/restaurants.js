const dbModule = require('../models/dbmodules'); // Import the dbmodule
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { isAdmin } = require('../middleware/admin');
const { verifyAuth } = require('../middleware/auth');
const restaurantvalidation = require('../validate/restaurantvalidation');
const {COLLECTION_RESTAURANT}=require('../collectionConstant');
// Restaurant Management Routes

// Add a new restaurant
router.post('/', verifyAuth, isAdmin, async (req, res) => {
    if (!restaurantvalidation.validateRestaurant(req.body,res)) {
        return 
    }

    const { name, address, restaurantOwnerId } = req.body; // Extract data from request body

    try {
        // Check if the restaurant already exists
        const exists = await dbModule.findOne(COLLECTION_RESTAURANT, {
            name: name,
            'address.pincode': address.pincode // Check for matching pincode in the address object
        });

        if (exists) {
            return res.status(400).json({ message: 'Restaurant already added.' });
        }

        // Ensure only converted `restaurantOwnerId` is included in the data
        const restaurantData = {
            name,
            address,
            description: req.body.description,
            cuisineType: req.body.cuisineType,
            phoneNumber: req.body.phoneNumber,
            rating: req.body.rating,
            website: req.body.website,
            timings: req.body.timings,
            restaurantOwnerId: new ObjectId(restaurantOwnerId), // Convert to ObjectId
            addedAt: new Date(), // Set current date
            addedBy: new ObjectId(req.user.id) // Store userId as ObjectId in addedBy        
        };

        // Insert the new restaurant into the database
        const result = await dbModule.insertOne(COLLECTION_RESTAURANT, restaurantData);
        res.status(200).json({ message: 'Restaurant added successfully.', restaurantId: result.insertedId });
    } catch (error) {
        console.error('Error adding restaurant:', error);
        res.status(500).json({ message: error.message });
    }
});



// Get all restaurants
router.get('/', async (req, res) => {
    try {
        const restaurants = await dbModule.findAll(COLLECTION_RESTAURANT);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a restaurant by ID
router.get('/:restaurantId', async (req, res) => {
    restaurantId = req.params;
    if (!restaurantId) {
        // If no restaurantId is provided, return all restaurants
        const restaurants = await dbModule.findAll(COLLECTION_RESTAURANT, {});
        return res.json(restaurants);
    }
    if (!restaurantvalidation.validateRestaurantId(req.params,res)) {
        return;
    }

    try {
        const restaurant = await dbModule.findOne(COLLECTION_RESTAURANT, { _id: new ObjectId(req.params.restaurantId) });
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
