const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
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
});

const User = mongoose.model("user", UserSchema);
module.exports = User;
