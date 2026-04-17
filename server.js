const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ✅ Node 18+ lo fetch direct available (node-fetch vaddu)

app.get("/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://cricketapi12.p.rapidapi.com/api/cricket/matches",
      {
        headers: {
          "X-RapidAPI-Key": "bd9714a581mshd9d62be37c57d10p165815jsnda58165bf017",
          "X-RapidAPI-Host": "cricketapi12.p.rapidapi.com",
        },
      }
    );

    const data = await response.json();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "API failed", details: err.toString() });
  }
});

// ✅ ROOT route (IMPORTANT for Render)
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
