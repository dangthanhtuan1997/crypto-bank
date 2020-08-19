const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require("crypto-js");
const crypto = require('crypto');
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('../config');
const nodemailer = require('nodemailer');

const User = require('../model/user.model');
const Teller = require('../model/teller.model');
const Transaction = require('../model/transaction.model');
const OTP = require('../model/otp.model');

const { verifyUser, verifyTeller, verifyAdmin } = require('../middlewares/auth.middleware');
const { compareSync } = require('bcrypt');

const partnerCode = 'CryptoBank';
const secretKey = config.HASH_SECRET;
const passphrase = config.PGP_SECRET;
const privateKeyArmored = JSON.parse(`"${config.PGP_PRIVATE_KEY}"`);

const today = moment().startOf('day');

function generateOTP(length) {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

function sendEmail(email, OTP, depositor, receiver, amount) {
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
        to: email,
        subject: 'Transaction Verification OTP',
        text: `Chào ${depositor.full_name},\nBạn vừa thực hiện giao dịch chuyển tiền cho ${receiver.full_name} số tài khoản ${receiver.account_number} số tiền: ${amount} \n\nMã OTP để xác thực là: ${OTP}`
    };

    transporter.sendMail(mailOptions, function (err) {
        if (err) {
            console.log('Can not send OTP to email.');
        }
    });
}

