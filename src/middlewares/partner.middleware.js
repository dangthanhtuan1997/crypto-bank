const createError = require('http-errors');
var CryptoJS = require("crypto-js");
const config = require('../config');
var moment = require('moment');
const openpgp = require('openpgp');

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

    if (hash !== confirmHash) {
        throw createError(401, 'The request has been edited.');
    }

    next();
}

verifyPartnerWithSignature = async (req, res, next) => {
    const partnerCode = req.headers['x-partner-code'];
    const requestTime = req.headers['x-partner-request-time'];
    const hash = req.headers['x-partner-hash'];
    const signature = req.headers['x-partner-signature'];

    if (!partnerCode) {
        throw createError(400, 'Partner code is required.');
    }
    if (!requestTime) {
        throw createError(400, 'Request time is required.');
    }
    if (!hash) {
        throw createError(400, 'Hash is required.');
    }
    if (!signature) {
        throw createError(400, 'Signature is required.');
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

    if (hash !== confirmHash) {
        throw createError(401, 'The request has been edited.');
    }

    const publicKeyArmored = JSON.parse(`"${config.PUBLIC_KEY}"`);

    const verified = await openpgp.verify({
        message: openpgp.cleartext.fromText(hash),              // CleartextMessage or Message object
        signature: await openpgp.signature.readArmored(JSON.parse(signature)), // parse detached signature
        publicKeys: (await openpgp.key.readArmored(publicKeyArmored)).keys // for verification
    });
    const { valid } = verified.signatures[0];

    if (valid) {
        console.log('signed by key id ' + verified.signatures[0].keyid.toHex());
    } else {
        throw new Error('signature could not be verified');
    }

    next();
}

module.exports = { verifyPartner, verifyPartnerWithSignature }
