// ============================
// 必要なモジュール
// ============================
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { google } from "googleapis"; // ★ 追加

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ============================
// チーム枠 初期値（固定）
// ============================
let count = { A: 0, B: 0, C: 0, D: 0 };
let max = { A: 1, B: 1, C: 1, D: 1 }; // ← ここは今まで通りお好みで変更OK

// ============================
// 締切日時（全ユーザー共通）
// ============================
// 2025/11/27 12:00（日本時間）
let DEADLINE = new Date("2025-11-24T12:00:00+09:00");

// ============================
// Googleフォーム送信情報
// ============================
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPuKeQq7PmZ9cO2PvYoBwQ4YpUsZztod0wqrb4Bh35gaWNow/formResponse";

const ENTRY_NAME = "entry.1273045262";
const ENTRY_TEAM = "entry.339524611";

// ============================
// Google Sheets 連携設定
// ============================

// ★ フォーム回答が入っているスプレッドシートID
const SHEET_ID = "1FQqbjJlI8GaQvueqCjg8taGFAZRz5IUKq5OHSRB5WRI";
// ★ 回答シート名
const ANSWER_SHEET_NAME = "フォームの回答 1";
// ★ 列の定義（1列目=タイムスタンプ, 2列目=名前, 3列目=チーム）
const TEAM_COL_INDEX = 3;

// ★ サービスアカウント情報（Render の環境変数から取得）
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// private_key の改行問題対策
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

// ★ Google API クライアント作成
const auth = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);

const sheets = google.sheets({ version: "v4", auth });

// ============================
// 起動時：フォーム回答から count を集計して復元
// ============================
async function loadCountFromSheet() {
  try {
    // A2:Z1000 → すべての行を強制的に取得
    const range = `${ANSWER_SHEET_NAME}!A2:C`;
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    // 1行目（ヘッダー）を除く
    const rows = (res.data.values || []).slice(1);

    console.log("----- SHEET RAW DATA -----");
    console.log(rows);
    console.log("---------------------------");
    
    const newCount = { A: 0, B: 0, C: 0, D: 0 };


    for (const row of rows) {
      const team = row[TEAM_COL_INDEX - 1]; // team = C列
      if (team && newCount.hasOwnProperty(team)) {
        newCount[team]++;
      }
    }

    count = newCount;
    console.log("count をフォームの回答から復元しました:", count);
  } catch (err) {
    console.error("count の読み込みに失敗しました:", err.message);
  }
}


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
// （メモリ上の count だけ 0 に戻す）
// ※ フォーム回答は消しません
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
// 起動（まず Sheets から count を復元してから listen）
// ============================
async function init() {
  await loadCountFromSheet();
  app.listen(PORT, () => console.log("Server running on " + PORT));
}

// ============================
// 手動で Sheets から count を再読み込み
// ============================
app.get("/reload", async (req, res) => {
  try {
    await loadCountFromSheet();
    res.json({ ok: true, message: "シートから再読み込みしました", count });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});


init().catch(err => {
  console.error("サーバー起動時にエラー:", err);
});

// ============================
// デバッグ用：実際に取得した rows を返す
// ============================
app.get("/debug", async (req, res) => {
  try {
    const range = `${ANSWER_SHEET_NAME}!A2:C`;
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    res.json({
      rows: result.data.values || [],
      count,
    });

  } catch (err) {
    res.json({ error: err.message });
  }
});
