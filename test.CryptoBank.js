const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('./src/config');
const rootURL = 'https://crypto-bank-1612785.herokuapp.com/api';
//var rootURL = 'http://localhost:3000/api';

signRequest = async (data) => {
    const privateKeyArmored = JSON.parse(`"${config.PGP_PRIVATE_KEY}"`); // convert '\n'

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
    const requestTime = moment().format();
    const partnerCode = 'TeaBank';
    const secret_key = 'Te@B@nk';
    const body = {};
    const text = partnerCode + requestTime + JSON.stringify(body) + secret_key;
    const hash = CryptoJS.SHA256(text).toString();

    const headers = {
        'Content-Type': 'application/json',
        'x-partner-code': partnerCode,
        'x-partner-request-time': requestTime,
        'x-partner-hash': hash
    }

    axios.get(`${rootURL}/services/account_number/0331088525892`, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response.data.message)
    })
}

deposit = async () => {
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

    axios.post(`${rootURL}/services/deposits/account_number/0331088525892`, body, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response.data.message)
    })
}

if (process.argv.includes('deposit')) {
    deposit();
}

if (process.argv.includes('checkinfo')) {
    checkInfo();
}