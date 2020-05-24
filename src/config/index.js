const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();

if (!envFound) {
    throw new Error("Couldn't find .env file");
}

const port = parseInt(process.env.PORT, 10);

const databaseURL = process.env.MONGODB_URI;

var jwtSecret = process.env.JWT_SECRET;

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const PUBLIC_KEY = process.env.PUBLIC_KEY;

const PUBLIC_KEY_BANK1 = process.env.PUBLIC_KEY_BANK1;

const PGP_SECRET = process.env.PGP_SECRET;

const api = {
    prefix: '/api'
}

const saltRounds = 10;

module.exports = { port, databaseURL, jwtSecret, api, saltRounds, PRIVATE_KEY, PUBLIC_KEY, PGP_SECRET, PUBLIC_KEY_BANK1 };