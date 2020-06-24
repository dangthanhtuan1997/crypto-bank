const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyUser } = require('../middlewares/auth.middleware');
const axios = require('axios');
const config = require('../config');
const moment = require('moment');
const CryptoJS = require("crypto-js");

const partner_code = 'CryptoBank';
const secret_key = config.HASH_SECRET;

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
        const { type } = req.query;
        const {account_number} = req.params;
        if (type === 'internal') {
            const user = await User.findOne({ account_number: account_number });

            if (!user) {
                return res.status(404).json({ message: 'Not found' });
            }

            const userModified = user.toObject();
            ['balance', 'saving', 'transactions', 'role', 'createdAt', 'updatedAt', 'username', 'password'].forEach(e => delete userModified[e]);

            return res.status(200).json(userModified);
        }
        else {
            const timestamp = moment().toString();
            const data = { transaction_type: '?', target_account: account_number };
            const hash = CryptoJS.AES.encrypt(JSON.stringify({ data, timestamp, secret_key }), secret_key).toString();

            const _headers = {
                partner_code: partner_code,
                timestamp: timestamp,
                api_signature: hash,
            };

            const signed_data = null;

            try {
                const resp = await axios.post("https://nklbank.herokuapp.com/api/partnerbank/request",
                    { data, signed_data },
                    { headers: _headers }
                );

                return res.status(200).json({ full_name: resp.data.fullname });
            } catch (error) {
                console.log(error)
                return res.status(500).json({ message: 'Error in partner bank.' })
            }
        }
    });
};