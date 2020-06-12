const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var TransactionSchema = new mongoose.Schema(
    {
        depositor: Object,
        receiver: Object,
        amount: Number,
        partner_code: String,
        note: String,
        signature: String,
        type: String //external vs internal 
    },
    {
        timestamps: true
    }
);

var transactions = mongoose.model('transactions', TransactionSchema);

module.exports = transactions;