module.exports = (app, io) => {
    app.use('/transactions', router);

    router.post('/user', verifyUser, async (req, res) => {
        let { scope, amount, note, receiver, partner_code, type, fee, save } = req.body;

        if (!scope || scope !== 'internal' && scope !== 'external') {
            return res.status(400).json({ message: 'Invalid scope.' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const depositor = await User.findById(req.tokenPayload.userId);

        if (!depositor) {
            return res.status(400).json({ message: 'Depositor is not exist.' });
        }

        if (type === 'transfer' && depositor.balance - amount - (fee ? config.TRANSFER_FEE : 0) < 0) {
            return res.status(400).json({ message: 'Not enough money to send.' });
        }

        if (scope === 'internal') {
            receiver = await User.findOne({ account_number: receiver.account_number });

            if (!receiver) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }

        if (type === 'transfer') {
            const transaction = new Transaction({
                depositor: {
                    full_name: depositor.full_name,
                    account_number: depositor.account_number
                },
                receiver: {
                    full_name: receiver.full_name,
                    account_number: receiver.account_number
                },
                note,
                amount,
                scope,
                type,
                fee,
                partner_code
            });

            if (save) {
                const index = depositor.friends.findIndex((item) => item.account_number === receiver.account_number)

                if (index === -1) {
                    depositor.friends.push({
                        account_number: receiver.account_number,
                        full_name: receiver.full_name,
                        nick_name: '',
                        bank: scope === 'external' ? partner_code : 'Cryptobank'
                    });

                    depositor.save();
                }
            }

            await transaction.save();

            const otp = new OTP({
                user_id: depositor._id,
                transaction_id: transaction._id,
                otp: generateOTP(6)
            });

            sendEmail(depositor.email, otp.otp, depositor, receiver, amount);

            await otp.save();

            return res.status(200).json({ message: 'Successful', otp: otp.otp });
        }
        else {
            const transaction = new Transaction({
                depositor: {
                    full_name: receiver.full_name,
                    account_number: receiver.account_number
                },
                receiver: {
                    full_name: depositor.full_name,
                    account_number: depositor.account_number
                },
                note: note,
                amount: amount,
                scope: scope,
                type: type,
                fee: fee,
                partner_code
            });

            await transaction.save();

            depositor.transactions.push(transaction._id);
            await depositor.save();

            receiver.notifications.push({
                title: 'debt',
                data: transaction
            });
            receiver.transactions.push(transaction._id);
            await receiver.save();

            const sockets = io.sockets.sockets;

            for (let socketId in sockets) {
                const s = sockets[socketId];
                if (s.accountNumber === receiver.account_number) {
                    io.to(s.id).emit('debt', transaction);
                }
            }

            return res.status(200).json({ transaction });
        }
    });

    router.get('/otp', verifyUser, async (req, res) => {
        let { transaction_id } = req.query;

        const depositor = await User.findById(req.tokenPayload.userId);

        const transaction = await Transaction.findById(transaction_id);

        console.log(transaction)

        if (depositor.balance - transaction.amount < 0) {
            return res.status(400).json({ message: 'Your balance is not enough.' });
        }

        if (!depositor) {
            return res.status(400).json({ message: 'Depositor is not exist.' });
        }

        if (!transaction) {
            return res.status(400).json({ message: 'Transaction id is not exist.' });
        }

        if (transaction.status === 'confirmed') {
            return res.status(400).json({ message: 'This transaction is completed.' });
        }

        if (transaction.type === 'debt' && transaction.depositor.account_number !== depositor.account_number) {
            return res.status(401).json({ message: 'You can not pay for yourself.' });
        }

        const otp = new OTP({
            user_id: req.tokenPayload.userId,
            transaction_id: transaction._id,
            otp: generateOTP(6)
        });

        sendEmail(depositor.email, otp.otp, depositor, transaction.receiver, transaction.amount);

        await otp.save();

        return res.status(200).json({ message: 'Successful', otp: otp.otp });
    });

    router.post('/user/confirm', verifyUser, async (req, res) => {
        const { otp } = req.body;

        const _otp = await OTP.findOne({ user_id: req.tokenPayload.userId, otp });

        if (!_otp) {
            return res.status(401).json({ message: 'Invalid OTP or expired.' });
        }

        const transaction = await Transaction.findById(_otp.transaction_id);

        const { depositor, receiver, amount, scope, note, fee, partner_code } = transaction;

        if (scope === 'internal') {
            const rec = await User.findOne({ account_number: receiver.account_number });

            if (!rec) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }
        else {
            switch (partner_code) {
                case 'NKLBank': {
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
                case 'TeaBank': {
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

        transaction.status = 'confirmed';
        await transaction.save();

        const dep = await User.findOne({ account_number: depositor.account_number });

        dep.transactions.push(transaction._id);
        dep.balance -= +amount + (fee ? config.TRANSFER_FEE : 0);
        await dep.save();

        if (scope === 'internal') {
            const rec = await User.findOne({ account_number: receiver.account_number });
            rec.notifications.push({
                title: 'receive',
                data: transaction
            });

            rec.transactions.push(transaction._id);
            rec.balance = parseInt(rec.balance) + parseInt(amount) - (fee ? 0 : config.TRANSFER_FEE);
            await rec.save();

            const sockets = io.sockets.sockets;

            for (let socketId in sockets) {
                const s = sockets[socketId];
                if (s.accountNumber === rec.account_number) {
                    if (transaction.type === 'transfer') {
                        io.to(s.id).emit('receive', transaction);
                    }
                    else {
                        io.to(s.id).emit('pay', transaction);
                    }
                }
            }
        }

        return res.status(200).json({ depositor: dep, transaction });
    });

    router.delete('/:transaction_id', verifyUser, async (req, res) => {
        const { message } = req.body;
        const user = await User.findById(req.tokenPayload.userId);
        const transaction = await Transaction.findById(req.params.transaction_id);

        if (!transaction) {
            return res.status(404).json({ message: 'Not found transaction.' });
        }

        transaction.active = false;
        transaction.delete_message = message;
        await transaction.save();

        const sockets = io.sockets.sockets;

        for (let socketId in sockets) {
            const s = sockets[socketId];
            let target = null;

            // người hủy là người gởi lời nhắc
            if (user.account_number === transaction.receiver.account_number) {
                //mục tiêu nhận notify là người phải trả tiền
                target = transaction.depositor
            }
            else {
                target = transaction.receiver
            }

            if (s.accountNumber === target.account_number) {
                io.to(s.id).emit('cancel-debt', transaction);
            }
        }

        return res.status(200).json({ message: 'Sccessful.' });
    });

    router.post('/teller', verifyTeller, async (req, res) => {
        let { scope, amount, note, receiver, partner_code } = req.body;

        if (!scope || scope !== 'internal' && scope !== 'external') {
            return res.status(400).json({ message: 'Invalid scope.' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const depositor = await Teller.findById(req.tokenPayload.userId);

        if (!depositor) {
            return res.status(400).json({ message: 'Depositor is not exist.' });
        }

        if (scope === 'internal') {
            receiver = await User.findOne({ account_number: receiver.account_number });

            if (!receiver) {
                return res.status(400).json({ message: 'Receiver is not exist.' });
            }
        }
        else {
            switch (partner_code) {
                case 'NKLBank': {
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
                case 'TeaBank': {
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
            note,
            amount,
            scope,
            partner_code,
            type: "transfer",
            status: "confirmed"
        });

        await transaction.save();

        depositor.transactions.push(transaction._id);
        await depositor.save();

        if (scope === 'internal') {
            receiver.transactions.push(transaction._id);
            receiver.balance = parseInt(receiver.balance) + parseInt(amount);
            await receiver.save();
        }

        const sockets = io.sockets.sockets;

        for (let socketId in sockets) {
            const s = sockets[socketId];

            if (s.accountNumber === receiver.account_number) {
                io.to(s.id).emit('receive', transaction);
            }
        }

        return res.status(200).json({ transaction });
    });

    router.get('/me', verifyUser, async (req, res) => {
        const user = await User.findById(req.tokenPayload.userId);

        const records = await Transaction.find().where('_id').in(user.transactions).exec();

        return res.status(200).json(records);
    });

    router.get('/user/:account_number', verifyTeller, async (req, res) => {
        const { account_number } = req.params;
        const user = await User.findOne({ account_number });

        if (!user) {
            return res.status(404).json('Not found user.');
        }

        const records = await Transaction.find().where('_id').in(user.transactions).exec();

        return res.status(200).json(records);
    });

    router.get('/', verifyAdmin, async (req, res) => {
        const { partner_code, time } = req.query;
        let transactions = [];

        const start_time = moment().subtract(time-1, 'days').startOf('day').toDate();
        const end_time =  moment(today).endOf('day').toDate();

        console.log(start_time, end_time)

        if (partner_code === 'CryptoBank') {
            transactions = await Transaction.find({
                'scope': 'internal',
                'createdAt': {
                    $gte: start_time,
                    $lte: end_time
                }
            });
        }
        else {
            if (partner_code) {
                transactions = await Transaction.find({
                    'scope': 'external',
                    'partner_code': partner_code,
                    'createdAt': {
                        $gte: start_time,
                        $lte: end_time
                    }
                });
            }
            else {
                transactions = await Transaction.find({
                    'scope': 'external',
                    'createdAt': {
                        $gte: start_time,
                        $lte: end_time
                    }
                });
            }
        }

        return res.status(200).json(transactions);
    });
};