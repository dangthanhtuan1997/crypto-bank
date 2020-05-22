const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('../passport/passport');
const User = require('../model/user.model');
const config = require('../config');

module.exports = (app) => {
    app.use('/auth', router);

    router.post('/register', (req, res) => {
        if (req.body.password.length < 6) {
            return res.status(400).json({ message: 'Passwords must be at least 6 characters' });
        }

        User.findOne({ username: req.body.username }, (err, user) => {
            if (user) {
                return res.status(400).json({ message: 'Username has already been taken' })
            }
            bcrypt.hash(req.body.password, config.saltRounds, async function (err, hash) {
                if (err) { return res.status(500).json(err); }
                const user = new User({ ...req.body, password: hash });
                user.save((err, user) => {
                    if (err) { return res.status(500).json(err) }
                    const userModified = user.toObject();
                    delete userModified.password;
                    return res.status(201).json(userModified);
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
                const token = jwt.sign({ user_id: user._id }, config.jwtSecret, { expiresIn: '7d' });
                return res.json({ token });
            });
        })(req, res);
    });
};