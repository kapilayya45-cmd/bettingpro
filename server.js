const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// ✅ TRUST PROXY (Render kosam)
app.set("trust proxy", 1);

// ✅ CORS FIX
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// ✅ SESSION FIX (MOST IMPORTANT)
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: "none"
  }
}));

// 🔗 MONGODB (PASSWORD CHANGE CHEYYI)
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

// ================= ROUTES =================

// ROOT
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

// REGISTER
app.post("/register",async(req,res)=>{
  let {username,password} = req.body;

  let exists = await User.findOne({username});
  if(exists) return res.json({msg:"User exists"});

  await User.create({username,password});
  res.json({msg:"Registered"});
});

// LOGIN
app.post("/login",async(req,res)=>{
  let {username,password} = req.body;

  let user = await User.findOne({username,password});
  if(!user) return res.json({msg:"Invalid"});

  req.session.user = {username:user.username};
  res.json({msg:"Login success"});
});

// USER
app.get("/me",async(req,res)=>{
  if(!req.session.user) return res.json({});

  let user = await User.findOne({username:req.session.user.username});
  res.json(user);
});

// MATCHES
app.get("/matches", async (req,res)=>{
 try{

  const response = await axios.get(
   "https://cricket-live-data.p.rapidapi.com/matches",
   {
    headers:{
     "X-RapidAPI-Key":"bd9714a581mshd9d62be37c57d10p165815jsnda58165bf017",
     "X-RapidAPI-Host":"cricket-live-data.p.rapidapi.com"
    }
   }
  );

  let data = response.data.results || [];

  let matches = data.map(m=>({
    name: m.team1 + " vs " + m.team2,
    score: m.score || "Live",
    oddsA:(1.5+Math.random()).toFixed(2),
    oddsB:(1.5+Math.random()).toFixed(2)
  }));

  res.json(matches);

 }catch(e){
  console.log("API ERROR:", e.message);
  res.json([]);
 }
});

// BET
app.post("/bet",async(req,res)=>{
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
    result="WIN 🎉";
  }else{
    result="LOSE ❌";
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
});

// ================= SERVER =================

app.listen(process.env.PORT || 3001,()=>{
  console.log("🔥 Server Running");
});
