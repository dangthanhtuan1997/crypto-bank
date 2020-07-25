const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Schema = mongoose.Schema;

var TellerSchema = new mongoose.Schema(
    {
        full_name: String,
        role: { type: String, default: 'teller' },
        username: String,
        password: String,
        transactions: [],
        account_number: String
    },
    {
        timestamps: true
    }
);

var tellers = mongoose.model('tellers', TellerSchema);

module.exports = tellers;