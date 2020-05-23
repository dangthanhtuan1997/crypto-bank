const express = require('express');
const router = express.Router();

const auth = require('./auth.route');
const partner = require('./partner.route');
const transaction = require('./transaction.route');

module.exports = () => {
    //auth(router);
    partner(router);
    transaction(router);
    
    return router;
}