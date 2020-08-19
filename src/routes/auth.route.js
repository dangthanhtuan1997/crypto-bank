const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('../passport/passport');
const User = require('../model/user.model');
const Teller = require('../model/teller.model');
const Admin = require('../model/admin.model');
const config = require('../config');
const createError = require('http-errors');
const { verifyTeller, verifyAdmin } = require('../middlewares/auth.middleware');

generateAccountNumber = (length) => {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

module.exports = (app) => {
    app.use('/auth', router);

    router.post('/user/register', verifyTeller, (req, res) => {
        let { password, username, phone, email, accountNumber, fullName } = req.body;

        if (!phone || phone.length < 10) {
            return res.status(400).json({ message: 'Invalid phone' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Passwords must be at least 6 characters' });
        }

        User.findOne({ username }, (err, user) => {
            if (user) {
                return res.status(400).json({ message: 'Username has already been taken' });
            }
            bcrypt.hash(password, config.saltRounds, async function (err, hash) {
                if (err) { return res.status(500).json(err); }

                accountNumber = accountNumber || generateAccountNumber(16);
                const user = new User({ ...req.body, password: hash, account_number: accountNumber, full_name: fullName });

                const refresh_token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret);
                user.refresh_token = refresh_token;

                user.save((err, user) => {
                    if (err) { return res.status(500).json(err) }
                    return res.status(201).json({ message: 'successful' });
                });
            });
        });
    });

    router.post('/user/login', (req, res) => {
        passport.authenticate('user', { session: false }, (err, user, info) => {
            if (err || !user) {
                return res.status(401).json({
                    message: info.message
                });
            }

            req.login(user, { session: false }, err => {
                if (err) {
                    return res.send(err);
                }
                const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, { expiresIn: '1h' });

                return res.status(200).json({ 'token': token, 'refresh_token': user.refresh_token });
            });
        })(req, res);
    });

    router.get('/user/new-token', (req, res) => {
        const refresh_token = req.headers['x-refresh-token'];

        if (refresh_token) {
            if (refresh_token.split(" ")[0] === 'JWT') {
                jwt.verify(refresh_token.split(" ")[1], config.jwtSecret, async (err, payload) => {
                    if (err)
                        throw createError(401, err);

                    const { userId } = payload;
                    const user = await User.findById(userId);

                    if (!user || refresh_token !== user.refresh_token) {
                        return res.status(401).json({ message: 'Invalid refresh token' });
                    }

                    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, { expiresIn: '1h' });

                    return res.status(200).json({ token });
                })
            }
            else {
                res.status(401).json({ message: 'Error validating access token.' })
            }
        }
        else {
            throw createError(401, 'Not found refresh token.');
        }
    });

    router.post('/teller/register', verifyAdmin, (req, res) => {
        let { password, username, fullName, accountNumber } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Passwords must be at least 6 characters' });
        }

        Teller.findOne({ username }, (err, teller) => {
            if (teller) {
                return res.status(400).json({ message: 'Username has already been taken' })
            }
            bcrypt.hash(password, config.saltRounds, async function (err, hash) {
                if (err) { return res.status(500).json(err); }

                accountNumber = accountNumber || generateAccountNumber(5);

                const teller = new Teller({ ...req.body, password: hash, full_name: fullName, account_number: accountNumber });
                teller.save((err, teller) => {
                    if (err) { return res.status(500).json(err) }
                    return res.status(201).json({ message: 'successful' });
                });
            });
        });
    });

    router.post('/teller/login', (req, res) => {
        passport.authenticate('teller', { session: false }, (err, user, info) => {
            if (err || !user) {
                return res.status(401).json({
                    message: info.message
                });
            }

            req.login(user, { session: false }, err => {
                if (err) {
                    return res.send(err);
                }
                const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
                return res.status(200).json({ 'token': token });
            });
        })(req, res);
    });

    // router.post('/admin/register', (req, res) => {
    //     const { password, username } = req.body;

    //     if (!password || password.length < 6) {
    //         return res.status(400).json({ message: 'Passwords must be at least 6 characters' });
    //     }

    //     Admin.findOne({ username }, (err, admin) => {
    //         if (admin) {
    //             return res.status(400).json({ message: 'Username has already been taken' })
    //         }
    //         bcrypt.hash(password, config.saltRounds, async function (err, hash) {
    //             if (err) { return res.status(500).json(err); }

    //             const admin = new Admin({ ...req.body, password: hash });
    //             admin.save((err, admin) => {
    //                 if (err) { return res.status(500).json(err) }
    //                 return res.status(201).json({ message: 'successful' });
    //             });
    //         });
    //     });
    // });

    router.post('/admin/login', (req, res) => {
        passport.authenticate('admin', { session: false }, (err, user, info) => {
            if (err || !user) {
                return res.status(401).json({
                    message: info.message
                });
            }

            req.login(user, { session: false }, err => {
                if (err) {
                    return res.send(err);
                }
                const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
                return res.status(200).json({ 'token': token });
            });
        })(req, res);
    });
};