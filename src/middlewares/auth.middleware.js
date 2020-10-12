const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const config = require('../config');
const Teller = require('../model/teller.model');
const Admin = require('../model/admin.model');

verifyUser = (req, res, next) => {
    const token = req.headers['x-access-token'];

    if (token) {
        if (token.split(" ")[0] === 'JWT') {
            jwt.verify(token.split(" ")[1], config.jwtSecret, function (err, payload) {
                if (err)
                    throw createError(401, err);

                req.tokenPayload = payload;
                next();
            })
        }
        else {
            res.status(401).json({ message: 'Error validating access token.' })
        }
    }
    else {
        throw createError(401, 'Not found access token.');
    }
}

verifyTeller = (req, res, next) => {
    const token = req.headers['x-access-token'];

    if (token) {
        if (token.split(" ")[0] === 'JWT') {
            jwt.verify(token.split(" ")[1], config.jwtSecret, async (err, payload) => {
                if (err) {
                    throw createError(401, err);
                }

                if (payload.role === 'teller') {
                    req.tokenPayload = payload;
                    next();
                }
                else {
                    return res.status(401).json({ message: 'You can not access to this route.' });
                }
            })
        }
        else {
            res.status(401).json({ message: 'Error validating access token.' });
        }
    }
    else {
        throw createError(401, 'Not found access token.');
    }
}

verifyAdmin = (req, res, next) => {
    const token = req.headers['x-access-token'];

    if (token) {
        if (token.split(" ")[0] === 'JWT') {
            jwt.verify(token.split(" ")[1], config.jwtSecret, async (err, payload) => {
                if (err) {
                    throw createError(401, err);
                }
                
                if (payload.role === 'admin') {
                    req.tokenPayload = payload;
                    next();
                }
                else {
                    return res.status(401).json({ message: 'You can not access to this route.' });
                }
            })
        }
        else {
            res.status(401).json({ message: 'Error validating access token.' });
        }
    }
    else {
        throw createError(401, 'Not found access token.');
    }
}

module.exports = { verifyUser, verifyTeller, verifyAdmin }
