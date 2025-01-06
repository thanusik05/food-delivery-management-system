const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { verifyAuth } = require('../middleware/auth');
const { restaurantOwner } = require('../middleware/owner');
const {appuser}=require('../middleware/user');
const menuitemvalidation = require('../validate/menuitemvalidation');
const restaurantvalidation = require('../validate/restaurantvalidation');
const { COLLECTION_MENUITEM , COLLECTION_RESTAURANT,AVAILABILITY ,CATEGORY} = require('../collectionConstant');
const {
    insertOne,
    findOne,
    updateOne,
    deleteOne,
    findAll,
    exists,
    aggregate
} = require('../models/dbmodules'); // Import generalized DB functions


// Add a new menu item
router.post('/', verifyAuth, restaurantOwner, async (req, res) => {
     if(!menuitemvalidation.validateMenuItem(req.body,res)){
        return;
     }
    

    let { restaurantId, itemName, ...menuItemData } = req.body;

    try {
        // Convert restaurantId to ObjectId
        restaurantId = new ObjectId(restaurantId);

        // Fetch restaurant details to verify ownership
        const restaurant = await findOne(COLLECTION_RESTAURANT, { _id: restaurantId });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found.' });
        }

        // Check if the user is the owner of the restaurant
        if (!restaurant.restaurantOwnerId.equals(req.user.id)) {
            return res.status(403).json({ message: 'Access denied. You are not the owner of this restaurant.' });
        }

        // Check if the menu item already exists for this restaurant
        const existsCheck = await exists(COLLECTION_MENUITEM, { restaurantId, itemName });
        if (existsCheck) {
            return res.status(400).json({ message: 'Menu item already exists for this restaurant.' });
        }

        // Add restaurantId and itemName back to the menu item data
        menuItemData = { 
            ...menuItemData, 
            restaurantId, 
            itemName,
            addedAt: new Date(), // Set current date
            addedBy: new ObjectId(req.user.id) // Store userId as ObjectId in addedBy
        };

        // Add the menu item to the database
        const result = await insertOne(COLLECTION_MENUITEM, menuItemData);
        res.status(200).json({ message: 'Menu item added successfully', menuItem: result });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get menu items by restaurant ID
router.get('/:restaurantId', async (req, res) => {
    const { restaurantId } = req.params;
    if(!restaurantvalidation.validateRestaurantId({restaurantId},res)){
        return
    }

    try {
        // Aggregate menu items with restaurant details
        const result = await aggregate(COLLECTION_MENUITEM, [
            {
                $match: { restaurantId: new ObjectId(restaurantId) } // Match menu items by restaurantId
            },
            {
                $lookup: {
                    from: COLLECTION_RESTAURANT, // Join with the restaurants collection
                    localField: "restaurantId", // restaurantId in menuitems
                    foreignField: "_id", // _id in restaurants
                    as: "restaurantDetails" // Output field
                }
            },
            {
                $unwind: "$restaurantDetails" // Unwind the restaurant details array
            },
            {
                $project: {
                    restaurantName: "$restaurantDetails.name", // Include restaurant name
                    _id: 1,
                    itemName: 1,
                    description: 1,
                    price: 1,
                    category: 1,
                    availability: 1    
                }
            }
        ]);

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'No menu items found for this restaurant.' });
        }

        res.json(result); // Return menu items with restaurant name
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get menu item by ID
router.get('/item/:itemId', async (req, res) => {
    const { itemId } = req.params;

    if( !menuitemvalidation.validateMenuItemId({ itemId },res)){
        return
    }
    
    try {
        const menuItem = await findOne(COLLECTION_MENUITEM, { _id: new ObjectId(itemId) });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }

        res.json(menuItem); // Return the found menu item
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ message: error.message });
    }
});

// Search menu items by name and optionally by category
router.post('/search', verifyAuth, appuser, async (req, res) => {
    const { name, restaurantId, category } = req.body; // Extract 'name', 'restaurantId', and 'category' from the request body

    // Ensure at least one filter is provided
    if (!name && !restaurantId && !category) {
        return res.status(400).json({ message: 'At least one filter (name, restaurantId, or category) must be provided.' });
    }

    try {
        // Build the search query dynamically
        const query = {
            availability: AVAILABILITY.AVAILABLE // Include only items that are available
        };

        if (name) {
            if (typeof name !== 'string') {
                return res.status(400).json({ message: 'Invalid item name format.' });
            }
            query.itemName = { $regex: name, $options: 'i' }; // Case-insensitive search for names containing the input
        }

        if (restaurantId) {
            if (!ObjectId.isValid(restaurantId)) {
                return res.status(400).json({ message: 'Invalid restaurant ID.' });
            }
            query.restaurantId = new ObjectId(restaurantId); // Add restaurantId to the query if provided
        }

        if (category) {
            if (typeof category !== 'string' || ![CATEGORY.VEG, CATEGORY.NON_VEG].includes(category.toLowerCase())) {
                return res.status(400).json({ message: 'Invalid category. Allowed values are "veg" or "non-veg".' });
            }
            query.category = category.toLowerCase(); // Add category filter if provided
        }

        // Search for menu items based on the query
        const menuItems = await findAll(COLLECTION_MENUITEM, query);

        if (!menuItems || menuItems.length === 0) {
            return res.status(404).json({ message: 'No menu items found matching the input.' });
        }

        res.status(200).json(menuItems); // Return the matching menu items
    } catch (error) {
        console.error('Error searching menu items:', error);
        res.status(500).json({ message: error.message });
    }
});



// Update a menu item by ID
router.put('/:itemId', verifyAuth, restaurantOwner, async (req, res) => {
    const { itemId } = req.params;

    if(!menuitemvalidation.validateMenuItemUpdate(req.body,res)){
        return
    }
  
    try {
        const updatedMenuItem = await updateOne(COLLECTION_MENUITEM, { _id: new ObjectId(itemId) }, { $set: req.body });
        if (!updatedMenuItem.matchedCount) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }

        res.json({message:'Menu item Updated'}); // Return the updated menu item
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a menu item by ID
router.delete('/:itemId', verifyAuth, restaurantOwner, async (req, res) => {
    const { itemId } = req.params;
    if (!menuitemvalidation.validateMenuItemId({ itemId },res)) {
        return ;
    }

    try {
        const deleted = await deleteOne(COLLECTION_MENUITEM, { _id: new ObjectId(itemId) });
        if (!deleted.deletedCount) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }

        res.status(200).json({ message: 'Menu item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
