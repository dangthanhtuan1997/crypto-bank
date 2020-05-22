const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var PartnerSchema = new mongoose.Schema(
    {
        username: String,
        password: String,
        display_name: String,
        address: String,
        email: String,
        vouchers: [Schema.Types.ObjectId],
        games: [Schema.Types.ObjectId],
        avatar: {
            type: String,
            default: '/uploads/default_avatar.png'
        },
        role: { type: String, default: 'partner' }
    },
    {
        timestamps: true
    }
);

var partners = mongoose.model('partners', PartnerSchema);

module.exports = partners;