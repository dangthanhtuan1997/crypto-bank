const express = require('express');
const router = express.Router();

const auth = require('./auth.route');
const user = require('./user.route');
const teller = require('./teller.route');
const service = require('./service.route');
const transaction = require('./transaction.route');

module.exports = () => {
    auth(router);
    user(router);
    teller(router);
    service(router);
    transaction(router);
    
    return router;
}