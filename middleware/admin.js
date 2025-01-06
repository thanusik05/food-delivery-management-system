// Middleware to check if the user has admin role
const isAdmin = (req, res, next) => {
    // Check if user is authenticated and has the role of Admin
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).send('Access denied. Admins only.');
    }
    next(); // Proceed to the next middleware or route handler
};

const isUser = (req,res,next)=>{
    if (!req.user || req.user.role !== "user") {
        return res.status(403).send('Access denied. user only.');
    }
    next();
}

const isDeliveryAgent = (req,res,next)=>{
    if (!req.user || req.user.role !== "deliveryagent") {
        return res.status(403).send('Access denied. delivery agents only.');
    }
    next();
}

const restaurantOwner = (req, res, next) => {
    // Check if user is authenticated and has the role of 'RestaurantOwner'
    if (!req.user || req.user.role !== 'restaurant owner') {
        return res.status(403).json({ message: 'Access denied. Restaurant owners only.' });
    }
    next(); // Proceed to the next middleware or route handler
};


module.exports = {isAdmin,isDeliveryAgent,isUser,restaurantOwner}