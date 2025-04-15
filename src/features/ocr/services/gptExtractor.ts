// src/features/ocr/services/gptExtractor.ts

// OCRResultのインポートを削除し、独自の型定義を使用する

// API設定
const GPT4_MINI_API_URL = "https://api.openai.com/v1/chat/completions"; // APIエンドポイントURLを適宜調整

interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    logprobs: null;
    finish_reason: string;
  }[];
}

interface ExtractedData {
  vendor?: string;
  date?: string;
  amount?: number;
  tNumber?: string;
  items?: Array<{
    description: string;
    price: number;
    quantity?: number;
  }>;
  confidence: number;
}

/**
 * OCRで抽出されたテキストからGPT-4o miniを使用して構造化データを抽出する
 * @param text OCRで抽出されたテキスト
 * @param apiKey OpenAIのAPIキー
 * @returns 構造化されたデータ
 */
export async function extractDataWithGPT(
  text: string,
  apiKey: string
): Promise<ExtractedData> {
  try {
    if (!text.trim()) {
      throw new Error("テキストが空です");
    }

    if (!apiKey) {
      throw new Error("APIキーが設定されていません");
    }

    const prompt = createPrompt(text);
    const response = await callGPT4Mini(prompt, apiKey);

    if (
      !response ||
      !response.choices ||
      !response.choices[0]?.message?.content
    ) {
      throw new Error("APIからの応答が不正です");
    }

    const content = response.choices[0].message.content;
    return parseResponse(content);
  } catch (error) {
    console.error("GPT抽出エラー:", error);
    return {
      confidence: 0.5, // 信頼度低め
    };
  }
}

/**
 * GPT-4o miniにプロンプトを送信する
 */
async function callGPT4Mini(
  prompt: string,
  apiKey: string
): Promise<GPTResponse> {
  try {
    const response = await fetch(GPT4_MINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたは日本語の請求書や領収書からデータを正確に抽出するAIアシスタントです。テキストから取引先名、日付、合計金額、T番号（インボイス番号）、明細項目を抽出し、JSON形式で返してください。わからない項目は null を返してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API呼び出しエラー: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GPT API呼び出しエラー:", error);
    throw error;
  }
}

/**
 * GPT-4o miniへのプロンプトを作成する
 */
function createPrompt(text: string): string {
  return `
あなたは領収書・請求書からデータを抽出するAIです。以下のOCRテキストから重要情報を抽出し、指定されたJSON形式で返してください。
【出力】必ずこの形式で：
{
"vendor": "取引先名",
"date": "YYYY-MM-DD",
"amount": 金額（整数）,
"tNumber": "T+13桁の数字",
"items": [{"description": "商品名", "price": 金額}],
"confidence": 0〜1の数値
}
【最重要ルール】
・金額: 「合計」「お買上げ金額」「ご利用金額」「支払金額」などの実際に支払った金額を抽出。おつり、預かり金、お釣りは含めない。税込金額を優先し、カンマは削除。
・tNumber: 「登録番号」「適格請求書発行事業者番号」などの後にある番号で、「T+13桁の数字」の形式（合計14桁）。OCRエラーにより「T」が「1」と誤認識されていることが多いため、先頭が「1」で合計14桁の数字を見つけた場合は「1」を「T」に置換すること。
【基本ルール】
・vendor: 会社名/店舗名を優先、「領収書」「請求書」などの近くにある名称
・日付: 和暦は西暦に変換（令和5/R5→2023年、平成31→2019年）
・不明項目: null、不要情報は抽出しない
・出力: JSON形式のみ、解説不要

【サンプル入力1】
株式会社山田商店
令和5年3月15日
コーヒー 550円
紅茶 450円
合計: 1,000円
お預かり 2,000円
お釣り 1,000円
登録番号:11234567890123
【サンプル出力1】
{
"vendor": "株式会社山田商店",
"date": "2023-03-15",
"amount": 1000,
"tNumber": "T1234567890123",
"items": [
{"description": "コーヒー", "price": 550},
{"description": "紅茶", "price": 450}
],
"confidence": 0.9
}
【サンプル入力2】
セブン-イレブン 東京店
2023/4/1
おにぎり 150円×2 300円
お茶 120円
小計 420円
消費税 42円
お買上げ金額 462円
1000円お預かり
お釣り 538円
適格請求書発行事業者番号：11-9876-5432-1098
【サンプル出力2】
{
"vendor": "セブン-イレブン",
"date": "2023-04-01",
"amount": 462,
"tNumber": "T1987654321098",
"items": [
{"description": "おにぎり", "price": 150, "quantity": 2},
{"description": "お茶", "price": 120}
],
"confidence": 0.9
}

---

以下がOCRテキストです：
${text}
`;
}

/**
 * GPT-4o miniからの応答をパースする
 */
function parseResponse(content: string): ExtractedData {
  try {
    // JSONレスポンスをパース
    const parsed = JSON.parse(content);

    // T番号の修正 - "T1"で始まり15文字の場合、"T"の後の"1"を削除
    if (
      parsed.tNumber &&
      parsed.tNumber.startsWith("T1") &&
      parsed.tNumber.length === 15
    ) {
      parsed.tNumber = "T" + parsed.tNumber.substring(2);
    }

    // 金額が文字列で返ってきた場合は数値に変換
    if (parsed.amount && typeof parsed.amount === "string") {
      parsed.amount = parseInt(parsed.amount.replace(/[^\d]/g, ""), 10);
    }

    // 日付のフォーマットを統一（必要に応じて）
    if (
      parsed.date &&
      parsed.date.match(/^\d{4}[年\/\-\.]\d{1,2}[月\/\-\.]\d{1,2}/)
    ) {
      const dateParts = parsed.date.match(
        /(\d{4})[年\/\-\.](\d{1,2})[月\/\-\.](\d{1,2})/
      );
      if (dateParts) {
        parsed.date = `${dateParts[1]}-${dateParts[2].padStart(
          2,
          "0"
        )}-${dateParts[3].padStart(2, "0")}`;
      }
    }

    // 信頼度が設定されていない場合はデフォルト値を設定
    if (
      typeof parsed.confidence !== "number" ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) {
      parsed.confidence = 0.8; // デフォルト値
    }

    return {
      vendor: parsed.vendor || undefined,
      date: parsed.date || undefined,
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
      tNumber: parsed.tNumber || undefined,
      items: Array.isArray(parsed.items) ? parsed.items : undefined,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("GPTレスポンスのパースエラー:", error, content);
    return {
      confidence: 0.4, // エラーがあったため低い信頼度を設定
    };
  }
}
