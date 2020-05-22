const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();

if (!envFound) {
    throw new Error("Couldn't find .env file");
}

var port = parseInt(process.env.PORT, 10);

var databaseURL = process.env.MONGODB_URI;

var jwtSecret = process.env.JWT_SECRET;

var api = {
    prefix: '/api'
}

var saltRounds = 10;

module.exports = {port, databaseURL, jwtSecret, api, saltRounds};