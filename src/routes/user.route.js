const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');
const moment = require('moment');
const CryptoJS = require("crypto-js");
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const User = require('../model/user.model');
const OTP = require('../model/otp.model');
const { verifyUser } = require('../middlewares/auth.middleware');

const partnerCode = 'CryptoBank';
const secretKey = config.HASH_SECRET;

function generateOTP(length) {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

function sendEmail(user, OTP) {
    var transporter = nodemailer.createTransport({
        address: 'smtp.gmail.com',
        service: 'gmail',
        port: 465,
        secure: true,
        tls: { rejectUnauthorized: false },
        auth: { user: 'yt.dangthanhtuan@gmail.com', pass: config.EMAIL_PASS }
    });

    var mailOptions = {
        from: 'yt.dangthanhtuan@gmail.com',
        to: user.email,
        subject: 'Reset Password Verification OTP',
        text: `Chào ${user.full_name},\nBạn vừa thực hiện yêu cầu quên mật khẩu cho tài khoản ${user.username} số tài khoản ${user.account_number} \n\nMã OTP để xác thực là: ${OTP}`
    };

    transporter.sendMail(mailOptions, function (err) {
        if (err) {
            throw new Error('Can not send OTP.');
        }
    });
}

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

    router.patch('/password', verifyUser, async (req, res) => {
        let { oldPassword, newPassword } = req.body;

        const user = await User.findById(req.tokenPayload.userId);

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (isMatch) {
            const hash = await bcrypt.hash(newPassword, config.saltRounds);

            user.password = hash;

            await user.save();

            res.status(200).json({ message: 'Successful' });
        }
        else {
            res.status(401).json({ message: 'Invalid old password' });
        }
    });

    router.get('/forgot/otp', async (req, res) => {
        let { username } = req.query;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'Not found user' });
        }

        const otp = new OTP({
            user_id: user._id,
            otp: generateOTP(2)
        });

        sendEmail(user, otp.otp);

        await otp.save();

        return res.status(200).json({ message: 'Successful', otp: otp.otp });
    })

    router.patch('/forgot', async (req, res) => {
        let { username, password, otp } = req.body;

        const user = await User.findOne({ username });
        const _otp = await OTP.findOne({ otp });

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        if (!_otp) {
            return res.status(400).json({ message: 'Invalid otp' });
        }

        const hash = await bcrypt.hash(password, config.saltRounds);

        user.password = hash;

        await user.save();

        res.status(200).json({ message: 'Successful' });
    });

    router.patch('/friends', verifyUser, async (req, res) => {
        const { friends } = req.body;

        const user = await User.findById(req.tokenPayload.userId);

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        user.friends = friends;
        await user.save();

        res.status(200).json({ message: 'Successful' });
    });

    router.get('/:account_number', verifyUser, async (req, res) => {
        const { scope, partner } = req.query;
        const { account_number } = req.params;
        
        if (scope === 'internal') {
            const user = await User.findOne({ account_number: account_number });

            if (!user) {
                return res.status(404).json({ message: 'Not found' });
            }

            const userModified = user.toObject();
            ['balance', 'saving', 'transactions', 'role', 'createdAt', 'updatedAt', 'username', 'password', 'phone', 'email', 'notify'].forEach(e => delete userModified[e]);

            return res.status(200).json(userModified);
        }
        else {
            switch (partner) {
                case 'NKLBank': {
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
                case 'TeaBank': {
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