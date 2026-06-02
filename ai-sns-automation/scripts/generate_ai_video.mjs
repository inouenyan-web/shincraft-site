// fal.ai image-to-video 生成スクリプト（Instagram Reel用）
//
// 指定した管理IDの「生成画像URL」を元に動画を生成し、
// 生成した動画のURLを台帳の「動画URL」列に書き込む。
//
// 必要env: FAL_KEY, GAS_WEBAPP_URL, GAS_SHARED_TOKEN
//
// 使い方:
//   node scripts/generate_ai_video.mjs <管理ID>
//   node scripts/generate_ai_video.mjs <管理ID> --dry-run    # API呼び出しなし・設定確認のみ
//   node scripts/generate_ai_video.mjs <管理ID> --model fast # fast-animatediff（高速・低コスト）
//   node scripts/generate_ai_video.mjs <管理ID> --image-url <URL>  # 画像URLを直接指定

import { fal } from "@fal-ai/client";
import { requireEnv } from "./lib/env.mjs";
import { listRows, updateRowByManagementId } from "./lib/ledger.mjs";
import { toDirectImageUrl } from "./lib/buffer_client.mjs";

// ─── コマンドライン引数 ─────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const MANAGEMENT_ID = args.find((a) => !a.startsWith("--"));
const DRY_RUN = args.includes("--dry-run");
const MODEL_FLAG = getArg("--model") || "kling"; // "kling" | "fast"
const OVERRIDE_IMAGE_URL = getArg("--image-url");

if (!MANAGEMENT_ID) {
  console.error(
    [
      "使い方: node scripts/generate_ai_video.mjs <管理ID> [オプション]",
      "",
      "  --dry-run          API呼び出しをせず設定内容のみ確認",
      "  --model kling      Kling v2.1（高品質・デフォルト）",
      "  --model fast       fast-animatediff（高速・低コスト）",
      "  --image-url <URL>  台帳の画像URLを上書きして直接指定",
      "",
      "例: node scripts/generate_ai_video.mjs POST-001 --dry-run",
    ].join("\n")
  );
  process.exit(1);
}

// ─── モデル設定 ─────────────────────────────────────────────────────────

const MODELS = {
  kling: {
    id: "fal-ai/kling-video/v2.1/image-to-video",
    label: "Kling v2.1（高品質）",
    params: {
      duration: "5",   // 秒: "5" | "10"
      aspect_ratio: "9:16", // Reel縦動画
    },
  },
  fast: {
    id: "fal-ai/fast-animatediff/image-to-video",
    label: "fast-animatediff（高速）",
    params: {
      num_frames: 16,
      num_inference_steps: 4,
      fps: 8,
    },
  },
};

const model = MODELS[MODEL_FLAG];
if (!model) {
  console.error(`不明なモデル: ${MODEL_FLAG}。"kling" または "fast" を指定してください。`);
  process.exit(1);
}

// ─── メイン処理 ─────────────────────────────────────────────────────────

async function main() {
  console.log(`=== AI動画生成スクリプト ===`);
  console.log(`管理ID  : ${MANAGEMENT_ID}`);
  console.log(`モデル  : ${model.label}`);
  if (DRY_RUN) console.log(`モード  : DRY-RUN（API呼び出しなし）`);

  // 環境変数の確認（--dry-runでも事前チェック）
  let env;
  try {
    env = requireEnv(["FAL_KEY"]);
  } catch (err) {
    console.error("\n[ERROR] " + err.message);
    process.exit(1);
  }

  // 台帳から対象行を取得
  console.log("\n台帳から行を取得中...");
  let row;
  try {
    const rows = await listRows();
    row = rows.find((r) => String(r["管理ID"] || "").trim() === MANAGEMENT_ID);
  } catch (err) {
    console.error("[ERROR] 台帳の取得に失敗しました: " + err.message);
    process.exit(1);
  }

  if (!row) {
    console.error(`[ERROR] 管理ID "${MANAGEMENT_ID}" の行が台帳に見つかりません。`);
    process.exit(1);
  }

  console.log(`台帳行  : 見つかりました（ステータス: ${row["ステータス"] || "（未設定）"}）`);

  // 画像URLの解決
  const rawImageUrl =
    OVERRIDE_IMAGE_URL || String(row["生成画像URL"] || "").trim();

  if (!rawImageUrl) {
    console.error(
      [
        "[ERROR] 画像URLが見つかりません。",
        "  台帳の「生成画像URL」列を確認するか、--image-url オプションで直接指定してください。",
      ].join("\n")
    );
    process.exit(1);
  }

  const imageUrl = toDirectImageUrl(rawImageUrl);
  console.log(`画像URL : ${imageUrl}`);
  console.log(`モデルID: ${model.id}`);
  console.log(`パラメータ: ${JSON.stringify(model.params)}`);

  // DRY-RUN はここで終了
  if (DRY_RUN) {
    console.log("\n[DRY-RUN] 上記の設定でAPI呼び出しを行います（--dry-run のため実行しません）。");
    process.exit(0);
  }

  // fal.ai クライアントの初期化
  fal.config({ credentials: env.FAL_KEY });

  // 動画生成の実行
  console.log("\n動画生成を開始します（完了まで数十秒〜数分かかります）...");

  let videoUrl;
  try {
    const result = await fal.subscribe(model.id, {
      input: {
        image_url: imageUrl,
        ...model.params,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_QUEUE") {
          console.log(`  [待機中] キュー位置: ${update.queue_position ?? "不明"}`);
        } else if (update.status === "IN_PROGRESS") {
          if (update.logs?.length) {
            const last = update.logs[update.logs.length - 1];
            console.log(`  [進行中] ${last.message}`);
          }
        }
      },
    });

    // 動画URLを抽出（モデルによりレスポンス構造が異なる）
    videoUrl =
      result?.data?.video?.url ||
      result?.data?.video_url ||
      result?.data?.videos?.[0]?.url ||
      result?.video?.url ||
      result?.video_url;

    if (!videoUrl) {
      console.error("[ERROR] 動画URLをレスポンスから取得できませんでした。");
      console.error("レスポンス全体:", JSON.stringify(result, null, 2));
      throw new Error("動画URLが取得できませんでした");
    }

    console.log("\n[成功] 動画生成完了！");
    console.log(`動画URL: ${videoUrl}`);
  } catch (err) {
    console.error("\n[ERROR] 動画生成に失敗しました: " + err.message);

    // 台帳のステータスをエラーに更新
    try {
      await updateRowByManagementId(MANAGEMENT_ID, {
        ステータス: "エラー",
      });
      console.log("台帳のステータスを「エラー」に更新しました。");
    } catch (ledgerErr) {
      console.error("台帳更新にも失敗しました: " + ledgerErr.message);
    }

    process.exit(1);
  }

  // 台帳の「動画URL」列に書き込み
  console.log("\n台帳に動画URLを書き込み中...");
  try {
    await updateRowByManagementId(MANAGEMENT_ID, {
      動画URL: videoUrl,
    });
    console.log("[OK] 台帳の「動画URL」列を更新しました。");
  } catch (err) {
    console.error("[ERROR] 台帳への書き込みに失敗しました: " + err.message);
    console.error("動画URLは上記に表示されています。手動で台帳へ記録してください。");
    process.exit(1);
  }

  console.log("\n=== 完了 ===");
  console.log(`管理ID : ${MANAGEMENT_ID}`);
  console.log(`動画URL: ${videoUrl}`);
}

main().catch((err) => {
  console.error("予期しないエラー: " + String(err.message || err));
  process.exit(1);
});
