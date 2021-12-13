const mongoose = require("mongoose");

const TableSchema = new mongoose.Schema({
    numeri_usciti: [{ type: Number, required: false }]
});

const Table = mongoose.model("table", TableSchema);
module.exports = Table;
