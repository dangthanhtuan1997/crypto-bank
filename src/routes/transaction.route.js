const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const Transaction = require('../model/transaction.model');

const { verifyUser } = require('../middlewares/auth.middleware');

module.exports = (app) => {
    app.use('/transactions', router);

    router.post('/', verifyUser, async (req, res) => {
        const depositor = await User.findById(req.tokenPayload.userId);
        const receiver = await User.findOne({ account_number: req.body.receiver.account_number });

        if (!depositor) {
            return res.status(400).json({ message: 'You are not depositor.' });
        }

        if (!receiver) {
            return res.status(400).json({ message: 'Receiver are not exist.' });
        }

        if (depositor.balance - req.body.amount < 0) {
            return res.status(400).json({ message: 'Not enough money to send.' });
        }

        const transaction = new Transaction({
            ...req.body,
            depositor: {
                full_name: depositor.full_name,
                account_number: depositor.account_number
            },
            type: "internal"
        });

        await transaction.save();
        await receiver.save();

        depositor.transactions.push(transaction._id);
        depositor.balance -= +req.body.amount;

        receiver.transactions.push(transaction._id);
        receiver.balance += +req.body.amount;

        await depositor.save();
        await receiver.save();

        return res.status(200).json({ depositor, transaction });
    });

    router.get('/me', verifyUser, async (req, res) => {
        const user = await User.findById(req.tokenPayload.userId);

        const records = await Transaction.find().where('_id').in(user.transactions).exec();

        return res.status(200).json(records);
    });
};