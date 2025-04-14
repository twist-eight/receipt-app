// src/utils/ocrService.ts
// Google Cloud Vision API用に完全修正 + 結果パース精度向上（実レシート対応強化）

// OCR結果の型定義
export interface OCRResult {
  text: string; // 抽出された全文テキスト
  vendor?: string; // 取引先（ベンダー名）
  date?: string; // 日付（YYYY-MM-DD）
  amount?: number; // 合計金額
  items?: {
    description: string; // 商品名や項目名
    price: number; // 金額
    quantity?: number; // 数量（未使用）
  }[];
  confidence: number; // 平均信頼度（0.0〜1.0）
}

// OCR処理のオプション
export interface OCROptions {
  language?: string; // 言語ヒント（例: "ja"）
  documentType?: string; // ドキュメントタイプ（未使用）
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

// Vision APIの単語アノテーション型
interface WordAnnotation {
  symbols?: Array<{
    text?: string;
    confidence?: number;
  }>;
  confidence?: number;
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

// Google Vision APIを使って画像から文字を抽出し、構造化するメイン関数
export async function processImageWithOCR(
  imageUrl: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const settings = getOcrSettings();
  const apiKey = settings.apiKey;
  const language = options.language || settings.defaultLanguage;
  if (!apiKey)
    throw new Error(
      "OCR APIキーが設定されていません。設定ページでAPIキーを設定してください。"
    );

  try {
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

    // パース処理：ベンダー名、日付、金額、明細を抽出
    const lines = extractedText.split("\n");
    const vendor =
      lines.find((line) =>
        /株式会社|有限会社|maruetsu|イオン|ローソン|ファミリーマート|セブン/.test(
          line
        )
      ) || lines[0];
    const date = extractDate(extractedText);
    const amount = extractAmount(extractedText);
    const items = extractItems(lines);

    return {
      text: extractedText,
      vendor,
      date,
      amount,
      items,
      confidence: confidenceValue,
    };
  } catch (error) {
    console.error("OCRエラー:", error);
    throw error;
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
      .filter((w): w is WordAnnotation => w !== undefined);
    const confidences = words.map((w) => w.confidence || 0);
    const avg =
      confidences.reduce((a, b) => a + b, 0) / (confidences.length || 1);
    return avg;
  } catch {
    return 0.7;
  }
}

// 正規表現で日付を抽出（例：2024年 1月 5日 → 2024-01-05）
function extractDate(text: string): string {
  const datePattern = /(\d{4})[年\/\-]\s*(\d{1,2})[月\/\-]\s*(\d{1,2})日?/;
  const match = datePattern.exec(text);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// 合計金額を推定（合計キーワード行→最大金額）
function extractAmount(text: string): number | undefined {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("合計") && i < lines.length - 1) {
      const match = lines[i + 1].match(/[¥￥]?(\d{1,3}(,\d{3})*)/);
      if (match) return parseInt(match[1].replace(/,/g, ""), 10);
    }
  }
  // fallback: テキスト中の最大金額を使用
  const allMatches = [...text.matchAll(/[¥￥]?(\d{1,3}(,\d{3})*)/g)];
  const numbers = allMatches.map((m) => parseInt(m[1].replace(/,/g, ""), 10));
  return numbers.length > 0 ? Math.max(...numbers) : undefined;
}

// 金額付きのすべての行を明細として抽出
function extractItems(
  lines: string[]
): { description: string; price: number }[] {
  const items: { description: string; price: number }[] = [];
  for (const line of lines) {
    const match = /(.+?)\s+[¥￥]?(\d{1,3}(,\d{3})*)円?/.exec(line);
    if (match) {
      items.push({
        description: match[1].trim(),
        price: parseInt(match[2].replace(/,/g, ""), 10),
      });
    }
  }
  return items;
}
