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
const mongoose = require("mongoose");

//=======models=========
const User = require("./models/User.js");
const Table = require("./models/Table.js");

//=====misc=====
const chalk = require("chalk"); //console.log colors
require("dotenv").config();
const cors = require("cors");
app.use(cors());


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
    var numero_casuale;
    var numeri_usciti;
    var tabellone;
    const numeri_tabellone = 10;

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




    const tabelloniCreati = await Table.find();
    if (tabelloniCreati.length === 0) {
        tabellone = await new Table({ numeri_usciti: [] })
        tabellone = await tabellone.save();
        console.log(tabellone);
    } else {
        tabellone = tabelloniCreati[0];
    }

    app.get("/", (req, res) => {
        res.json({ serverstatus: "ok" });
    });


    //===========api===============
    app.post("/register", express.json(), async (req, res) => {
        try {
            const account = req.body;
            if (!account.nome || !account.email || !account.password) {
                res.status(400);
                throw new Error("non sono stati inviati tutti i campi della registrazione");
            }

            hashedPassword = await bcrypt.hash(account.password, 2);
            console.log(hashedPassword);

            const user = await new User({
                nome: account.nome,
                email: account.email,
                password: hashedPassword,
                cartella: [],
                numeri_usciti: []
            });
            await user.save();

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

    //==================socket====================
    //instrument(io, { auth: false });

    io.on('connection', (socket) => {
        console.log('user connected');

        socket.on("numero_uguale", async ({ id, nome, numero }) => {
            const utente = await User.findById(id);
            console.log(utente);
            const numeri_uscitiUtente = utente.numeri_usciti;
            console.log(numeri_uscitiUtente);
            const utenteAggiornato = await User.updateOne({ _id: id }, { numeri_usciti: [...numeri_uscitiUtente, numero] })

            //TODO: aggiornare la classifica
        });

        //Whenever someone disconnects this piece of code executed
        socket.on('disconnect', function() {
            console.log('user disconnected');
        });
    });



    //=========nuovo numero ogni 10 secondi=========
    cron.schedule("*/2 * * * * *", async () => {
        numero_casuale = Math.floor(Math.random() * (numeri_tabellone - 1 + 1)) + 1;

        tabellone = await Table.findById(tabellone._id);
        numeri_usciti = tabellone.numeri_usciti;
        console.log("---------------------");
        console.log(`numeri usciti: ${numeri_usciti}`);
        console.log("---------------------");

        if (numeri_usciti.length === numeri_tabellone) {
            console.log("numeri finiti");
            io.sockets.emit("numeri_finiti", true);
        }

        //aggiungere numeri usciti in un array e vedere se il numero non e' gia uscito
        if (numeri_usciti.indexOf(numero_casuale) === -1) {
            await Table.updateOne({ _id: tabellone._id }, { numeri_usciti: [...numeri_usciti, numero_casuale] });
            console.log("---------------------");
            console.log(`numero uscito: ${numero_casuale}`);
            console.log("---------------------");
            io.sockets.emit("nuovo_numero", numero_casuale);
        } else {
            console.log("numero uguale");
        }
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

