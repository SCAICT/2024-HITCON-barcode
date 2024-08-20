/** @format */

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());

db.serialize(() => {
    db.run("CREATE TABLE leaderboard (username TEXT, time INTEGER)");
});

const whitelistedUsers = process.env.WHITELISTED_USERS.split(",");

app.get("/", (req, res) => {
    res.redirect(process.env.LOGIN_URL);
});

app.get("/callback", (req, res) => {
    const username = req.query.username;

    if (whitelistedUsers.includes(username)) {
        res.render("game", { username });
    } else {
        res.status(403).send("Access Denied");
    }
});

app.post("/save-time", (req, res) => {
    const { username, time } = req.body;

    db.run(
        "INSERT INTO leaderboard (username, time) VALUES (?, ?)",
        [username, time],
        function (err) {
            if (err) {
                return res.status(500).send("Failed to save time");
            }
            res.send("Time saved");
        }
    );
});

app.get("/leaderboard", (req, res) => {
    db.all(
        "SELECT username, time FROM leaderboard ORDER BY time ASC",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).send("Failed to retrieve leaderboard");
            }
            res.render("leaderboard", { leaderboard: rows });
        }
    );
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
