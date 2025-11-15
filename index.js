const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const MAX = { A: 6, B: 6, C: 6, D: 7 };
let count = { A: 0, B: 0, C: 0, D: 0 };

function assignTeam() {
  const available = Object.keys(MAX).filter(t => count[t] < MAX[t]);
  if (available.length === 0) return null;

  const team = available[Math.floor(Math.random() * available.length)];
  count[team]++;
  return team;
}

app.get("/", (req, res) => {
  res.send("API is running");
});

app.post("/assign", (req, res) => {
  const name = req.body.name || "noname";
  const team = assignTeam();

  if (!team) {
    return res.json({ ok: false, error: "全枠埋まりました" });
  }

  res.json({ ok: true, team, count, max: MAX });
});

app.get("/status", (req, res) => {
  res.json({ count, max: MAX });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));


const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPuKeQq7PmZ9cO2PvYoBwQ4YpUsZztod0wqrb4Bh35gaWNow/formResponse";

await fetch(GOOGLE_FORM_URL, {
  method: "POST",
  body: new URLSearchParams({
    "entry.1273045262": name,
    "entry.339524611": team
  }),
});
