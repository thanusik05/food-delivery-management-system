const {ROLES}= require('../collectionConstant')
const restaurantOwner = (req, res, next) => {
    // Check if user is authenticated and has the role of 'RestaurantOwner'
    if (!req.user || req.user.role !== ROLES.RESTAURANT_OWNER) {
        return res.status(403).json({ message: 'Access denied. Restaurant owners only.' });
    }
    next(); // Proceed to the next middleware or route handler
};

module.exports = { restaurantOwner };
