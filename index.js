/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

const dbFile = path.resolve(__dirname, "leaderboard.db");
const dbExists = fs.existsSync(dbFile);

const db = new sqlite3.Database(dbFile);

if (!dbExists) {
    db.serialize(() => {
        db.run("CREATE TABLE leaderboard (username TEXT, time INTEGER)");
    });
}

const whitelistedUsers = process.env.WHITELISTED_USERS.split(",");

// Redirect to login
app.get("/login", (req, res) => {
    res.redirect(process.env.LOGIN_URL);
});

// Handle callback
app.get("/callback", (req, res) => {
    const username = req.query.username;

    if (whitelistedUsers.includes(username)) {
        res.render("game", { username });
    } else {
        // deny access and redirect to homepage
        res.redirect(process.env.HOME_URL);
    }
});

// Save game time
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

// Display leaderboard
app.get("/", (req, res) => {
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
