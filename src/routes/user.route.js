const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyUser } = require('../middlewares/auth.middleware');

module.exports = (app) => {
    app.use('/users', router);

    router.get('/:username', verifyUser, async (req, res) => {
        const user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ message: 'not found' });
        }

        const userModified = user.toObject();
        ['password'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });
};