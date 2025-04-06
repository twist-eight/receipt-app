import type { NextApiRequest, NextApiResponse } from "next";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみを許可
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { databaseId, properties, apiKey } = req.body;

    // 必須パラメータの検証
    if (!databaseId || !properties || !apiKey) {
      return res.status(400).json({
        error: "Missing required parameters (databaseId, properties, apiKey)",
      });
    }

    // Notionにリクエストを送信
    const response = await fetch(`${NOTION_API_BASE_URL}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    // デバッグ: レスポンスをテキストで取得して解析
    const responseText = await response.text();

    try {
      const responseData = JSON.parse(responseText);

      if (!response.ok) {
        // Notion API からのエラー内容をそのまま返す
        return res.status(response.status).json({
          error: `Notion API error: ${responseData.message || "Unknown error"}`,
          details: responseData,
        });
      }

      return res.status(200).json(responseData);
    } catch {
      console.error("❌ Not JSON response from Notion API:", responseText);
      return res.status(500).json({
        error:
          "Notion API did not return JSON. Possible wrong API key or endpoint.",
        raw: responseText,
      });
    }

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
    console.error("Error creating page in Notion:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
