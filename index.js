// ============================
// 必要なモジュール
// ============================
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
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
// Googleフォーム送信URL
// ============================
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPuKeQq7PmZ9cO2PvYoBwQ4YpUsZztod0wqrb4Bh35gaWNow/formResponse";

// entry ID
const ENTRY_NAME = "entry.1273045262";   // 名前
const ENTRY_TEAM = "entry.339524611";    // チーム


// ============================
// ルート確認用
// ============================
app.get("/", (req, res) => {
  res.send("API is running");
});


// ============================
// 現在の枠数表示（/status）
// ============================
app.get("/status", (req, res) => {
  res.json({ count, max });
});


// ============================
// 抽選API（/assign）
// ============================
app.post("/assign", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ ok: false, error: "名前が必要です" });

  // 空きがあるチームを抽出
  const availableTeams = Object.keys(count).filter(
    (team) => count[team] < max[team]
  );

  if (availableTeams.length === 0) {
    return res.json({ ok: false, error: "全枠が埋まりました" });
  }

  // ランダム選出
  const team =
    availableTeams[Math.floor(Math.random() * availableTeams.length)];

  count[team]++;

  // ******************************
  // Googleフォームへ送信
  // ******************************
  try {
    await fetch(GOOGLE_FORM_URL, {
