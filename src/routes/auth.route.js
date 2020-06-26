const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('../passport/passport');
const User = require('../model/user.model');
const config = require('../config');


generateAccountNumber = (length) => {
    const c = '0123456789';
    return s = [...Array(length)].map(_ => c[~~(Math.random() * c.length)]).join('');
}

module.exports = (app) => {
    app.use('/auth', router);

    router.post('/user/register', (req, res) => {
        const { password, username, phone, email } = req.body;

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
                return res.status(400).json({ message: 'Username has already been taken' })
            }
            bcrypt.hash(password, config.saltRounds, async function (err, hash) {
                if (err) { return res.status(500).json(err); }

                const account_number = generateAccountNumber(16);
                const user = new User({ ...req.body, password: hash, account_number });
                user.save((err, user) => {
                    if (err) { return res.status(500).json(err) }
                    return res.status(201).json({ message: 'successful' });
                });
            });
        });
    });

    router.post('/login', (req, res) => {
        passport.authenticate('local', { session: false }, (err, user, info) => {
            if (err || !user) {
                return res.status(401).json({
                    message: info.message
                });
            }

            req.login(user, { session: false }, err => {
                if (err) {
                    return res.send(err);
                }
                const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '7d' });
                return res.json({ 'token': token });
            });
        })(req, res);
    });
};