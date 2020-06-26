const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Schema = mongoose.Schema;

var UserSchema = new mongoose.Schema(
    {
        account_number: String,
        full_name: String,
        balance: { type: Schema.Types.Long, default: 50000 },
        saving: [],
        role: { type: String, default: 'user' },
        transactions: [Schema.Types.ObjectId],
        username: String,
        password: String,
        phone: String,
        email: String,
        notify: []
    },
    {
        timestamps: true
    }
);

var users = mongoose.model('users', UserSchema);

module.exports = users;