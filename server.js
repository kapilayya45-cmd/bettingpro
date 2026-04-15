const express = require("express");
const cors = require("cors");
const session = require("express-session");

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// 🧠 TEMP USERS (NO DB)
let users = [];

// ROOT
app.get("/", (req,res)=>{
  res.send("Server Running");
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

 req.session.user = user;
 res.json({msg:"Login success"});
});

// USER
app.get("/me",(req,res)=>{
 if(!req.session.user) return res.json({});
 res.json(req.session.user);
});

// MATCHES
app.get("/matches",(req,res)=>{
 res.json([
  {name:"IND vs AUS",score:"120/3",oddsA:"1.8",oddsB:"2.1"},
  {name:"CSK vs MI",score:"90/2",oddsA:"1.6",oddsB:"2.3"}
 ]);
});

// ADMIN LOGIN
app.post("/admin/login",(req,res)=>{
 if(req.body.username==="admin" && req.body.password==="123"){
  res.json({msg:"Admin login success"});
 }else{
  res.json({msg:"Invalid"});
 }
});

// PORT
app.listen(process.env.PORT || 3001, ()=>{
 console.log("Server running");
});
