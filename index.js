/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const path = require("path");
const cookieParser = require("cookie-parser");
ㄣ
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("public"));
app.set("view engine", "ejs");

const dbFile = path.resolve(__dirname, "leaderboard.db");
const db = new sqlite3.Database(dbFile);

let sessionTokens = {};
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            username TEXT, 
            time INTEGER
        )
    `);
});

const whitelistedUsers = process.env.WHITELISTED_USERS.split(",");

// Redirect to login
app.get("/login", (req, res) => {
    res.redirect(process.env.LOGIN_URL);
});

// Handle callback
app.get("/callback", (req, res) => {
    const { username, discordID, profilePic } = req.query;
    if (whitelistedUsers.includes(username)) {
        const token = Math.random().toString(36).substring(2);
        sessionTokens[token] = { username, discordID, profilePic };
        res.cookie("token", token).redirect("/");
    } else {
        res.redirect("/");
    }
});

app.get("/game", (req, res) => {
    const token = req.cookies.token;
    if (token && sessionTokens[token]) {
        res.render("game");
    } else {
        res.redirect("/");
    }
});

// Save game time
app.post("/save-time", (req, res) => {
    const { discordID, gameTime } = req.body;
    db.run(
        "INSERT INTO leaderboard (username, time) VALUES (?, ?)",
        [discordID, gameTime],
        function (err) {
            if (err) {
                return res.status(500).send("領取獎勵失敗");
            }
            res.send("獎勵已領取，請留意獎品通知！");
        }
    );
});

// userList
app.get("/userList", (req, res) => {
    if (!req.cookies.token || !sessionTokens[req.cookies.token]) {
        return res.status(401).send("Unauthorized");
    }
    //http fetch
    axios
        .get("https://api.github.com/users")
        .then(response => {
            res.send(response.data);
        })
        .catch(error => {
            res.status(500).send("Failed to fetch user list");
        });
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
            var username = sessionTokens[req.cookies.token];
            res.render("leaderboard", {
                leaderboard: rows,
                username,
            });
        }
    );
});

app.get("logout", (req, res) => {
    res.clearCookie("token");
    // remove token in sessionTokens
    delete sessionTokens[req.cookies.token];
    res.redirect(process.env.LOGOUT_URL);
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
