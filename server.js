const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fetch = require("node-fetch");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// 🔗 MONGODB CONNECT
mongoose.connect("YOUR_MONGODB_URL")
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log(err));

// MODELS
const User = mongoose.model("User", {
  username: String,
  password: String,
  wallet: Number
});

const Deposit = mongoose.model("Deposit", {
  username: String,
  amount: Number,
  utr: String,
  status: String
});

const Withdraw = mongoose.model("Withdraw", {
  username: String,
  amount: Number,
  upi: String,
  status: String
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
  let {username,password}=req.body;

  if(await User.findOne({username}))
    return res.json({msg:"User exists"});

  await User.create({username,password,wallet:1000});
  res.json({msg:"Registered"});
});

// LOGIN
app.post("/login", async (req,res)=>{
  let {username,password}=req.body;

  let user=await User.findOne({username,password});
  if(!user) return res.json({msg:"Invalid"});

  req.session.user={username:user.username};
  res.json({msg:"Login success",wallet:user.wallet});
});

// USER
app.get("/me", async (req,res)=>{
  if(!req.session.user) return res.json({});

  let user=await User.findOne({username:req.session.user.username});
  res.json(user);
});

// MATCHES
app.get("/matches", async (req,res)=>{
 try{
  let r=await fetch("https://api.cricapi.com/v1/currentMatches?apikey=d28d8e50-fc20-441b-919c-861a9e1b306d&offset=0");
  let data=await r.json();

  let matches=data.data.slice(0,5).map(m=>{
    let runs=m.score?.[0]?.r||100;
    let w=m.score?.[0]?.w||2;

    return {
      name:m.name,
      score:`${runs}/${w}`,
      status:m.status,
      oddsA:(2-runs/200).toFixed(2),
      oddsB:(1+runs/200).toFixed(2)
    };
  });

  res.json(matches);
 }catch{
  res.json([]);
 }
});

// BET
app.post("/bet", async (req,res)=>{
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

 res.json({msg:result,balance:user.wallet});
});

// HISTORY
app.get("/history", async (req,res)=>{
 if(!req.session.user) return res.json([]);

 let data=await Bet.find({username:req.session.user.username}).sort({_id:-1});
 res.json(data);
});

// DEPOSIT
app.post("/deposit", async (req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 let {amount,utr}=req.body;

 await Deposit.create({
  username:req.session.user.username,
  amount,
  utr,
  status:"pending"
 });

 res.json({msg:"Deposit sent"});
});

// WITHDRAW
app.post("/withdraw", async (req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 let {amount,upi}=req.body;
 let user=await User.findOne({username:req.session.user.username});

 amount=Number(amount);

 if(amount<=0) return res.json({msg:"Invalid"});
 if(amount>user.wallet) return res.json({msg:"No balance"});

 user.wallet-=amount;
 await user.save();

 await Withdraw.create({
  username:user.username,
  amount,
  upi,
  status:"pending"
 });

 res.json({msg:"Withdraw sent"});
});

// ADMIN DEPOSITS
app.get("/admin/deposits", async (req,res)=>{
 res.json(await Deposit.find().sort({_id:-1}));
});

// APPROVE DEPOSIT
app.post("/admin/approve", async (req,res)=>{
 let d=await Deposit.findById(req.body.id);
 let user=await User.findOne({username:d.username});

 user.wallet+=d.amount;
 d.status="approved";

 await user.save();
 await d.save();

 res.json({msg:"Approved"});
});

// REJECT DEPOSIT
app.post("/admin/reject", async (req,res)=>{
 let d=await Deposit.findById(req.body.id);
 d.status="rejected";
 await d.save();

 res.json({msg:"Rejected"});
});

// ADMIN WITHDRAWS
app.get("/admin/withdraws", async (req,res)=>{
 res.json(await Withdraw.find().sort({_id:-1}));
});

// APPROVE WITHDRAW
app.post("/admin/withdraw-approve", async (req,res)=>{
 let w=await Withdraw.findById(req.body.id);
 w.status="approved";
 await w.save();

 res.json({msg:"Approved"});
});

// REJECT WITHDRAW
app.post("/admin/withdraw-reject", async (req,res)=>{
 let w=await Withdraw.findById(req.body.id);
 let user=await User.findOne({username:w.username});

 user.wallet+=w.amount;
 w.status="rejected";

 await user.save();
 await w.save();

 res.json({msg:"Rejected"});
});

app.listen(process.env.PORT||3001,"0.0.0.0");
