import type { NextApiRequest, NextApiResponse } from "next";

// ファイルパスの修正: パスが src/api/notion ではなく src/pages/api/notion になっているか確認してください

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// Notionのクエリフィルタ型定義をインポートまたは再定義
interface NotionDatabaseQueryFilter {
  property?: string;
  title?: { equals?: string; contains?: string };
  rich_text?: { equals?: string; contains?: string };
  number?: { equals?: number; greater_than?: number; less_than?: number };
  checkbox?: { equals?: boolean };
  select?: { equals?: string };
  multi_select?: { contains?: string };
  date?: {
    equals?: string;
    before?: string;
    after?: string;
    on_or_before?: string;
    on_or_after?: string;
    is_empty?: boolean;
  };
  [key: string]: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみを許可
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { databaseId, filter, apiKey } = req.body;

    // 必須パラメータの検証
    if (!databaseId || !apiKey) {
      return res.status(400).json({
        error: "Missing required parameters (databaseId, apiKey)",
      });
    }

    // リクエストボディの構築 - any型を具体的な型に変更
    const requestBody: { filter?: NotionDatabaseQueryFilter } = {};
    if (filter) requestBody.filter = filter;

    // Notionにリクエストを送信
    const response = await fetch(
      `${NOTION_API_BASE_URL}/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseData = await response.json();

    // Notionからのエラーレスポンスを処理
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Notion API error: ${responseData.message || "Unknown error"}`,
        details: responseData,
      });
    }

    // 成功したレスポンスを返す
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error querying Notion database:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
