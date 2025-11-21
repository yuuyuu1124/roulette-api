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
let max = { A: 6, B: 6, C: 6, D: 6 };

// ============================
// 締切日時（全ユーザー共通）
// ============================
// 2025/11/24 12:00（日本時間）
let DEADLINE = new Date("2025-11-24T12:00:00+09:00");

// ============================
// Googleフォーム送信情報
// ============================
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPuKeQq7PmZ9cO2PvYoBwQ4YpUsZztod0wqrb4Bh35gaWNow/formResponse";

const ENTRY_NAME = "entry.1273045262";
const ENTRY_TEAM = "entry.339524611";

// ============================
// 動作確認
// ============================
app.get("/", (req, res) => {
  res.send("API is running");
});

// ============================
// 現在の枠数
// ============================
app.get("/status", (req, res) => {
  res.json({ count, max });
});

// ============================
// 締切の取得
// ============================
app.get("/deadline", (req, res) => {
  res.json({ deadline: DEADLINE });
});

// ============================
// リセット
// ============================
app.get("/reset", (req, res) => {
  count = { A: 0, B: 0, C: 0, D: 0 };
  res.json({ ok: true, message: "リセット完了", count });
});

// ============================
// 抽選（POST /assign）
// ============================
app.post("/assign", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.json({ ok: false, error: "名前が必要です" });
  }

  // 締切チェック
  if (new Date() > DEADLINE) {
    return res.json({
      ok: false,
      error: "抽選は締め切りました",
      closed: true
    });
  }

  // 空きのあるチーム
  const availableTeams = Object.keys(count).filter(
    (team) => count[team] < max[team]
  );

  if (availableTeams.length === 0) {
    return res.json({ ok: false, error: "全枠が埋まりました" });
  }

  // ランダム割り当て
  const team =
    availableTeams[Math.floor(Math.random() * availableTeams.length)];
  count[team]++;

  // Googleフォーム送信
  try {
    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        [ENTRY_NAME]: name,
        [ENTRY_TEAM]: team
      }).toString()
    });
  } catch (e) {
    console.log("Googleフォーム送信エラー:", e);
  }

  res.json({ ok: true, team });
});

// ============================
// 管理画面 (/admin)
// ============================
app.get("/admin", (req, res) => {
  res.send(`
    <html>
    <body style="font-family:sans-serif; padding:30px;">
      <h2>管理画面</h2>

      <h3>現在の人数 count</h3>
      <pre>${JSON.stringify(count, null, 2)}</pre>

      <h3>最大人数 max</h3>
      <pre>${JSON.stringify(max, null, 2)}</pre>

      <h3>締切日時 DEADLINE</h3>
      <p>${DEADLINE}</p>

      <button onclick="resetCount()" 
        style="padding:10px 20px; background:#d33; color:#fff; border:none; border-radius:5px;">
        人数リセット
      </button>

      <script>
        function resetCount() {
          if (confirm("本当にリセットしますか？")) {
            fetch("/reset")
              .then(r => r.json())
              .then(d => alert("リセットしました"));
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ============================
// 起動
// ============================
app.listen(PORT, () => console.log("Server running on " + PORT));
