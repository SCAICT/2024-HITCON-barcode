/** @format */

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/:view", (req, res) => {
    const viewPath = path.join(__dirname, "views", `${req.params.view}.ejs`);
    if (fs.existsSync(viewPath)) {
        res.render(req.params.view);
    } else {
        res.status(404).render("404");
        console.log(`404: ${req.url}`);
    }
});

app.use((req, res) => {
    console.log(`404: ${req.url}`);
    res.status(404).render("404");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
