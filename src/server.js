//IMPORTS

//=====node=====
const cron = require("node-cron");
const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const http = require('http').createServer(app);
const io = require("socket.io")(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});



const bcrypt = require('bcrypt');
const { instrument } = require('@socket.io/admin-ui');
const mongoose = require("mongoose");

//=======models=========
const User = require("./models/User.model.js");

//=====misc=====
const chalk = require("chalk"); //console.log colors
require("dotenv").config();
const cors = require("cors");
//app.use(cors());


//COSTANTS
const PORT = process.env.SERVER_PORT;

//limit the amount of requests
app.set("trust proxy", 1);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // every 15 minutes
    max: process.env.NODE_ENV != "production" ? 10000 : 1, // limit each IP to 50 requests per windowMs
    message: "Too many requests to the server, try again later",
});

//  apply to all requests
app.use(limiter);

//!======server instance======

async function startServer() {

    //variables
    const classifica = [];
    const numer_usciti = [];
    var numero_casuale;

    app.get("/", (req, res) => {
        res.json({ serverstatus: "ok" });
    });

    app.post("/register", express.json(), async (req, res) => {
        try {
            const account = req.body;
            if (!account.nome || !account.email || !account.password) {
                res.status(400);
                throw new Error("non sono stati inviati tutti i campi della registrazione");
            }

            hashedPassword = await bcrypt.hash(account.password, 2);
            console.log(hashedPassword);

            const user = new User({
                nome: account.nome,
                email: account.email,
                password: hashedPassword,
                cartella: [],
                numeri_usciti: []
            });
            user.save();

            res.send("bene");
        } catch (e) {
            res.send(e.message);
        }

    });

    app.post("/login", express.json(), async (req, res) => {
        try {
            const user = await User.findOne({ email: req.body.email });
            const isEqual = await bcrypt.compare(req.body.password, user.password);
            if (!isEqual) throw new Error("password errata");
            res.send("bene");
        } catch (e) {
            res.status(403);
            res.send(e.message);
        }
    });

    //instrument(io, { auth: false });

    io.on('connection', (socket) => {
        console.log('user connected');

        socket.on("numero_uguale", async ({ id, nome, numero }) => {
            const utente = await User.findById(id);
            console.log(utente);
            const numeri_uscitiUtente = utente.numeri_usciti;
            console.log(numeri_uscitiUtente);
            const utenteAggiornato = await User.updateOne({ _id: id }, { numeri_usciti: [...numeri_uscitiUtente, numero] })
        });

        //Whenever someone disconnects this piece of code executed
        socket.on('disconnect', function() {
            console.log('user disconnected');
        });
    });

    //==========mongoose==============
    mongoose
        .connect(process.env.MONGO_ATLAS_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true,
        })
        .catch((err) => {
            console.log(err.message);
        });

    mongoose.connection.on("error", (err) => {
        console.log(err.message);
    });

    process.on("SIGINT", async () => {
        await mongoose.connection.close();
        process.exit(0);
    });

    //=========nuovo numero ogni 10 secondi=========
    cron.schedule("*/10 * * * * *", () => {
        numero_casuale = Math.floor(Math.random() * (100 - 1 + 1)) + 1;

        console.log("---------------------");
        console.log(`numero uscito: ${numero_casuale}`);
        console.log("---------------------");

        io.sockets.emit("nuovo_numero", numero_casuale);

    });

    //============listening to port================
    http.listen(PORT, () => {
        console.log(
            chalk.bgGreen.black(
                `server ${process.pid} running on http://localhost:${PORT} :D`
            )
        );
    });
}
startServer();

