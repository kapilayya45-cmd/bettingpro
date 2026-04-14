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

let users = [];
let deposits = [];
let bets = [];

const ADMIN_PASS = "1234";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// REGISTER
app.post("/register", (req, res) => {
  let { username, password } = req.body;
  if (users.find(u=>u.username===username))
    return res.json({msg:"User exists"});

  users.push({username,password,wallet:1000});
  res.json({msg:"Registered"});
});

// LOGIN
app.post("/login", (req, res) => {
  let { username,password } = req.body;
  let user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.json({msg:"Invalid"});

  req.session.user=user;
  res.json({msg:"Login success",wallet:user.wallet});
});

// USER
app.get("/me",(req,res)=>{
  if(!req.session.user) return res.json({});
  res.json(req.session.user);
});

// LOGOUT
app.get("/logout",(req,res)=>{
  req.session.destroy();
  res.json({msg:"Logout"});
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
app.post("/bet",(req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 let {amount,odds}=req.body;
 let user=req.session.user;

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

 bets.push({
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
app.get("/history",(req,res)=>{
 if(!req.session.user) return res.json([]);
 let data=bets.filter(b=>b.username===req.session.user.username);
 res.json(data.reverse());
});

// DEPOSIT
app.post("/deposit",(req,res)=>{
 if(!req.session.user) return res.json({msg:"Login required"});

 let {amount,utr}=req.body;

 deposits.push({
  username:req.session.user.username,
  amount,
  utr,
  status:"pending"
 });

 res.json({msg:"Deposit sent"});
});

// ADMIN
app.get("/admin/deposits",(req,res)=>{
 if(req.query.pass!==ADMIN_PASS) return res.json({msg:"Unauthorized"});
 res.json(deposits);
});

app.post("/admin/approve",(req,res)=>{
 let {pass,index}=req.body;
 if(pass!==ADMIN_PASS) return res.json({msg:"Unauthorized"});

 let d=deposits[index];
 let user=users.find(u=>u.username===d.username);

 user.wallet+=Number(d.amount);
 d.status="approved";

 res.json({msg:"Approved"});
});

app.post("/admin/reject",(req,res)=>{
 let {pass,index}=req.body;
 if(pass!==ADMIN_PASS) return res.json({msg:"Unauthorized"});

 deposits[index].status="rejected";
 res.json({msg:"Rejected"});
});

app.listen(process.env.PORT||3001,"0.0.0.0");
