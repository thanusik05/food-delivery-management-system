// src/startup/routes.js

const userRoutes = require('../routes/users');
const restaurantRoutes = require('../routes/restaurants');
const orderRoutes = require('../routes/orders');
const deliveryRoutes = require('../routes/deliveries');
const reportRoutes = require('../routes/reports');
const menuitemRoutes = require('../routes/menuitems');
const reportsRoutes = require('../routes/reports');

module.exports = (app) => {
    app.use('/api/users', userRoutes);
    app.use('/api/restaurants', restaurantRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/deliveries', deliveryRoutes);
    app.use('/api/admin', reportRoutes);
    app.use('/api/menuitems',menuitemRoutes);
    app.use('/api/reports', reportsRoutes);
};
