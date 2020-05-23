const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const config = require('./config');
const routes = require('./routes');
const passport = require('./passport/passport');
const mongoose = require('mongoose');
const cors = require('cors');
require('express-async-errors');

const PORT = config.port;

const app = express();

app.use(config.api.prefix + '/uploads', express.static('uploads'));

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(morgan('dev'));

app.use(config.api.prefix, routes());

app.use(passport.initialize());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

mongoose.connect(config.databaseURL, {
    useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true
}).then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit(1);
});

app.use((req, res, next) => {
    res.status(404).send('Read document api at: https://docs.google.com/document/d/1smXQknvS3qgctOMUYc2UjMZBtCK7_uY-ruVgdbYaSYI/edit?usp=sharing');
})

app.use(function (err, req, res, next) {
    console.log(err.stack);
    res.status(err.statusCode).json({ message: err.message });
})

app.listen(PORT, err => {
    console.log('App is running at port: ' + PORT);
});