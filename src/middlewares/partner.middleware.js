const createError = require('http-errors');
var CryptoJS = require("crypto-js");
const config = require('../config');
var moment = require('moment');

const partners = [{ code: 'bank1', secret_key: 'secret1' }, { code: 'bank2', secret_key: 'secret2' }];

verifyPartner = (req, res, next) => {
    const code = req.headers['x-partner-code'];
    const time = req.headers['x-partner-time-request'];


    if (!code) {
        throw createError(401, 'Not found partner code.');
    }

    const partner = partners.find(x => x.code === code);

    if (!partner) {
        throw createError(401, 'Error validating your partner code.');
    }

    var requestTime = moment(time).add(3, 'minutes');
    var nowTime = moment().format();

    if (!requestTime.isAfter(nowTime)) {
        throw createError(401, 'Invalid time request.');
    }

    if (req.body.data) {
        // var data = {
        //     full_name: "Đặng Thanh Tuấn"
        // }

        // Encrypt
        //var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), partner.secret_key).toString();
        //console.log(ciphertext)

        // Decrypt
        var bytes = CryptoJS.AES.decrypt(req.body.data, partner.secret_key);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        req.body = decryptedData;
    }

    next();
}

module.exports = { verifyPartner }
