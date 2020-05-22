const express = require('express');
const router = express.Router();

const auth = require('./auth.route');
const user = require('./user.route');
const transaction = require('./transaction.route');

module.exports = () => {
    //auth(router);
    user(router);
    transaction(router);
    
    return router;
}