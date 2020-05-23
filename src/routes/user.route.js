const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyPartner } = require('../middlewares/partner.middleware');

generateAccountNumber = (length) => {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

module.exports = (app) => {
    app.use('/users', router);

    router.post('/', async (req, res) => {
        const account_number = generateAccountNumber(13);
        const user = new User({ ...req.body, account_number });
        await user.save();
        return res.status(201).json(user);
    });
};