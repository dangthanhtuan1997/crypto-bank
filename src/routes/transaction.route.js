const express = require('express');
const router = express.Router();
const Transaction = require('../model/transaction.model');
const { verifyUser } = require('../middlewares/auth.middleware');

module.exports = (app) => {
    app.use('/deposits', router);

    router.get('/:account_number', async (req, res) => {
        const user = await User.findOne({ account_number: req.params.account_number });
        const userModified = user.toObject();
        ['balance', 'saving', 'role', 'createdAt', 'updatedAt'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });

    router.post('/', async (req, res) => {
        const ac = generateAccountNumber(13);
        const user = new User({ ...req.body, account_number: ac });
        await user.save();
        return res.status(201).json(user);
    });
};