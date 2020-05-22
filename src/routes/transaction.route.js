const express = require('express');
const router = express.Router();
const Transaction = require('../model/transaction.model');
const { verifyUser } = require('../middlewares/auth.middleware');

module.exports = (app) => {
    app.use('/deposits', router);

    router.post('/', async (req, res) => {
        const ac = generateAccountNumber(13);
        const user = new User({ ...req.body, account_number: ac });
        await user.save();
        return res.status(201).json(user);
    });
};