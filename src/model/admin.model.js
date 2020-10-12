const mongoose = require('mongoose');

var AdminSchema = new mongoose.Schema(
    {
        full_name: String,
        role: { type: String, default: 'admin' },
        username: String,
        password: String
    },
    {
        timestamps: true
    }
);

var admins = mongoose.model('admins', AdminSchema);

module.exports = admins;