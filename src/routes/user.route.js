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

    router.get('/:account_number', verifyPartner, async (req, res) => {
        const user = await User.findOne({ account_number: req.params.account_number });
        if (!user){
            return res.status(404).json({message: 'not found'});
        }
        const userModified = user.toObject();
        ['balance', 'saving', 'role', 'createdAt', 'updatedAt'].forEach(e => delete userModified[e]);
        return res.status(200).json(userModified);
    });

    router.post('/', verifyPartner, async (req, res) => {
        const ac = generateAccountNumber(13);
        const user = new User({ ...req.body, account_number: ac });
        await user.save();
        return res.status(201).json(user);
    });
};