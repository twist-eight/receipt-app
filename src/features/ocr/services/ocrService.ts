// src/features/ocr/services/ocrService.ts

import { extractDataWithGPT } from "./gptExtractor";

// OCR結果の型定義
export interface OCRResult {
  text: string; // 抽出された全文テキスト
  vendor?: string; // 取引先（ベンダー名）
  date?: string; // 日付（YYYY-MM-DD）
  amount?: number; // 合計金額
  tNumber?: string; // T番号（取引番号）
  items?: {
    description: string; // 商品名や項目名
    price: number; // 金額
    quantity?: number; // 数量
  }[];
  confidence: number; // 平均信頼度（0.0〜1.0）
}

// OCR処理のオプション
export interface OCROptions {
  language?: string; // 言語ヒント（例: "ja"）
  documentType?: string; // ドキュメントタイプ
  useGpt?: boolean; // GPT利用フラグ（デフォルトtrue）
}

// Vision APIレスポンス型定義
interface VisionApiResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        blocks?: Array<{
          paragraphs?: Array<{
            words?: Array<{
              symbols?: Array<{
                text?: string;
                confidence?: number;
              }>;
              confidence?: number;
            }>;
          }>;
        }>;
      }>;
    };
    textAnnotations?: Array<{
      description?: string;
      confidence?: number;
    }>;
  }>;
}

// OCR設定をローカルストレージから取得
const getOcrSettings = (): {
  apiKey: string;
  defaultLanguage: string;
  autoApplyResults: boolean;
} => {
  try {
    const settingsStr = localStorage.getItem("ocrSettings");
    if (settingsStr) return JSON.parse(settingsStr);
  } catch (error) {
    console.error("Failed to parse OCR settings:", error);
  }
  return { apiKey: "", defaultLanguage: "ja", autoApplyResults: true };
};

// 画像URLまたはBlobからBase64エンコードへ変換
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    if (imageUrl.startsWith("data:")) return imageUrl;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("画像のBase64変換に失敗:", error);
    throw new Error("画像の変換に失敗しました");
  }
}

// 単語ごとの信頼度を平均して全体信頼度を算出
function calculateConfidence(
  response: VisionApiResponse["responses"][0]
): number {
  try {
    const blocks = response.fullTextAnnotation?.pages?.[0]?.blocks || [];
    const words = blocks
      .flatMap((b) => b.paragraphs || [])
      .flatMap((p) => p.words || [])
      .filter(
        (
          w
        ): w is {
          symbols?: Array<{
            text?: string;
            confidence?: number;
          }>;
          confidence?: number;
        } => w !== undefined
      );
    const confidences = words.map((w) => w.confidence || 0);
    const avg =
      confidences.reduce((a, b) => a + b, 0) / (confidences.length || 1);
    return avg;
  } catch {
    return 0.7;
  }
}

// メイン関数：Google Cloud Vision API + GPT-4o miniで画像から文字を抽出・構造化
export async function processImageWithOCR(
  imageUrl: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const settings = getOcrSettings();
  const apiKey = settings.apiKey;
  const language = options.language || settings.defaultLanguage;
  const useGpt = options.useGpt !== false; // デフォルトでGPTを使用

  if (!apiKey) {
    throw new Error(
      "OCR APIキーが設定されていません。設定ページでAPIキーを設定してください。"
    );
  }

  try {
    // ステップ1: Google Vision APIで画像からテキストを抽出
    const base64Image = await imageUrlToBase64(imageUrl);
    const base64Data = base64Image.split(",")[1];
    const apiEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: { content: base64Data },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: [language] },
        },
      ],
    };

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API Error: ${errorText}`);
    }

    const data = (await response.json()) as VisionApiResponse;
    const extractedText = data.responses?.[0]?.fullTextAnnotation?.text || "";
    const confidenceValue = calculateConfidence(data.responses[0]);

    // ステップ2: GPT-4o miniを使って構造化情報を抽出
    if (useGpt) {
      try {
        // OpenAI APIキーを設定から取得
        const openAIApiKey = localStorage.getItem("openai_api_key") || "";

        if (!openAIApiKey) {
          console.warn(
            "OpenAI APIキーが設定されていないため、構造化抽出をスキップします"
          );
          // 基本的なOCR結果のみを返す
          return {
            text: extractedText,
            confidence: confidenceValue,
          };
        }

        // GPT-4o miniを使って構造化情報を抽出
        const gptResult = await extractDataWithGPT(extractedText, openAIApiKey);

        // 完全にGPTの結果に基づくOCR結果を返す
        return {
          text: extractedText,
          vendor: gptResult.vendor,
          date: gptResult.date,
          amount: gptResult.amount,
          tNumber: gptResult.tNumber,
          items: gptResult.items,
          // GPTの信頼度とVision APIの信頼度の平均を取る
          confidence: (gptResult.confidence + confidenceValue) / 2,
        };
      } catch (error) {
        console.error("GPTによる情報抽出に失敗しました:", error);
        // エラー時はテキストのみの結果を返す
        return {
          text: extractedText,
          confidence: confidenceValue,
        };
      }
    } else {
      // GPT使用しない場合はテキストのみの結果を返す
      return {
        text: extractedText,
        confidence: confidenceValue,
      };
    }
  } catch (error) {
    console.error("OCRエラー:", error);
    throw error;
  }
}
