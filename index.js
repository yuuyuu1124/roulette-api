import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// チームの最大人数（25人：A6 B6 C6 D7）
const MAX = { A: 6, B: 6, C: 6, D: 7 };

// 現在の人数
let count = { A: 0, B: 0, C: 0, D: 0 };

// ランダムにチームを割り当て（枠があるチームのみ）
function assignTeam() {
  const available = Object.keys(MAX).filter(t => count[t] < MAX[t]);
  if (available.length === 0) return null;

  const team = available[Math.floor(Math.random() * available.length)];
  count[team]++;
  return team;
}

// POST /assign でチームを配分
app.post("/assign", (req, res) => {
  const name = req.body.name || "noname";

  const team = assignTeam();
  if (!team) {
    return res.json({ ok: false, error: "全枠埋まりました" });
  }

  res.json({ ok: true, team, count, max: MAX });
});

// 状態確認API
app.get("/status", (req, res) => {
  res.json({ count, max: MAX });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
