const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var TransactionSchema = new mongoose.Schema(
    {
        sender: Object,
        receiver: Object,
        amount: Number,
        partner: String
    },
    {
        timestamps: true
    }
);

var transactions = mongoose.model('transactions', TransactionSchema);

module.exports = transactions;