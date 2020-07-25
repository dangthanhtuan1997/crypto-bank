const createError = require('http-errors');
var CryptoJS = require("crypto-js");
const config = require('../config');
var moment = require('moment');
const openpgp = require('openpgp');

const partners = [{ code: 'TeaBank', secret_key: 'Te@B@nk' }, { code: '37Bank', secret_key: '37Bank' }, { code: 'bank1', secret_key: 'secret1' }];

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
        console.log('text: ' + text);
        console.log('hash: ' + hash);
        console.log('confirmHash: ' + confirmHash);

        throw createError(401, 'The request has been edited.');
    }

    next();
}

verifyPartnerWithSignature = async (req, res, next) => {
    const partnerCode = req.headers['x-partner-code'];
    const requestTime = req.headers['x-partner-request-time'];
    const hash = req.headers['x-partner-hash'];
    const signature = req.headers['x-partner-signature'];
    
    console.log(partnerCode)
    console.log(signature)

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
    if (!req.body.amount){
        throw createError(400, 'Amount is required.');
    }
    if (!req.body.depositor){
        throw createError(400, 'Depositor is required..');
    }
    if (!req.body.receiver){
        throw createError(400, 'Receiver is required.');
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
        console.log('text: ' + text);
        console.log('hash: ' + hash);
        console.log('confirmHash: ' + confirmHash);

        throw createError(401, 'The request has been edited.');
    }

    let publicKeyArmored;

    if (partnerCode === 'TeaBank') {
        publicKeyArmored = JSON.parse(`"${config.PGP_PUBLIC_KEY_TeaBank}"`);
    }
    else if (partnerCode === '37Bank'){
        publicKeyArmored = JSON.parse(`"${config.PGP_PUBLIC_KEY_37Bank}"`); 
    }
    else {
        publicKeyArmored = JSON.parse(`"${config.PGP_PUBLIC_KEY}"`);
    }

    const verified = await openpgp.verify({
        message: openpgp.cleartext.fromText(hash),              // CleartextMessage or Message object
        signature: await openpgp.signature.readArmored(JSON.parse(signature)), // parse detached signature
        publicKeys: (await openpgp.key.readArmored(publicKeyArmored)).keys // for verification
    });
    const { valid } = verified.signatures[0];

    if (!valid) {
        throw createError(401, 'Invalid signature.');
    }

    req.body.signature = signature;

    next();
}

module.exports = { verifyPartner, verifyPartnerWithSignature }
