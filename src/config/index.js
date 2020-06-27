const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();

if (!envFound) {
    throw new Error("Couldn't find .env file");
}

const port = parseInt(process.env.PORT, 10);

const databaseURL = process.env.MONGODB_URI;

var jwtSecret = process.env.JWT_SECRET;

const PGP_PRIVATE_KEY = process.env.PGP_PRIVATE_KEY;
const PGP_PUBLIC_KEY = process.env.PGP_PUBLIC_KEY;

const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;
const RSA_PUBLIC_KEY = process.env.RSA_PUBLIC_KEY;

const PGP_SECRET = process.env.PGP_SECRET;
const BANK_NAME = process.env.BANK_NAME;
const HASH_SECRET = process.env.HASH_SECRET;

const PGP_PUBLIC_KEY_TeaBank = process.env.PGP_PUBLIC_KEY_TeaBank;

const api = {
    prefix: '/api'
}

const TRANSFER_FEE = 3000;

const EMAIL_PASS = process.env.EMAIL_PASS;

const saltRounds = 10;

module.exports = {
    port,
    databaseURL,
    jwtSecret,
    api,
    saltRounds,
    PGP_PRIVATE_KEY,
    PGP_PUBLIC_KEY,
    RSA_PRIVATE_KEY,
    RSA_PUBLIC_KEY,
    PGP_SECRET,
    BANK_NAME,
    PGP_PUBLIC_KEY_TeaBank,
    HASH_SECRET,
    TRANSFER_FEE,
    EMAIL_PASS
};