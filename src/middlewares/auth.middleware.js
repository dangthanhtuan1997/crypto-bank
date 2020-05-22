const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const config = require('../config');

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

module.exports = { verifyUser }
