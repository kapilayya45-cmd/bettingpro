app.get("/matches", async (req, res) => {
 try {
  let r = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=d28d8e50-fc20-441b-919c-861a9e1b306d&offset=0");
  let data = await r.json();

  let matches = data.data.slice(0,5).map(m => {

    let runs = m.score?.[0]?.r || 100;
    let w = m.score?.[0]?.w || 2;

    // 🔥 FAKE LIVE ODDS (random movement)
    let base = runs / 100;

    let oddsA = (1.5 + Math.random() + base/2).toFixed(2);
    let oddsB = (1.5 + Math.random() - base/2).toFixed(2);

    return {
      name: m.name,
      score: `${runs}/${w}`,
      status: m.status,
      oddsA,
      oddsB
    };
  });

  res.json(matches);

 } catch {
  res.json([]);
 }
});
