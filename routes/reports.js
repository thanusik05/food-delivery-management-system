const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const { isAdmin, restaurantOwner } = require('../middleware/admin');
const ordervalidation = require('../validate/ordervalidation');
const { findAll, aggregate ,findOne} = require('../models/dbmodules'); // Import necessary db functions
const {COLLECTION_ORDER,COLLECTION_MENUITEM,COLLECTION_RESTAURANT,ORDER_STATUSES}=require('../collectionConstant');
const { ObjectId } = require('mongodb');

// Generate report for orders within a specified date range
router.post('/orders', verifyAuth, isAdmin, async (req, res) => {
    
    if (!ordervalidation.validateDateRange(req.body,res)) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { startDate, endDate } = req.body; // Get startDate and endDate from request body

    try {
        const orders = await findAll(COLLECTION_ORDER, {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }); // Fetch orders within the date range

        res.json({ report: orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get total revenue for a date range
router.post('/', verifyAuth, isAdmin, async (req, res) => {

    if (!ordervalidation.validateDateRange(req.body,res)) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { startDate, endDate } = req.body; // Extract startDate and endDate from request body

    try {
        const result = await aggregate(COLLECTION_ORDER, [
            {
                $match: {
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $unwind: "$items" // Unwind the items array to process individual items
            },
            {
                $lookup: {
                    from: COLLECTION_MENUITEM, // Join with the menuitems collection
                    localField: "items.name", // Match item name from the orders
                    foreignField: "itemName", // Match item name in the menuitems
                    as: "itemDetails" // Output array field
                }
            },
            {
                $unwind: "$itemDetails" // Unwind the joined menuitems array
            },
            {
                $group: {
                    _id: "$itemDetails.restaurantId", // Group by restaurantId
                    totalRevenue: { $sum: "$totalAmount" } // Sum the totalAmount for each restaurant
                }
            },
            {
                $lookup: {
                    from: COLLECTION_RESTAURANT, // Optionally join with restaurants collection for more details
                    localField: "_id", // Match restaurantId
                    foreignField: "_id", // Match _id in restaurants
                    as: "restaurantDetails" // Output restaurant details
                }
            },
            {
                $project: {
                    _id: 0,
                    restaurantId: "$_id",
                    totalRevenue: 1,
                    restaurantDetails: { $arrayElemAt: ["$restaurantDetails", 0] } // Include restaurant details
                }
            }
        ]);

        res.status(200).json(result); // Return total revenue for each restaurant
    } catch (error) {
        console.error('Error fetching total revenue by restaurant:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get most ordered items for a date range
router.post('/most-ordered', verifyAuth, async (req, res) => {
    
    if (!ordervalidation.validateDateRange(req.body,res)) {
        return ;
    }

    const { startDate, endDate } = req.body; // Extract startDate and endDate from request body

    try {
        const result = await aggregate(COLLECTION_ORDER, [
            {
                $match: {
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $unwind: "$items" // Unwind the items array to aggregate by individual items
            },
            {
                $lookup: {
                    from: COLLECTION_MENUITEM, // Join with menuitems collection
                    localField: "items.name", // Field in the order document
                    foreignField: "itemName", // Field in the menuitems document
                    as: "itemDetails" // Output field
                }
            },
            {
                $unwind: "$itemDetails" // Unwind the joined menu item details
            },
            {
                $group: {
                    _id: {
                        restaurantId: "$itemDetails.restaurantId", // Group by restaurantId
                        itemName: "$items.name" // Group by item name
                    },
                    totalOrdered: { $sum: "$items.quantity" } // Sum the quantities ordered
                }
            },
            {
                $sort: { "_id.restaurantId": 1, totalOrdered: -1 } // Sort by restaurantId and totalOrdered
            },
            {
                $group: {
                    _id: "$_id.restaurantId", // Group by restaurantId
                    mostOrderedItems: { $push: { name: "$_id.itemName", totalOrdered: "$totalOrdered" } }
                }
            },
            {
                $project: {
                    _id: 0,
                    restaurantId: "$_id", // Include restaurantId
                    mostOrderedItems: 1 // Include most ordered items for each restaurant
                }
            }
        ]);

        res.status(200).json(result); // Return the most ordered items for each restaurant
    } catch (error) {
        console.error('Error fetching most ordered items:', error);
        res.status(500).json({ message: error.message });
    }
});


router.post('/monthly-revenue', verifyAuth, restaurantOwner, async (req, res) => {
    const { startDate, endDate } = req.body;

    // Validate the input data using the validateDateRange method
    if (!ordervalidation.validateDateRange({ startDate, endDate }, res)) {
        return; // Exit early if validation fails
    }

    try {
        // Fetch the restaurant details of the authenticated user
        const restaurant = await findOne(COLLECTION_RESTAURANT, { restaurantOwnerId: new ObjectId(req.user.id) });

        if (!restaurant) {
            return res.status(403).json({ message: 'You are not authorized to access this data.' });
        }

        // Fetch all menu items owned by the authenticated restaurant owner
        const menuItems = await findAll(COLLECTION_MENUITEM, { restaurantId: new ObjectId(restaurant._id) });

        if (!menuItems || menuItems.length === 0) {
            return res.status(404).json({ message: 'No menu items found for this restaurant owner.' });
        }

        // Extract all the menu item IDs
        const menuItemIds = menuItems.map((item) => item._id.toString());

        // Fetch all completed orders containing these menu items within the date range
        const orders = await findAll(COLLECTION_ORDER, {
            'items.itemId': { $in: menuItemIds },
            status: ORDER_STATUSES.DELIVERED,
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No revenue data available for the specified date range.' });
        }

        // Group orders by month and calculate revenue
        const monthlyRevenue = {};
        orders.forEach((order) => {
            const month = new Date(order.createdAt).toISOString().slice(0, 7); // e.g., "2025-01"
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.totalAmount;
        });

        // Format the response
        const revenueReport = Object.entries(monthlyRevenue).map(([month, totalRevenue]) => ({
            month,
            totalRevenue,
        }));

        res.status(200).json({
            message: 'Monthly revenue report generated successfully.',
            startDate,
            endDate,
            revenueReport,
        });
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});




module.exports = router;
