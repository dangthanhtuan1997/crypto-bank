const express = require('express');
const router = express.Router();

const auth = require('./auth.route');
const user = require('./user.route');
const teller = require('./teller.route');
const service = require('./service.route');
const transaction = require('./transaction.route');
const admin = require('./admin.route');

module.exports = (io) => {
    auth(router);
    user(router);
    teller(router);
    service(router);
    transaction(router, io);
    admin(router);
    
    return router;
}