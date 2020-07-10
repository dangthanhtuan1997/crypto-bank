const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const Transaction = require('../model/transaction.model');
const { verifyPartner, verifyPartnerWithSignature } = require('../middlewares/partner.middleware');

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
        ['balance', 'saving', 'transactions', 'role', 'createdAt', 'updatedAt', 'username', 'password'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });

    router.post('/deposits/account_number/:account_number', verifyPartnerWithSignature, async (req, res) => {
        const { depositor, receiver, amount, partner_code, note, signature } = req.body;

        if (!depositor || !receiver || !amount || !partner_code || !signature) {
            return res.status(400).json({ message: 'Not enough parameter.' });
        }

        const user = await User.findOne({ account_number: req.params.account_number });

        if (!user) {
            res.status(500).json({ message: err || 'Not found target account.' });
            return;
        }

        const transaction = new Transaction({ ...req.body, type: "transfer", status: 'confirmed', scope: 'external' });
        await transaction.save();

        user.transactions.push(transaction._id);
        user.balance = parseInt(user.balance) + parseInt(amount);

        await user.save();

        res.status(200).json({ message: 'Deposit successful.' });
    });
};