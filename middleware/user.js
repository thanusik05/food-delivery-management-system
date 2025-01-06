const appuser = (req, res, next) => {
    // Check if user is authenticated and has the role of 'RestaurantOwner'
    if (!req.user || req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Restaurant users only.' });
    }
    next(); // Proceed to the next middleware or route handler
};

module.exports = { appuser };