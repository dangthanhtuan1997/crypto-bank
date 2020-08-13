const express = require('express');
const router = express.Router();
const config = require('../config');
const moment = require('moment');

const Transaction = require('../model/transaction.model');
const { verifyAdmin } = require('../middlewares/auth.middleware');
const Admin = require('../model/admin.model');

module.exports = (app) => {
    app.use('/admins', router);

    router.get('/me', verifyAdmin, async (req, res) => {
        const user = await Admin.findById(req.tokenPayload.userId);

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        const userModified = user.toObject();
        ['password'].forEach(e => delete userModified[e]);

        return res.status(200).json(userModified);
    });
};