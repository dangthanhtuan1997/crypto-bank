const axios = require('axios');
var CryptoJS = require("crypto-js");
var moment = require('moment');
const openpgp = require('openpgp');
const config = require('./src/config');
var rootURL = 'https://great-banking.herokuapp.com';

signRequest = async (data) => {
    const privateKeyArmored = JSON.parse(`"${config.PRIVATE_KEY}"`); // convert '\n'
    const passphrase = config.PGP_SECRET; // what the private key is encrypted with

    const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
    await privateKey.decrypt(passphrase);

    const { signature: detachedSignature } = await openpgp.sign({
        message: openpgp.cleartext.fromText(data), // CleartextMessage or Message object
        privateKeys: [privateKey],                            // for signing
        detached: true
    });
    return JSON.stringify(detachedSignature);
}

checkInfo = () => {
    const requestTime = Date.now();
    const partnerCode = 'CryptoBank';
    const secret_key = 'hiphopneverdie';
    const body = {};
    const text = partnerCode + requestTime + JSON.stringify(body) + secret_key;
    const hash = CryptoJS.MD5(text).toString();

    const headers = {
        'Content-Type': 'application/json',
        'bank_code': `${partnerCode}`,
        'ts': `${requestTime}`,
        'sig': `${hash}`
    }

    axios.get(`${rootURL}/money-transfer/bank-detail`, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response)
    })
}

deposits = async () => {
    const requestTime = moment().format();
    const partnerCode = 'bank1';
    const secret_key = 'secret1';
    const body = {
        amount: 50000,
        depositor: {
            account_number: "1201245870155",
            full_name: "Nguyễn Văn A"
        },
        receiver: {
            account_number: "0331088525892",
            full_name: "Đặng Thanh Tuấn"
        },
        partner_code: partnerCode
    };

    const text = partnerCode + requestTime + JSON.stringify(body) + secret_key;
    const hash = CryptoJS.SHA256(text).toString();
    const signature = await signRequest(hash);

    const headers = {
        'Content-Type': 'application/json',
        'x-partner-code': `${partnerCode}`,
        'x-partner-request-time': `${requestTime}`,
        'x-partner-hash': `${hash}`,
        'x-partner-signature': `${signature}`
    }

    axios.post(`${rootURL}/money-transfer/bank-detail`, body, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response.data.message)
    })
}

if (process.argv.includes('deposits')) {
    deposits();
}

if (process.argv.includes('checkInfo')) {
    checkInfo();
}