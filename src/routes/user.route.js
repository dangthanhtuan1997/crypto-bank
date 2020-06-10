const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyPartner } = require('../middlewares/partner.middleware');

module.exports = (app) => {
    app.use('/users', router);
};