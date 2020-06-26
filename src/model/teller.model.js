const mongoose = require('mongoose');

var TellerSchema = new mongoose.Schema(
    {
        full_name: String,
        role: { type: String, default: 'teller' },
        username: String,
        password: String,
        transaction: []
    },
    {
        timestamps: true
    }
);

var tellers = mongoose.model('tellers', TellerSchema);

module.exports = tellers;