const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var UserSchema = new mongoose.Schema(
    {
        account_number: String,
        full_name: String,
        balance: { type: Number, default: 50000 },
        saving: [Object],
        role: { type: String, default: 'user' },
        transactions: [Schema.Types.ObjectId]
    },
    {
        timestamps: true
    }
);

var users = mongoose.model('users', UserSchema);

module.exports = users;