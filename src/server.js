//IMPORTS

//=====node=====
const cron = require("node-cron");
const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");

//=====misc=====
const chalk = require("chalk"); //console.log colors
require("dotenv").config();
const cors = require("cors");
app.use(cors());

//=====redis=====
const redis = require('redis');

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

    app.get("/register", (req, res) => {
        const account = req.params;
        console.log(account);
        if (!account.name || !account.email || !account.password) {
            res.status(400);
            res.send("non sono stati inviati tutti i campi della registrazione");
        }

        res.send("bene");
    });

    //=========Running this function everyday at 23:59=========
    cron.schedule("59 23 * * *", () => {
        console.log("---------------------");
        console.log("Running Cron Job");
        console.log("---------------------");
    });

    //==========redisclient===================

    const client = redis.createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();


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

