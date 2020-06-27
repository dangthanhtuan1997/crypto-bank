const mongoose = require('mongoose');

var otpSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    transaction_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, expires: 5 * 60 }
});

var otps = mongoose.model('otps', otpSchema);
module.exports = otps;