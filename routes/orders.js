const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { verifyAuth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { appuser } = require('../middleware/user');
const ordervalidation = require('../validate/ordervalidation');
const { insertOne, findOne, findOneById, findManyByIds, findAll, updateOne,getNextSequence } = require('../models/dbmodules');
const { ORDER_STATUSES,COLLECTION_ORDER ,COLLECTION_DELIVERY,COLLECTION_MENUITEM} = require('../collectionConstant');

// Place an order
router.post('/', verifyAuth, appuser, async (req, res) => {
    if (!ordervalidation.validateOrder(req.body, res)) {
        return;
    }

    const { items, deliveryAddress } = req.body;
    const createdAt = new Date();

    try {
        // Check for duplicate item IDs in the input
        const itemIds = items.map(item => item.itemId);
        const uniqueItemIds = new Set(itemIds);
        if (uniqueItemIds.size !== itemIds.length) {
            return res.status(400).json({ message: "Duplicate item IDs are not allowed in a single order." });
        }

        // Convert item IDs to ObjectId
        const objectIdItemIds = Array.from(uniqueItemIds).map(id => new ObjectId(id));

        // Fetch menu items by IDs directly using db module function
        const menuItems = await findManyByIds(COLLECTION_MENUITEM, objectIdItemIds);

        if (!menuItems || menuItems.length === 0) {
            return res.status(400).json({ message: "No menu items found." });
        }

        const menuItemMap = {};
        menuItems.forEach(menuItem => {
            menuItemMap[menuItem._id.toString()] = menuItem;
        });

        let totalPrice = 0;
        const itemsWithDetails = [];

        // Calculate total price and add item details
        for (const item of items) {
            const menuItem = menuItemMap[item.itemId];
            if (!menuItem) {
                throw new Error(`Menu item with ID ${item.itemId} not found.`);
            }
            totalPrice += menuItem.price * item.quantity;
            itemsWithDetails.push({
                itemId: new ObjectId(item.itemId), // Ensure itemId is stored as ObjectId
                quantity: item.quantity,
            });
        }

        // Get next order number
        const orderNumber = await getNextSequence('order_number');

        // Prepare order object
        const orderToInsert = {
            userId: new ObjectId(req.user.id), // Convert userId to ObjectId
            items: itemsWithDetails,
            totalAmount: totalPrice,
            deliveryAddress,
            createdAt,
            status: ORDER_STATUSES.NOT_DELIVERED,
            orderNumber: String(orderNumber).padStart(3, '0'), // Format order number to be 3 digits
        };

        // Insert order into database
        const result = await insertOne('orders', orderToInsert);

        // Return order details
        res.status(200).json({
            message: "Your order has been placed successfully.",
            order: {
                id: result.insertedId,
                orderNumber: orderToInsert.orderNumber,
                items: orderToInsert.items,
                totalAmount: orderToInsert.totalAmount,
                deliveryAddress: orderToInsert.deliveryAddress,
                createdAt: orderToInsert.createdAt,
                status: orderToInsert.status,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});



// Get an order by ID
router.get('/:orderId', async (req, res) => {
    if (!ordervalidation.validateOrderId(req.params,res)) {
        return;
    }

    try {
        const order = await findOne(COLLECTION_ORDER, { _id: new ObjectId(req.params.orderId) });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all orders (admin only)
router.get('/', verifyAuth, isAdmin, async (req, res) => {
    try {
        const orders = await findAll(COLLECTION_ORDER);
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found.' });
        }
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Cancel an order by ID
router.patch('/cancel/:orderId', verifyAuth, async (req, res) => {
    const { orderId } = req.params;
    if (!ordervalidation.validateOrderId({ orderId }, res)) {
        return;
    }

    try {
        // Find the order by ID
        const order = await findOneById(COLLECTION_ORDER, orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }
         // Check if the order is already canceled
         if (order.status === ORDER_STATUSES.CANCELED) {
            return res.status(400).json({ message: "Order is already canceled." });
        }

        // Ensure the order is not already delivered
        if (order.status === ORDER_STATUSES.DELIVERED) {
            return res.status(400).json({ message: "Delivered orders cannot be canceled." });
        }

        // Check if the logged-in user is the one who placed the order
        if (order.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to cancel this order." });
        }

        // Update the order status to "CANCELED"
        const result = await updateOne(
            COLLECTION_ORDER,
            { _id: new ObjectId(orderId) },
            { $set: { status: ORDER_STATUSES.CANCELED } }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to cancel the order." });
        }

        // Find and update the corresponding delivery record, if it exists
        const deliveryUpdateResult = await updateOne(
            COLLECTION_DELIVERY,
            { orderId: new ObjectId(orderId) },
            { $set: { status: ORDER_STATUSES.CANCELED } }
        );

        if (deliveryUpdateResult.modifiedCount > 0) {
            console.log(`Delivery status for order ${orderId} updated to CANCELED.`);
        }

        res.status(200).json({ message: "Order canceled successfully." });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ message: "An error occurred while canceling the order." });
    }
});


// Get total revenue for a date range
router.get('/revenue', verifyAuth, isAdmin, async (req, res) => {
    if (!ordervalidation.validateDateRange(req.body,res)) {
        return;
    }
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const orders = await findAll(COLLECTION_ORDER, { createdAt: { $gte: start, $lte: end } });

        const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        res.status(200).json({ totalRevenue });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get most ordered items for a date range
router.get('/most-ordered', verifyAuth, isAdmin, async (req, res) => {
    if (!ordervalidation.validateDateRange(req.body,res)) {
        return;
    }
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required.' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const orders = await findAll(COLLECTION_ORDER, { createdAt: { $gte: start, $lte: end } });

        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const mostOrderedItems = Object.keys(itemCounts).map(name => ({
            name,
            totalOrdered: itemCounts[name]
        }));

        mostOrderedItems.sort((a, b) => b.totalOrdered - a.totalOrdered);

        res.status(200).json(mostOrderedItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
