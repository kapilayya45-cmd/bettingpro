const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
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

// 🔗 MONGODB
mongoose.connect("mongodb+srv://admin:123456@cluster0.ui0ovpg.mongodb.net/bettingDB?retryWrites=true&w=majority")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

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

// ROOT
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register", async (req,res)=>{
  let {username,password} = req.body;

  if(await User.findOne({username}))
    return res.json({msg:"User exists"});

  await User.create({username,password,wallet:1000});
  res.json({msg:"Registered"});
});

// LOGIN
app.post("/login", async (req,res)=>{
  let {username,password} = req.body;

  let user = await User.findOne({username,password});
  if(!user) return res.json({msg:"Invalid"});

  req.session.user = {username:user.username};
  res.json({msg:"Login success"});
});

// USER
app.get("/me", async (req,res)=>{
  if(!req.session.user) return res.json({});
  let user = await User.findOne({username:req.session.user.username});
  res.json(user);
});

// 🔥 FAKE LIVE MATCHES (NO API FAIL EVER)
app.get("/matches", (req,res)=>{
 res.json([
  {name:"IND vs AUS",score:"120/3",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"CSK vs MI",score:"90/2",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"RCB vs KKR",score:"150/5",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"ENG vs SA",score:"200/6",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)}
 ]);
});

// BET
app.post("/bet", async (req,res)=>{
  if(!req.session.user) return res.json({msg:"Login required"});

  let {amount,odds} = req.body;
  let user = await User.findOne({username:req.session.user.username});

  amount = Number(amount);

  if(amount<=0) return res.json({msg:"Invalid"});
  if(amount>user.wallet) return res.json({msg:"No balance"});

  user.wallet -= amount;

  let result="LOSE", win=0;

  if(Math.random()>0.5){
    win = amount * odds;
    user.wallet += win;
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
});

// HISTORY
app.get("/history", async (req,res)=>{
  if(!req.session.user) return res.json([]);
  let data = await Bet.find({username:req.session.user.username}).sort({_id:-1});
  res.json(data);
});

// DEPOSIT
app.post("/deposit", async (req,res)=>{
  if(!req.session.user) return res.json({msg:"Login required"});

  let {amount,utr} = req.body;

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

  let {amount,upi} = req.body;
  let user = await User.findOne({username:req.session.user.username});

  amount = Number(amount);

  if(amount<=0) return res.json({msg:"Invalid"});
  if(amount>user.wallet) return res.json({msg:"No balance"});

  user.wallet -= amount;
  await user.save();

  await Withdraw.create({
    username:user.username,
    amount,
    upi,
    status:"pending"
  });

  res.json({msg:"Withdraw sent"});
});

// PORT
app.listen(process.env.PORT || 3001, "0.0.0.0", ()=>{
  console.log("Server running");
});
// 🔐 SIMPLE ADMIN LOGIN (hardcoded)
const ADMIN_USER = "admin";
const ADMIN_PASS = "123";

// ADMIN LOGIN
app.post("/admin/login",(req,res)=>{
 let {username,password} = req.body;

 if(username===ADMIN_USER && password===ADMIN_PASS){
   req.session.admin = true;
   return res.json({msg:"Admin login success"});
 }

 res.json({msg:"Invalid"});
});

// CHECK ADMIN
app.get("/admin/me",(req,res)=>{
 if(req.session.admin) return res.json({ok:true});
 res.json({ok:false});
});

// GET DEPOSITS
app.get("/admin/deposits", async (req,res)=>{
 if(!req.session.admin) return res.json([]);

 let data = await Deposit.find().sort({_id:-1});
 res.json(data);
});

// APPROVE DEPOSIT
app.post("/admin/approve", async (req,res)=>{
 if(!req.session.admin) return res.json({msg:"No access"});

 let d = await Deposit.findById(req.body.id);
 let user = await User.findOne({username:d.username});

 user.wallet += d.amount;
 d.status="approved";

 await user.save();
 await d.save();

 res.json({msg:"Approved"});
});

// GET WITHDRAWS
app.get("/admin/withdraws", async (req,res)=>{
 if(!req.session.admin) return res.json([]);

 let data = await Withdraw.find().sort({_id:-1});
 res.json(data);
});

// APPROVE WITHDRAW
app.post("/admin/withdraw-approve", async (req,res)=>{
 if(!req.session.admin) return res.json({msg:"No access"});

 let w = await Withdraw.findById(req.body.id);
 w.status="approved";

 await w.save();
 res.json({msg:"Approved"});
});

// REJECT WITHDRAW
app.post("/admin/withdraw-reject", async (req,res)=>{
 if(!req.session.admin) return res.json({msg:"No access"});

 let w = await Withdraw.findById(req.body.id);
 let user = await User.findOne({username:w.username});

 user.wallet += w.amount;
 w.status="rejected";

 await user.save();
 await w.save();

 res.json({msg:"Rejected"});
});
