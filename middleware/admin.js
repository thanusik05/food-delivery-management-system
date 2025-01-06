// Middleware to check if the user has admin role
const {ROLES}= require('../collectionConstant');
const isAdmin = (req, res, next) => {
    // Check if user is authenticated and has the role of Admin
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        return res.status(403).send('Access denied. Admins only.');
    }
    next(); // Proceed to the next middleware or route handler
};

const isUser = (req,res,next)=>{
    if (!req.user || req.user.role !== ROLES.USER) {
        return res.status(403).send('Access denied. user only.');
    }
    next();
}

const isDeliveryAgent = (req,res,next)=>{
    if (!req.user || req.user.role !== ROLES.DELIVERY_AGENT) {
        return res.status(403).send('Access denied. delivery agents only.');
    }
    next();
}

const restaurantOwner = (req, res, next) => {
    // Check if user is authenticated and has the role of 'RestaurantOwner'
    if (!req.user || req.user.role !== ROLES.RESTAURANT_OWNER) {
        return res.status(403).json({ message: 'Access denied. Restaurant owners only.' });
    }
    next(); // Proceed to the next middleware or route handler
};


module.exports = {isAdmin,isDeliveryAgent,isUser,restaurantOwner}