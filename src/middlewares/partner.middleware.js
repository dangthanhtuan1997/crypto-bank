const createError = require('http-errors');
var CryptoJS = require("crypto-js");
const config = require('../config');
var moment = require('moment');

const partners = [{ code: 'bank1', secret_key: 'secret1' }, { code: 'bank2', secret_key: 'secret2' }];

verifyPartner = (req, res, next) => {
    const partnerCode = req.headers['x-partner-code'];
    const requestTime = req.headers['x-partner-request-time'];
    const hash = req.headers['x-partner-hash'];

    if (!partnerCode) {
        throw createError(400, 'Partner code is required.');
    }
    if (!requestTime) {
        throw createError(400, 'Request time is required.');
    }
    if (!hash) {
        throw createError(400, 'Hash is required.');
    }

    const partner = partners.find(x => x.code === partnerCode);

    if (!partner) {
        throw createError(401, 'Error validating your partner code.');
    }

    var newTime = moment(requestTime).add(3, 'minutes');
    var nowTime = moment().format();

    if (!newTime.isAfter(nowTime)) {
        throw createError(401, 'Expired request.');
    }

    const text = partnerCode + requestTime + JSON.stringify(req.body) + partner.secret_key;
    const confirmHash = CryptoJS.SHA256(text).toString();

    if (hash !== confirmHash){
        throw createError(401, 'The request has been edited.');
    }

    next();
}

module.exports = { verifyPartner }
