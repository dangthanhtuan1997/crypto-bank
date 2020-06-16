const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyUser } = require('../middlewares/auth.middleware');

module.exports = (app) => {
    app.use('/users', router);

    router.get('/me', verifyUser, async (req, res) => {
        const user = await User.findById(req.tokenPayload.userId);

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        const userModified = user.toObject();
        ['password'].forEach(e => delete userModified[e]);


        return res.status(200).json(userModified);
    });

    router.get('/:account_number', verifyUser, async (req, res) => {
        const user = await User.findOne({ account_number: req.params.account_number });

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        const userModified = user.toObject();
        ['balance', 'saving', 'transactions', 'role', 'createdAt', 'updatedAt', 'username', 'password'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });
};