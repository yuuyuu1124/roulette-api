// ============================
// 必要なモジュール
// ============================
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ============================
// チーム枠 初期値（固定）
// ============================
let count = { A: 0, B: 0, C: 0, D: 0 };
let max = { A: 6, B: 6, C: 6, D: 7 };

// ============================
// 締切日時（全ユーザー共通）
// ============================
// 2025/11/24 12:00（日本時間）
let DEADLINE = new Date("2025-11-24T12:00:00+09:00");

// ============================
// Googleフォーム送信
// ============================
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPuKeQq7PmZ9cO2PvYoBwQ4YpUsZztod0wqrb4Bh35gaWNow/formResponse";

const ENTRY_NAME = "entry.1273045262";
const ENTRY_TEAM = "entry.339524611";


// ============================
// ルート確認
// ============================
app.get("/", (req, res) => {
  res.send("API is running");
});

// ============================
// 現在の枠
// ============================
app.get("/status", (req, res) => {
  res.json({ count, max });
});

// ============================
// 締切取得
// ============================
app.get("/deadline", (req, res) => {
  res.json({ deadline: DEADLINE });
});

// ============================
// カウントリセット
// ============================
app.get("/reset", (req, res) => {
  count = { A: 0, B: 0, C: 0, D: 0 };
  res.json({ ok: true, message: "カウントをリセットしました", count });
});

// ============================
// 抽選API
// ============================
app.post("/assign", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.json({ ok: false, error: "名前が必要です" });
  }

  // ★ 締切チェック
  if (new Date() > DEADLINE) {
    return res.json({
      ok: false,
      error: "抽選は締め切りました",
      closed: true
    });
  }

  // 空きがあるチーム
  const availableTeams = Object.keys(count).filter(
    (team) => count[team] < max[team]
  );

  if (availableTeams.length === 0) {
    return res.json({ ok: false, error: "全枠が埋まりました" });
  }

  // ランダム
  const team =
    availableTeams[Math.floor(Math.random() * availableTeams.length)];

  count[team]++;

  // Googleフォーム送信（no-cors）
  try {
    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        [ENTRY_NAME]: name,
        [ENTRY_TEAM]: team
      }),
    });
  } catch (e) {
    console.log("Google送信エラー:", e);
  }

  res.json({ ok: true, team });
});

app.listen(PORT, () => console.log("Server running on " + PORT));
