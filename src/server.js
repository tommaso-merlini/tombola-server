//IMPORTS

//=====node=====
const cron = require("node-cron");
const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 100000000,
    connectTimeout: 5000,
    transports: ['websocket'],
    pingInterval: 25 * 1000,
    pingTimeout: 5000,
    allowEIO3: true,
    cors: {
        origin: ["http://localhost:5000", 'https://admin.socket.io'],
        methods: ["GET", "POST"],
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
    app.get("/", (req, res) => {
        res.json({ serverstatus: "ok" });
    });

    app.post("/register", express.json(), async (req, res) => {
        try {
            const account = req.body;
            if (!account.name || !account.email || !account.password) {
                res.status(400);
                throw new Error("non sono stati inviati tutti i campi della registrazione");
            }

            hashedPassword = await bcrypt.hash(account.password, 2);
            console.log(hashedPassword);

            const user = new User({
                name: account.name,
                email: account.email,
                password: hashedPassword
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

    instrument(io, { auth: false });

    io.on('connection', function(socket) {
        console.log('A user connected');

        //Whenever someone disconnects this piece of code executed
        socket.on('disconnect', function() {
            console.log('A user disconnected');
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

    //=========Running this function everyday at 23:59=========
    cron.schedule("59 23 * * *", () => {
        console.log("---------------------");
        console.log("Running Cron Job");
        console.log("---------------------");
    });

    //============listening to port================
    app.listen(PORT, () => {
        console.log(
            chalk.bgGreen.black(
                `server ${process.pid} running on http://localhost:${PORT} :D`
            )
        );
    });
}
startServer();

