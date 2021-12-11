const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        index: true
    },
    cartella: [{ type: Number, required: false }],
    numeri_usciti: [{ type: Number, required: false }]
});

const User = mongoose.model("user", UserSchema);
module.exports = User;
