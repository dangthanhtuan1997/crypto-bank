const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment');
const openpgp = require('openpgp');
const config = require('./src/config');

// !!! KHÔNG CHỈNH SỬA
const fixedData = {
    secret_key: "CryptoBank_secret",
    email: "info@cryptobank.com",
};
// !!! KHÔNG CHỈNH SỬA

const privateKeyArmored = JSON.parse(`"${config.PGP_PRIVATE_KEY}"`);

const partner_code = 'CryptoBank';
const timestamp = moment().toString();

const data = { transaction_type: '+', source_account: '26348364', target_account: '12345', amount_money: 293234424 }
const secret_key = fixedData.secret_key;

const hash = CryptoJS.AES.encrypt(JSON.stringify({ data, timestamp, secret_key }), secret_key).toString();

const _headers = {
    partner_code: partner_code,
    timestamp: timestamp,
    api_signature: hash,
};

var signed_data = null;

check = () => {
    axios.post("https://nklbank.herokuapp.com/api/partnerbank/request",
        { data, signed_data },
        { headers: _headers }
    ).then(function (response) {
        console.log(response.data)
    }).catch(function (error) {
        console.log(error.response.data);
    });
}

deposit = async () => {
    if (data.transaction_type === "+" || data.transaction_type === "-") {

        const passphrase = config.PGP_SECRET;
        const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);

        await privateKey.decrypt(passphrase);

        const { data: cleartext } = await openpgp.sign({
            message: openpgp.cleartext.fromText(JSON.stringify(data)),
            privateKeys: [privateKey], 
        });

        signed_data = cleartext;

        axios.post(
            "https://nklbank.herokuapp.com/api/partnerbank/request",
            { data, signed_data },
            { headers: _headers }
        )
            .then(function (response) {
                console.log(response.data)
            })
            .catch(function (error) {
                console.log(error.response.data);
            });
    }
}


if (process.argv.includes('deposit')) {
    deposit();
}

if (process.argv.includes('check')) {
    check();
}