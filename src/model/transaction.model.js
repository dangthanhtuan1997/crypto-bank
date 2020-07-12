const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Schema = mongoose.Schema;

var TransactionSchema = new mongoose.Schema(
    {
        depositor: Object,
        receiver: Object,
        amount: Schema.Types.Long,
        partner_code: String,
        note: String,
        signature: String,
        scope: String, //external vs internal
        type: String,
        status: {
            type: String,
            default: 'pending'
        },
        fee: Boolean,
        active: {
            type: Boolean,
            default: true
        },
        delete_message: String
    },
    {
        timestamps: true
    }
);

var transactions = mongoose.model('transactions', TransactionSchema);

module.exports = transactions;