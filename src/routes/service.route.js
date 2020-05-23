const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyPartner } = require('../middlewares/partner.middleware');

generateAccountNumber = (length) => {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

module.exports = (app) => {
    app.use('/services', router);

    router.get('/account_number/:account_number', verifyPartner, async (req, res) => {
        const user = await User.findOne({ account_number: req.params.account_number });

        if (!user) {
            return res.status(404).json({ message: 'not found' });
        }

        const userModified = user.toObject();
        ['balance', 'saving', 'role', 'createdAt', 'updatedAt'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });

    router.post('/deposits/account_number/:account_number', async (req, res) => {
        User.findOne({ account_number: req.params.account_number }, async (err, doc) => {
            if (!doc) {
                res.status(500).json({ message: 'Not found this account number.' });
                return;
            }

            doc.balance += req.body.amount;
            await doc.save();

            res.status(200).json({ message: 'Deposits successful.' });
        });
    });
};