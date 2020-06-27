const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require("crypto-js");
const crypto = require('crypto');
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('../config');
const User = require('../model/user.model');
const Teller = require('../model/teller.model');
const Transaction = require('../model/transaction.model');
const OTP = require('../model/otp.model');

const { verifyUser, verifyTeller } = require('../middlewares/auth.middleware');

const partnerCode = 'CryptoBank';
const secretKey = config.HASH_SECRET;
const passphrase = config.PGP_SECRET;
const privateKeyArmored = JSON.parse(`"${config.PGP_PRIVATE_KEY}"`);

generateOTP = (length) => {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

sendEmail = (email, OTP) => {
    var transporter = nodemailer.createTransport({
        address: 'smtp.gmail.com',
        service: 'gmail',
        port: 465,
        secure: true,
        tls: { rejectUnauthorized: false },
        auth: { user: 'yt.dangthanhtuan@gmail.com', pass: config.EMAIL_PASS }
    });
    var mailOptions = { from: 'yt.dangthanhtuan@gmail.com', to: email, subject: 'Transaction Verification OTP', text: 'OTP: ' + OTP };
    transporter.sendMail(mailOptions, function (err) {
        if (err) {
            return res.status(500).send({ msg: err.message });
        }
        res.status(200).end();
    });
}

module.exports = (app) => {
    app.use('/transactions', router);

    router.post('/user', verifyUser, async (req, res) => {
        let { type, amount, note, receiver, partner, fee, save } = req.body;

        if (!type || type !== 'internal' && type !== 'external') {
            return res.status(400).json({ message: 'Invalid type.' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const depositor = await User.findById(req.tokenPayload.userId);

        if (!depositor) {
            return res.status(400).json({ message: 'Depositor is not exist.' });
        }

        if (depositor.balance - req.body.amount < 0) {
            return res.status(400).json({ message: 'Not enough money to send.' });
        }

        if (type === 'internal') {
            receiver = await User.findOne({ account_number: receiver.account_number });

            if (!receiver) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }

        const transaction = new Transaction({
            depositor: {
                full_name: depositor.full_name,
                account_number: depositor.account_number
            },
            receiver: {
                full_name: receiver.full_name,
                account_number: receiver.account_number
            },
            note: note,
            amount: amount,
            type: type,
            fee: fee
        });

        await transaction.save();

        const otp = new OTP({
            user_id: depositor._id,
            transaction_id: transaction._id,
            otp: generateOTP(6)
        });

        await otp.save();

        return res.status(200).json({ message: 'check OTP in your email.', otp: otp.otp });
    });

    router.post('/user/confirm', verifyUser, async (req, res) => {
        const { otp } = req.body;

        const _otp = await OTP.findOne({ user_id: req.tokenPayload.userId, otp });

        if (!_otp) {
            return res.status(401).json({ message: 'Invalid OTP or expired.' });
        }
        const transaction = await Transaction.findById(_otp.transaction_id);

        const { depositor, receiver, amount, type, note, fee, partner } = transaction;

        if (type === 'internal') {
            const rec = await User.findOne({ account_number: receiver.account_number });

            if (!rec) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }
        else {
            switch (partner) {
                case 'nklbank': {
                    const timestamp = moment().toString();
                    const data = { transaction_type: '+', source_account: depositor.account_number, target_account: receiver.account_number, amount_money: amount };
                    const hash = CryptoJS.AES.encrypt(JSON.stringify({ data, timestamp, secretKey }), secretKey).toString();

                    const _headers = {
                        partner_code: partnerCode,
                        timestamp: timestamp,
                        api_signature: hash,
                    };

                    const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
                    await privateKey.decrypt(passphrase);
                    const { data: cleartext } = await openpgp.sign({
                        message: openpgp.cleartext.fromText(JSON.stringify(data)),
                        privateKeys: [privateKey],
                    });

                    const signed_data = cleartext;

                    try {
                        await axios.post(
                            "https://nklbank.herokuapp.com/api/partnerbank/request",
                            { data, signed_data },
                            { headers: _headers }
                        );
                    } catch (error) {
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }
                    break;
                case 'teabank': {
                    const requestTime = moment().format('X');
                    const body = {
                        amount: amount,
                        name: depositor.full_name,
                        note: note
                    }

                    let sign = crypto.createSign('SHA512');
                    sign.write(requestTime + JSON.stringify(body));
                    sign.end();

                    const signature = sign.sign(JSON.parse(`"${config.RSA_PRIVATE_KEY}"`), 'base64');

                    const headers = {
                        'Content-Type': 'application/json',
                        'X-API-KEY': partnerCode,
                        'X-REQUEST-TIME': requestTime,
                        'X-SIGNATURE': signature
                    }

                    try {
                        await axios.post(`https://w-internet-banking.herokuapp.com/api/partner/deposits/${receiver.account_number}`, body, {
                            headers: headers
                        });

                    } catch (error) {
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }
                    break;
                default:
                // code block
            }
        }

        transaction.status = 'confirmed';
        await transaction.save();

        const dep = await User.findOne({ account_number: depositor.account_number });

        dep.transactions.push(transaction._id);
        dep.balance -= +amount + (fee ? config.TRANSFER_FEE : 0);
        await dep.save();

        if (type === 'internal') {
            const rec = await User.findOne({ account_number: receiver.account_number });
            rec.transactions.push(transaction._id);
            rec.balance = parseInt(receiver.balance) + parseInt(amount) - (fee ? 0 : config.TRANSFER_FEE);
            await rec.save();
        }

        return res.status(200).json({ depositor: dep, transaction });
    });

    router.post('/teller', verifyTeller, async (req, res) => {
        let { type, amount, note, receiver, partner } = req.body;

        if (!type || type !== 'internal' && type !== 'external') {
            return res.status(400).json({ message: 'Invalid type.' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const depositor = await Teller.findById(req.tokenPayload.userId);

        if (!depositor) {
            return res.status(400).json({ message: 'Depositor is not exist.' });
        }

        if (type === 'internal') {
            receiver = await User.findOne({ account_number: receiver.account_number });

            if (!receiver) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }
        else {
            switch (partner) {
                case 'nklbank': {
                    const timestamp = moment().toString();
                    const data = { transaction_type: '+', source_account: depositor.account_number, target_account: receiver.account_number, amount_money: amount };
                    const hash = CryptoJS.AES.encrypt(JSON.stringify({ data, timestamp, secretKey }), secretKey).toString();

                    const _headers = {
                        partner_code: partnerCode,
                        timestamp: timestamp,
                        api_signature: hash,
                    };

                    const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
                    await privateKey.decrypt(passphrase);
                    const { data: cleartext } = await openpgp.sign({
                        message: openpgp.cleartext.fromText(JSON.stringify(data)),
                        privateKeys: [privateKey],
                    });

                    const signed_data = cleartext;

                    try {
                        await axios.post(
                            "https://nklbank.herokuapp.com/api/partnerbank/request",
                            { data, signed_data },
                            { headers: _headers }
                        );
                    } catch (error) {
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }
                    break;
                case 'teabank': {
                    if (note === '') {
                        note = 'Chuyển tiền'
                    }

                    const requestTime = moment().format('X');
                    const body = {
                        amount: amount,
                        name: depositor.full_name,
                        note: note
                    }

                    let sign = crypto.createSign('SHA512');
                    sign.write(requestTime + JSON.stringify(body));
                    sign.end();

                    const signature = sign.sign(JSON.parse(`"${config.RSA_PRIVATE_KEY}"`), 'base64');

                    const headers = {
                        'Content-Type': 'application/json',
                        'X-API-KEY': partnerCode,
                        'X-REQUEST-TIME': requestTime,
                        'X-SIGNATURE': signature
                    }

                    try {
                        await axios.post(`https://w-internet-banking.herokuapp.com/api/partner/deposits/${receiver.account_number}`, body, {
                            headers: headers
                        });

                    } catch (error) {
                        return res.status(500).json({ message: 'Error in partner bank.' })
                    }
                }
                    break;
                default:
                // code block
            }
        }

        const transaction = new Transaction({
            depositor: {
                full_name: depositor.full_name,
                account_number: depositor.account_number
            },
            receiver: {
                full_name: receiver.full_name,
                account_number: receiver.account_number
            },
            note: note,
            amount: amount,
            type: type
        });

        await transaction.save();

        depositor.transactions.push(transaction._id);
        depositor.balance -= +amount;
        await depositor.save();

        if (type === 'internal') {
            receiver.transactions.push(transaction._id);
            receiver.balance = parseInt(receiver.balance) + parseInt(amount);
            await receiver.save();
        }

        return res.status(200).json({ depositor, transaction });
    });

    router.get('/user', verifyUser, async (req, res) => {
        const user = await User.findById(req.tokenPayload.userId);

        const records = await Transaction.find().where('_id').in(user.transactions).exec();

        return res.status(200).json(records);
    });

    router.get('/teller', verifyTeller, async (req, res) => {
        const user = await Teller.findById(req.tokenPayload.userId);

        const records = await Transaction.find().where('_id').in(user.transactions).exec();

        return res.status(200).json(records);
    });
};