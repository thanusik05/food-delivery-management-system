const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const {COLLECTION_SETTINGS}=require('../collectionConstant')

// Insert a document into any collection
const insertOne = async (collectionName, document) => {
    const db = getDB();
    return await db.collection(collectionName).insertOne(document);
};

// Find a single document in any collection based on a query
const findOne = async (collectionName, query) => {
    const db = getDB();
    return await db.collection(collectionName).findOne(query);
};

// Update a single document in any collection based on query and update fields
const updateOne = async (collectionName, query, update) => {
    const db = getDB();
    return await db.collection(collectionName).updateOne(query, update);
};

// Delete a single document from any collection
const deleteOne = async (collectionName, query) => {
    const db = getDB();
    return await db.collection(collectionName).deleteOne(query);
};

// Find multiple documents in any collection based on an array of IDs
const findManyByIds = async (collectionName, itemIds) => {
    const db = getDB();
    return await db.collection(collectionName).find({ _id: { $in: itemIds } }).toArray();
};

const findOneById = async (collectionName, id) => {
    const db = getDB();
    try {
        const objectId = new ObjectId(id); // Convert the string ID to an ObjectId
        const document = await db.collection(collectionName).findOne({ _id: objectId });// Query the database for the document

        return document;
    } catch (error) {
        console.error(`Error in findOneById for collection ${collectionName}:`, error);
        throw new Error('Failed to fetch document by ID.');
    }
};
// Find all documents in any collection based on a query
const findAll = async (collectionName, query = {}) => {
    const db = getDB();
    return await db.collection(collectionName).find(query).toArray();
};

// Check if a document exists in any collection based on a query
const exists = async (collectionName, query) => {
    const db = getDB();
    const existingItem = await db.collection(collectionName).findOne(query);
    return existingItem !== null; // Return true if exists, else false
};
// Perform aggregation operation on a given collection
const aggregate = async (collectionName, pipeline) => {
    const db = getDB();
    return await db.collection(collectionName).aggregate(pipeline).toArray();
};
const getNextSequence = async (sequenceName) => {
    try {
        // Increment the sequence value or initialize it if not present
        const result = await updateOne(
            COLLECTION_SETTINGS, // Collection name
            { _id: sequenceName }, // Query to find the sequence document
            { $inc: { sequence: 1 } } // Increment the sequence by 1
        );

        // Check if the document was modified
        if (result.matchedCount === 0) {
            // If no document matched, create a new one with sequence initialized to 1
            await updateOne(
                COLLECTION_SETTINGS,
                { _id: sequenceName },
                { $set: { sequence: 1 } }
            );
            return 1; // Return the initial sequence value
        }

        // Fetch the updated sequence value
        const updatedDoc = await findOne(COLLECTION_SETTINGS, { _id: sequenceName });
        if (!updatedDoc || typeof updatedDoc.sequence !== 'number') {
            throw new Error('Sequence value is not properly initialized.');
        }

        return updatedDoc.sequence;
    } catch (error) {
        console.error('Error fetching sequence:', error);
        throw error;
    }
};





module.exports = {
    insertOne,
    findOne,
    updateOne,
    deleteOne,
    findManyByIds,
    findAll,
    exists,
    aggregate,
    findOneById,
    getNextSequence
};