app.get("/matches", async (req,res)=>{
 try{
  let r = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=d28d8e50-fc20-441b-919c-861a9e1b306d&offset=0");
  let data = await r.json();

  let matches = data.data?.slice(0,5).map(m=>{
    let runs = m.score?.[0]?.r || Math.floor(Math.random()*200);
    let w = m.score?.[0]?.w || Math.floor(Math.random()*10);

    return {
      name: m.name,
      score: `${runs}/${w}`,
      status: m.status,
      oddsA: (1.5 + Math.random()).toFixed(2),
      oddsB: (1.5 + Math.random()).toFixed(2)
    };
  });

  // 👉 if API empty → fallback
  if(!matches || matches.length === 0){
    throw "no matches";
  }

  res.json(matches);

 }catch{
  // 🔥 ALWAYS SHOW FAKE MATCHES
  res.json([
    {name:"IND vs AUS",score:"120/3",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
    {name:"CSK vs MI",score:"90/2",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
    {name:"RCB vs KKR",score:"150/5",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)},
    {name:"ENG vs SA",score:"200/6",status:"Live",oddsA:(1.5+Math.random()).toFixed(2),oddsB:(1.5+Math.random()).toFixed(2)}
  ]);
 }
});
