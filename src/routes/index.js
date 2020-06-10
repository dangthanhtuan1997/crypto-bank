const express = require('express');
const router = express.Router();

const auth = require('./auth.route');
const user = require('./user.route');
const service = require('./service.route');

module.exports = () => {
    auth(router);
    user(router);
    service(router);
    
    return router;
}