const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB
const { insertOne, findOne, updateOne } = require('../models/dbmodules');
const { isAdmin, isDeliveryAgent } = require('../middleware/admin');
const { verifyAuth } = require('../middleware/auth');
const deliveryvalidation = require('../validate/deliveryvalidation');
const { ORDER_STATUSES, COLLECTION_DELIVERY, COLLECTION_ORDER } = require('../collectionConstant');

// Route to assign a delivery agent
router.post('/', verifyAuth, isAdmin, async (req, res) => {
    // Validate the input directly and send response if invalid
    if (!deliveryvalidation.validateDeliveryAssignment(req.body, res)) {
        return; // Exit early if validation fails
    }

    let { orderId, deliveryPersonId, ...deliveryData } = req.body;

    try {
        // Convert orderId and deliveryPersonId to ObjectId
        orderId = new ObjectId(orderId); // Convert the string to ObjectId
        deliveryPersonId = new ObjectId(deliveryPersonId); // Convert the string to ObjectId

        // Check if the order has already been assigned in the deliveries collection
        const existingDelivery = await findOne(COLLECTION_DELIVERY, { orderId });
        if (existingDelivery) {
            return res.status(400).json({ message: 'This order has already been assigned to a delivery agent.' });
        }

        // Check if the order has been processed in the orders collection
        const existingOrder = await findOne(COLLECTION_ORDER, { _id: orderId });
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (existingOrder.status === ORDER_STATUSES.DELIVERYAGENT_ASSIGNED) {
            return res.status(400).json({ message: 'This order already has a delivery agent assigned.' });
        }

        // Add the converted ObjectId and other required fields to the delivery data
        deliveryData = {
            ...deliveryData,
            orderId,
            deliveryPersonId,
            createdAt: new Date(),
            status: ORDER_STATUSES.DELIVERYAGENT_ASSIGNED,
            AssignedBy: new ObjectId(req.user.id),
        };

        // Insert the new delivery assignment
        const delivery = await insertOne(COLLECTION_DELIVERY, deliveryData);

        // Update the order status in the orders collection
        await updateOne(
            COLLECTION_ORDER,
            { _id: orderId },
            { $set: { status: ORDER_STATUSES.DELIVERYAGENT_ASSIGNED } }
        );

        res.status(200).json({ message: 'Delivery agent assigned successfully.' });
    } catch (error) {
        console.error('Error assigning delivery agent:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route to get delivery details by ID
router.get('/:deliveryId', verifyAuth, isAdmin, async (req, res) => {
    const { deliveryId } = req.params;
    if (!deliveryvalidation.validateDeliveryId({ deliveryId }, res)) {
        return; // Exit early if validation fails
    }

    try {
        // Fetch delivery details, convert string to ObjectId for querying
        const deliveryDetails = await findOne(COLLECTION_DELIVERY, { _id: new ObjectId(deliveryId) });
        if (!deliveryDetails) {
            return res.status(404).json({ message: 'Delivery not found.' });
        }

        res.json(deliveryDetails);
    } catch (error) {
        console.error('Error fetching delivery details:', error);
        res.status(500).json({ message: error.message });
    }
});


// Route to update order status
router.put('/:orderId/status', verifyAuth, isDeliveryAgent, async (req, res) => {
    const { orderId } = req.params;
    if(!deliveryvalidation.validateOrderStatusUpdate(req.body,res)){
        return;
    }
    try {
        const newStatus = req.body.status;

        // Convert orderId to ObjectId for querying
        const delivery = await findOne(COLLECTION_DELIVERY, { orderId: new ObjectId(orderId) });
        if (!delivery) {
            throw new Error('Delivery record not found.');
        }

        // Check if the authenticated delivery agent matches the assigned agent
        if (delivery.deliveryPersonId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You are not assigned to this order.' });
        }

        // Find the order to ensure it exists
        const order = await findOne(COLLECTION_ORDER, { _id: new ObjectId(orderId) });
        if (!order) {
            throw new Error('Order not found.');
        }

        // Check if the order is already canceled
        if (order.status === ORDER_STATUSES.CANCELED) {
            return res.status(400).json({ message: 'Order is already canceled. No changes made.' });
        }

        
        let updateFields = { status: newStatus };
            updateFields.updatedAt = new Date();  // Set deliveredAt to current date
        

        // Update the order's status
        const orderUpdateResult = await updateOne(COLLECTION_ORDER, { _id: new ObjectId(orderId) }, { $set: updateFields });
        if (orderUpdateResult.modifiedCount === 0) {
            throw new Error('Failed to update order status in orders collection.');
        }

        // Update the delivery's status
        const deliveryUpdateResult = await updateOne(COLLECTION_DELIVERY, { orderId: new ObjectId(orderId) }, { $set: { status: newStatus } });
        if (deliveryUpdateResult.modifiedCount === 0) {
            throw new Error('Failed to update order status in deliveries collection.');
        }

        res.status(200).json({ message: 'Order status updated successfully in both collections.' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(400).json({ message: error.message });
    }
});


module.exports = router;
