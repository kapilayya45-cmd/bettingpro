const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");

// ✅ SAFE FETCH (no crash)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ✅ SESSION
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// ✅ MONGODB SAFE CONNECT
mongoose.connect("mongodb+srv://admin:123456@cluster0.ui0ovpg.mongodb.net/bettingDB?retryWrites=true&w=majority")
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log("❌ DB Error:",err.message));

// MODELS
const User = mongoose.model("User", {
  username: String,
  password: String,
  wallet: Number
});

const Bet = mongoose.model("Bet", {
  username: String,
  amount: Number,
  odds: Number,
  result: String,
  win: Number,
  time: String
});

// ROOT
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register", async (req,res)=>{
 try{
  let {username,password}=req.body;

  if(await User.findOne({username}))
    return res.json({msg:"User exists"});

  await User.create({username,password,wallet:1000});
  res.json({msg:"Registered"});
 }catch{
  res.json({msg:"Error"});
 }
});

// LOGIN
app.post("/login", async (req,res)=>{
 try{
  let {username,password}=req.body;

  let user=await User.findOne({username,password});
  if(!user) return res.json({msg:"Invalid"});

  req.session.user={username:user.username};
  res.json({msg:"Login success"});
 }catch{
  res.json({msg:"Error"});
 }
});

// USER
app.get("/me", async (req,res)=>{
 try{
  if(!req.session.user) return res.json({});
  let user=await User.findOne({username:req.session.user.username});
  res.json(user);
 }catch{
  res.json({});
 }
});

// 🔥 FAKE LIVE ODDS
app.get("/matches", async (req,res)=>{
 try{
  let r=await fetch("https://api.cricapi.com/v1/currentMatches?apikey=d28d8e50-fc20-441b-919c-861a9e1b306d&offset=0");
  let data=await r.json();

  let matches=data.data?.slice(0,5).map(m=>{
    let runs=m.score?.[0]?.r||100;
    let w=m.score?.[0]?.w||2;

    let base=runs/100;

    return {
      name:m.name,
      score:`${runs}/${w}`,
      status:m.status,
      oddsA:(1.5+Math.random()+base/2).toFixed(2),
      oddsB:(1.5+Math.random()-base/2).toFixed(2)
    };
  }) || [];

  res.json(matches);
 }catch(err){
  console.log("Match Error:",err.message);
  res.json([]);
 }
});

// BET
app.post("/bet", async (req,res)=>{
 try{
  if(!req.session.user) return res.json({msg:"Login required"});

  let {amount,odds}=req.body;
  let user=await User.findOne({username:req.session.user.username});

  amount=Number(amount);

  if(amount<=0) return res.json({msg:"Invalid"});
  if(amount>user.wallet) return res.json({msg:"No balance"});

  user.wallet-=amount;

  let result="LOSE",win=0;

  if(Math.random()>0.5){
    win=amount*odds;
    user.wallet+=win;
    result="WIN";
  }

  await user.save();

  await Bet.create({
    username:user.username,
    amount,
    odds,
    result,
    win,
    time:new Date().toLocaleString()
  });

  res.json({msg:result});
 }catch{
  res.json({msg:"Error"});
 }
});

// HISTORY
app.get("/history", async (req,res)=>{
 try{
  if(!req.session.user) return res.json([]);

  let data=await Bet.find({username:req.session.user.username}).sort({_id:-1});
  res.json(data);
 }catch{
  res.json([]);
 }
});

// ✅ PORT FIX
app.listen(process.env.PORT || 3001, "0.0.0.0", ()=>{
  console.log("🚀 Server running");
});
