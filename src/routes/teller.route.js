const express = require('express');
const router = express.Router();
const User = require('../model/user.model');
const { verifyUser } = require('../middlewares/auth.middleware');
const axios = require('axios');
const config = require('../config');
const moment = require('moment');
const CryptoJS = require("crypto-js");

const partnerCode = 'CryptoBank';
const secretKey = config.HASH_SECRET;

module.exports = (app) => {
    app.use('/tellers', router);

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
        const { type, partner } = req.query;
        const { account_number } = req.params;
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
            switch (partner) {
                case 'nklbank': {
                    const timestamp = moment().toString();
                    const data = { transaction_type: '?', target_account: account_number };
                    const hash = CryptoJS.AES.encrypt(JSON.stringify({ data, timestamp, secretKey }), secretKey).toString();

                    const _headers = {
                        partner_code: partnerCode,
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
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }
                case 'teabank': {
                    const requestTime = moment().format('X');
                    const hash = CryptoJS.SHA512(requestTime + secretKey).toString();

                    const headers = {
                        'Content-Type': 'application/json',
                        'X-API-KEY': partnerCode,
                        'X-REQUEST-TIME': requestTime,
                        'X-HASH': hash
                    }
                    try {
                        const resp = await axios.get(`https://w-internet-banking.herokuapp.com/api/partner/accounts/${account_number}`, {
                            headers: headers
                        });

                        return res.status(200).json({ full_name: resp.data.result.name });
                    } catch (error) {
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }

                default:
            }
        }
    });
};