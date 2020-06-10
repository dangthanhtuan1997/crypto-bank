const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('./src/config');
const crypto = require("crypto");

const rootURL = 'https://w-internet-banking.herokuapp.com/api/partner';

check = () => {
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

deposit = async () => {
    const requestTime = moment().format('X');
    const partnerCode = 'CryptoBank';
    const secret_key = 'CryptoBank_secret';
    const body = {
        amount: 100000,
        name: "Đặng Thanh Tuấn",
        note: "Test deposit"
    }

    let sign = crypto.createSign('SHA512');
    sign.write(requestTime + JSON.stringify(body));
    sign.end();

    const signature = sign.sign(JSON.parse(`"${config.RSA_PRIVATE_KEY}"`), 'base64');

    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': partnerCode,
        'X-REQUEST-TIME': requestTime,
        'X-SIGNATURE': signature
    }

    axios.post(`${rootURL}/deposits/1234561234561234`, body, {
        headers: headers
    }).then((response) => {
        console.log(response.data)
    }).catch((err) => {
        console.log(err.response)
    })
}

if (process.argv.includes('deposit')) {
    deposit();
}

if (process.argv.includes('check')) {
    check();
}