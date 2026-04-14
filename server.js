const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// 👤 USERS
let users = [];

// 💳 DEPOSITS
let deposits = [];

// ROOT
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// REGISTER
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  let exists = users.find(u => u.username === username);
  if (exists) return res.json({ msg: "User exists" });

  users.push({ username, password, wallet: 1000 });
  res.json({ msg: "Registered!" });
});

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  let user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ msg: "Invalid" });

  req.session.user = user;
  res.json({ msg: "Login success", wallet: user.wallet });
});

// USER
app.get("/me", (req, res) => {
  if (!req.session.user) return res.json({});
  res.json(req.session.user);
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ msg: "Logged out" });
});

// 🔴 LIVE MATCHES (CRICAPI)
app.get("/matches", async (req, res) => {
  try {
    const url = "https://api.cricapi.com/v1/currentMatches?apikey=d28d8e50-fc20-441b-919c-861a9e1b306d&offset=0";

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.json([
        { id:"1", name:"IND vs AUS", score:"120/2", status:"Live", oddsA:1.8, oddsB:2.0 }
      ]);
    }

    const matches = data.data.slice(0,5).map(m => {
      let runs = m.score?.[0]?.r || 100;
      let wickets = m.score?.[0]?.w || 2;

      return {
        id: m.id,
        name: m.name,
        score: `${runs}/${wickets}`,
        status: m.status,
        oddsA: (2 - runs/200).toFixed(2),
        oddsB: (1 + runs/200).toFixed(2)
      };
    });

    res.json(matches);

  } catch {
    res.json([
      { id:"1", name:"Error Match", score:"100/2", status:"Error", oddsA:1.9, oddsB:1.9 }
    ]);
  }
});

// 💰 BET SYSTEM
app.post("/bet", (req, res) => {
  if (!req.session.user) return res.json({ msg: "Login required" });

  let { amount, odds } = req.body;
  let user = req.session.user;

  amount = Number(amount);

  if (amount <= 0) return res.json({ msg: "Invalid amount" });
  if (amount > user.wallet) return res.json({ msg: "Insufficient balance" });

  user.wallet -= amount;

  let result = "LOSE";

  if (Math.random() > 0.5) {
    let win = amount * odds;
    user.wallet += win;
    result = "WIN";
  }

  res.json({ msg: result, balance: user.wallet });
});

// 💳 DEPOSIT REQUEST
app.post("/deposit", (req, res) => {
  if (!req.session.user) return res.json({ msg: "Login required" });

  let { amount, utr } = req.body;

  deposits.push({
    username: req.session.user.username,
    amount: Number(amount),
    utr,
    status: "pending"
  });

  res.json({ msg: "Deposit request sent" });
});

// ✅ ADMIN APPROVE
app.get("/approve", (req, res) => {
  deposits.forEach(d => {
    if (d.status === "pending") {
      let user = users.find(u => u.username === d.username);
      if (user) {
        user.wallet += d.amount;
        d.status = "approved";
      }
    }
  });

  res.json({ msg: "All deposits approved" });
});

// PORT
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Running on " + PORT);
});
