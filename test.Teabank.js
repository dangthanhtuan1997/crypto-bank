const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('./src/config');

const rootURL = 'https://w-internet-banking.herokuapp.com/api/partner';

signRequest = async (data) => {
    const key = new NodeRSA(JSON.parse(`"${config.RSA_PRIVATE_KEY}"`));

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
    const requestTime = moment().format('X');
    const partnerCode = 'CryptoBank';
    const secret_key = 'CryptoBank_secret';
    const hash = CryptoJS.SHA512(requestTime + secret_key).toString();

    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': partnerCode,
        'X-REQUEST-TIME': requestTime,
        'X-HASH': hash
    }

    axios.get(`${rootURL}/accounts/1234561234561234`, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response)
    })
}

deposits = async () => {
    const requestTime = moment().format('X');
    const partnerCode = 'CryptoBank';
    const secret_key = 'CryptoBank_secret';
    const body = {

    }

    const signature = await signRequest(requestTime + JSON.stringify(body));

    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': partnerCode,
        'X-REQUEST-TIME': requestTime,
        'X-SIGNATURE': signature
    }

    axios.post(`${rootURL}/services/deposits/account_number/0331088525892`, body, {
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