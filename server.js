const express = require("express");
const cors = require("cors");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// ✅ SESSION FIX
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: "lax"
  }
}));

// 🔥 TEMP STORAGE (NO DB)
let users = [];
let bets = [];

// ROOT
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register",(req,res)=>{
  let {username,password} = req.body;

  let exists = users.find(u=>u.username===username);
  if(exists) return res.json({msg:"User exists"});

  users.push({username,password,wallet:1000});
  res.json({msg:"Registered"});
});

// LOGIN
app.post("/login",(req,res)=>{
  let {username,password} = req.body;

  let user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.json({msg:"Invalid"});

  req.session.user = {username:user.username};
  res.json({msg:"Login success"});
});

// USER
app.get("/me",(req,res)=>{
  if(!req.session.user) return res.json({});

  let user = users.find(u=>u.username===req.session.user.username);
  res.json(user || {});
});

// MATCHES (SAFE API)
app.get("/matches", async (req,res)=>{
 try{

  const response = await axios.get(
   "https://cricketapi12.p.rapidapi.com/api/cricket/tournament/11160/schedules/15/11/2024",
   {
    headers:{
     "X-RapidAPI-Key":"bd9714a581mshd9d62be37c57d10p165815jsnda58165bf017",
     "X-RapidAPI-Host":"cricketapi12.p.rapidapi.com"
    },
    timeout:5000
   }
  );

  let data = response.data?.events || [];

  let matches = data.map(m=>({
    name: m.homeTeam?.name + " vs " + m.awayTeam?.name,
    score: (m.homeScore?.display || 0) + " - " + (m.awayScore?.display || 0),
    oddsA:(1.5+Math.random()).toFixed(2),
    oddsB:(1.5+Math.random()).toFixed(2)
  }));

  res.json(matches);

 }catch(e){
  console.log("API ERROR:", e.message);

  res.json([
    {name:"Demo Match",score:"0-0",oddsA:"1.8",oddsB:"2.1"}
  ]);
 }
});

// BET
app.post("/bet",(req,res)=>{
  if(!req.session.user) return res.json({msg:"Login required"});

  let {amount,odds,match} = req.body;
  amount = Number(amount);

  let user = users.find(u=>u.username===req.session.user.username);

  if(user.wallet < amount){
    return res.json({msg:"Insufficient balance"});
  }

  user.wallet -= amount;

  let result;
  if(Math.random()>0.5){
    let win = amount * odds;
    user.wallet += win;
    result="WIN 🎉";
  }else{
    result="LOSE ❌";
  }

  bets.push({username:user.username,match,amount,odds,result});

  res.json({msg:result});
});

// 🔥 CRASH PROTECTION
process.on("uncaughtException", err=>{
  console.log("ERROR:", err.message);
});

app.listen(process.env.PORT || 3001,()=>{
  console.log("Server Running");
});
