/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const path = require("path");
const cookieParser = require("cookie-parser");
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("public"));
app.set("view engine", "ejs");

const dbFile = path.resolve(__dirname, "leaderboard.db");
const db = new sqlite3.Database(dbFile);

let sessionTokens = {};
let users = [];
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            username TEXT, 
            time INTEGER
        )
    `);
});

//const whitelistedUsers = process.env.WHITELISTED_USERS.split(",");

// Redirect to login
app.get("/login", (req, res) => {
    res.redirect(process.env.LOGIN_URL);
});

// Handle callback
app.get("/callback", (req, res) => {
    console.log(req.query);
    // http://localhost:3000/callback?username=elvismao&user_id=685630394431045863&avatar=https%3A%2F%2Fcdn.discordapp.com%2Favatars%2F685630394431045863%2Fa5344f225a7f95da57294a9e1ca73711.png&email=info%40elvismao.com&headers={%27Authorization%27%3A+%27Bearer+5c1gRkHUAD5WHW53uWBApa5CWBsv6F%27}
    const username = req.query.username + "";
    // if (whitelistedUsers.includes(username) || true) {
    const token = Math.random().toString(36).substring(2);
    // get all response cookie and set it to sessionTokens
    const cookies = req.headers["set-cookie"];
    sessionTokens[token] = { username, cookies };
    res.cookie("token", token).redirect("/");
    // } else {
    //     res.redirect("/");
    // }
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
            axios
                .get(
                    "https://store.scaict.org/api/send/" +
                        discordID +
                        "?gift_type=電電點&count=50",
                    {
                        headers: {
                            Cookie: sessionTokens[req.cookies.token].cookies,
                        },
                    }
                )
                .then(response => {
                    console.log(response.data);
                    res.send("獎勵已領取，請留意獎品通知！");
                })
                .catch(error => {
                    res.status(500).send("Failed to fetch user list");
                });
        }
    );
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    // remove token in sessionTokens
    delete sessionTokens[req.cookies.token];
    res.redirect("/");
});

// userList
app.get("/userList", (req, res) => {
    if (!req.cookies.token || !sessionTokens[req.cookies.token]) {
        return res.status(401).send("Unauthorized");
    }
    //http fetch
    axios
        .get("https://store.scaict.org/api/mlist", {
            headers: {
                Cookie: sessionTokens[req.cookies.token].cookies,
            },
        })
        .then(response => {
            //[{"avatar":null,"banner":null,"communication_disabled_until":null,"deaf":false,"flags":0,"joined_at":"2023-06-15T09:29:00.872000+00:00","mute":false,"nick":null,"pending":false,"premium_since":null,"roles":[],"unusual_dm_activity_until":null,"user":{"accent_color":null,"avatar":"2e19d921df3077268f1546acb3bcad65","avatar_decoration_data":{"asset":"a_c7e1751e8122f1b475cb3006966fb28c","expires_at":null,"sku_id":"1154896005045694555"},"banner":null,"banner_color":null,"clan":null,"discriminator":"0","flags":128,"global_name":"seadog007","id":"87943724490821632","public_flags":128,"username":"seadog007"}},{"avatar":null,"banner":null,"communication_disabled_until":null,"deaf":false,"flags":98,"joined_at":"2024-03-09T04:48:44.637000+00:00","mute":false,"nick":null,"pending":false,"premium_since":null,"roles":["1217266608247017472","1217267051115319307","1217276170052173967","1217266468404596856","1217266030754398270"],"unusual_dm_activity_until":null,"user":
            // get avatar, username, id
            response.data = response.data.map(user => {
                return {
                    avatar: user.avatar,
                    username: user.user.username,
                    id: user.user.id,
                };
            });
            users = response.data;
            res.send(users);
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
            // turn each time into a string in format of mm:ss.sss
            rows = rows.map(row => {
                const minutes = Math.floor(row.time / 60000);
                const seconds = ((row.time % 60000) / 1000).toFixed(3);
                return {
                    username: row.username,
                    time: `${minutes}:${seconds.padStart(6, "0")}`,
                    avatar: users.find(user => user.username === row.username)
                };
            });
            if (err) {
                return res.status(500).send("Failed to retrieve leaderboard");
            }
            // get username from session
            if (!req.cookies.token || !sessionTokens[req.cookies.token]) {
                return res.render("leaderboard", {
                    leaderboard: rows,
                    username: null,
                });
            }
            var username = sessionTokens[req.cookies.token].username;
            res.render("leaderboard", {
                leaderboard: rows,
                username,
            });
        }
    );
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
