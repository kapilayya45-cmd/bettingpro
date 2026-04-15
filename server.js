const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// 🔥 MONGODB CONNECT (CHANGE PASSWORD HERE)
mongoose.connect("mongodb+srv://admin:YOUR_PASSWORD@cluster0.ui0ovpg.mongodb.net/betting?retryWrites=true&w=majority")
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log("❌ DB Error:",err));

// ================= SCHEMA =================

const User = mongoose.model("User",{
  username:String,
  password:String,
  wallet:{type:Number,default:1000}
});

const Bet = mongoose.model("Bet",{
  username:String,
  match:String,
  amount:Number,
  odds:Number,
  result:String
});

const Deposit = mongoose.model("Deposit",{
  username:String,
  amount:Number,
  status:String
});

const Withdraw = mongoose.model("Withdraw",{
  username:String,
  amount:Number,
  status:String
});

// ================= ROUTES =================

// ROOT
app.get("/",(req,res)=>{
 res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register",async(req,res)=>{
 try{
  let {username,password} = req.body;

  let exists = await User.findOne({username});
  if(exists) return res.json({msg:"User exists"});

  await User.create({username,password});
  res.json({msg:"Registered"});
 }catch(e){
  res.json({msg:"Error"});
 }
});

// LOGIN
app.post("/login",async(req,res)=>{
 try{
  let {username,password} = req.body;

  let user = await User.findOne({username,password});
  if(!user) return res.json({msg:"Invalid"});

  req.session.user = user;
  res.json({msg:"Login success"});
 }catch{
  res.json({msg:"Server error"});
 }
});

// USER
app.get("/me",(req,res)=>{
 if(!req.session.user) return res.json({});
 res.json(req.session.user);
});

// MATCHES
app.get("/matches",(req,res)=>{
 res.json([
  {name:"IND vs AUS",score:"120/3",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"CSK vs MI",score:"90/2",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"RCB vs KKR",score:"150/5",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)}
 ]);
});

// BET
app.post("/bet",async(req,res)=>{
 try{
  if(!req.session.user) return res.json({msg:"Login required"});

  let {amount,odds,match} = req.body;
  amount = Number(amount);

  let user = await User.findOne({username:req.session.user.username});

  if(user.wallet < amount){
    return res.json({msg:"Insufficient balance"});
  }

  user.wallet -= amount;

  let result;

  if(Math.random()>0.5){
    let win = amount * odds;
    user.wallet += win;
    result="WIN";
  }else{
    result="LOSE";
  }

  await user.save();

  await Bet.create({
    username:user.username,
    match,
    amount,
    odds,
    result
  });

  res.json({msg:result});
 }catch{
  res.json({msg:"Bet error"});
 }
});

// HISTORY
app.get("/history",async(req,res)=>{
 if(!req.session.user) return res.json([]);

 let data = await Bet.find({username:req.session.user.username});
 res.json(data);
});

// DEPOSIT
app.post("/deposit",async(req,res)=>{
 try{
  if(!req.session.user) return res.json({msg:"Login required"});

  await Deposit.create({
    username:req.session.user.username,
    amount:Number(req.body.amount),
    status:"pending"
  });

  res.json({msg:"Deposit sent"});
 }catch{
  res.json({msg:"Error"});
 }
});

// WITHDRAW
app.post("/withdraw",async(req,res)=>{
 try{
  if(!req.session.user) return res.json({msg:"Login required"});

  let user = await User.findOne({username:req.session.user.username});
  let amt = Number(req.body.amount);

  if(user.wallet < amt){
    return res.json({msg:"Insufficient"});
  }

  user.wallet -= amt;
  await user.save();

  await Withdraw.create({
    username:user.username,
    amount:amt,
    status:"pending"
  });

  res.json({msg:"Withdraw sent"});
 }catch{
  res.json({msg:"Error"});
 }
});

// ================= ADMIN =================

// LOGIN
app.post("/admin/login",(req,res)=>{
 if(req.body.username==="admin" && req.body.password==="123"){
  req.session.admin=true;
  res.json({msg:"Admin login success"});
 }else{
  res.json({msg:"Invalid"});
 }
});

// DEPOSITS
app.get("/admin/deposits",async(req,res)=>{
 if(!req.session.admin) return res.json([]);
 let data = await Deposit.find().sort({_id:-1});
 res.json(data);
});

// APPROVE DEPOSIT
app.post("/admin/approve",async(req,res)=>{
 let d = await Deposit.findById(req.body.id);
 let user = await User.findOne({username:d.username});

 user.wallet += d.amount;
 d.status="approved";

 await user.save();
 await d.save();

 res.json({msg:"Approved"});
});

// WITHDRAWS
app.get("/admin/withdraws",async(req,res)=>{
 if(!req.session.admin) return res.json([]);
 let data = await Withdraw.find().sort({_id:-1});
 res.json(data);
});

// APPROVE WITHDRAW
app.post("/admin/withdraw-approve",async(req,res)=>{
 let w = await Withdraw.findById(req.body.id);
 w.status="approved";
 await w.save();
 res.json({msg:"Approved"});
});

// REJECT WITHDRAW
app.post("/admin/withdraw-reject",async(req,res)=>{
 let w = await Withdraw.findById(req.body.id);
 let user = await User.findOne({username:w.username});

 user.wallet += w.amount;
 w.status="rejected";

 await user.save();
 await w.save();

 res.json({msg:"Rejected"});
});

// SERVER
app.listen(process.env.PORT || 3001,()=>{
 console.log("🔥 Server Running");
});
