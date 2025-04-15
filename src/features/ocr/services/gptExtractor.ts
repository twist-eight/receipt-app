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
あなたは、OCRで読み取られた領収書・請求書・明細書などのテキストから、以下の情報を正確に抽出するAIアシスタントです。

【出力形式】
以下のJSON形式で出力してください。必ず構造とキーはこのとおりにしてください。

{
  "vendor": "取引先名（会社名、店舗名など）",
  "date": "YYYY-MM-DD形式（和暦は西暦に変換してください）",
  "amount": 金額（カンマなしの整数、例：1320）,
  "tNumber": "インボイス番号（Tから始まる13桁、例：T1234567890123）",
  "items": [
    {
      "description": "商品・サービス名",
      "price": 金額（整数）
    },
    ...
  ],
  "confidence": 0〜1の数値（抽出の確信度。自信がある場合は1.0、曖昧な場合は0.7などとしてください）
}

【補足ルール】

- 取引先名（vendor）は会社名を最優先とし、次に最も大きく・目立つ店名、または「領収証」等の直上にある名称から判断してください。支店名までは必要ありません。

- 日付（date）は以下のような和暦や略記もサポートしてください：
    - 令和5年10月1日 → 2023-10-01
    - R5.10.1 → 2023-10-01
    - 2023年10月1日 → 2023-10-01
    - 23/10/01 や 2023/10/01 → 2023-10-01
- 金額（amount）は税込の合計金額、または「合計」「総額」などに付随する金額を採用してください。小数点以下がある場合は四捨五入で整数にしてください。合計金額の計算には気をつけてください。
- インボイス番号（tNumber）は「登録番号」「T123...」などの13桁または12桁などを抽出してください。なければnull。
- 明細（items）は、商品名＋金額のセットが明確に見つかる場合のみ記載してください。なければ空の配列でよいです。
- confidenceは、全体の構造が明瞭であれば 1.0、どれか1項目に迷いがあれば 0.8、かなり曖昧なら 0.5 以下としてください。

【注意】
- 不明な項目は null で出力してください。
- 不要なデータ（例：電話番号、店舗コードなど）は抽出しないでください。
- テキストが崩れていても、可能な限り意味を推測して対応してください。
- 出力はJSON部分のみで、前後に解説や補足は不要です。

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
