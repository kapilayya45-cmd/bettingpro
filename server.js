const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// TEMP STORAGE
let users = [];
let deposits = [];
let withdraws = [];

// ROOT
app.get("/", (req,res)=>{
 res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register",(req,res)=>{
 let {username,password} = req.body;

 if(users.find(u=>u.username===username))
  return res.json({msg:"User exists"});

 users.push({username,password,wallet:1000});
 res.json({msg:"Registered"});
});

// LOGIN
app.post("/login",(req,res)=>{
 let {username,password} = req.body;

 let user = users.find(u=>u.username===username && u.password===password);

 if(!user) return res.json({msg:"Invalid"});

 req.session.user = user;
 res.json({msg:"Login success"});
});

// USER
app.get("/me",(req,res)=>{
 if(!req.session.user) return res.json({});
 res.json(req.session.user);
});

// MATCHES (FAKE LIVE)
app.get("/matches",(req,res)=>{
 res.json([
  {name:"IND vs AUS",score:"120/3",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"CSK vs MI",score:"90/2",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
  {name:"RCB vs KKR",score:"150/5",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)}
 ]);
});

// DEPOSIT
app.post("/deposit",(req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 deposits.push({
  id:Date.now(),
  username:req.session.user.username,
  amount:req.body.amount,
  status:"pending"
 });

 res.json({msg:"Deposit sent"});
});

// WITHDRAW
app.post("/withdraw",(req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 withdraws.push({
  id:Date.now(),
  username:req.session.user.username,
  amount:req.body.amount,
  status:"pending"
 });

 res.json({msg:"Withdraw sent"});
});


// ================= ADMIN =================

// ADMIN LOGIN
app.post("/admin/login",(req,res)=>{
 if(req.body.username==="admin" && req.body.password==="123"){
  req.session.admin = true;
  res.json({msg:"Admin login success"});
 } else {
  res.json({msg:"Invalid"});
 }
});

// GET DEPOSITS
app.get("/admin/deposits",(req,res)=>{
 if(!req.session.admin) return res.json([]);
 res.json(deposits);
});

// APPROVE DEPOSIT
app.post("/admin/approve",(req,res)=>{
 let d = deposits.find(x=>x.id==req.body.id);
 let u = users.find(x=>x.username===d.username);

 u.wallet += Number(d.amount);
 d.status="approved";

 res.json({msg:"Approved"});
});

// GET WITHDRAWS
app.get("/admin/withdraws",(req,res)=>{
 if(!req.session.admin) return res.json([]);
 res.json(withdraws);
});

// APPROVE WITHDRAW
app.post("/admin/withdraw-approve",(req,res)=>{
 let w = withdraws.find(x=>x.id==req.body.id);
 w.status="approved";
 res.json({msg:"Approved"});
});

// REJECT WITHDRAW
app.post("/admin/withdraw-reject",(req,res)=>{
 let w = withdraws.find(x=>x.id==req.body.id);
 let u = users.find(x=>x.username===w.username);

 u.wallet += Number(w.amount);
 w.status="rejected";

 res.json({msg:"Rejected"});
});

// PORT
app.listen(process.env.PORT || 3001, ()=>{
 console.log("Server Running");
});
