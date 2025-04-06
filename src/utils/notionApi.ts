import { ReceiptItem } from "../types/receipt";
import { Client } from "../types/client";

// Notion APIの基本設定
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// Notion APIの型定義
interface NotionPropertyValueObject {
  title?: Array<{ text: { content: string } }>;
  rich_text?: Array<{ text: { content: string } }>;
  number?: number;
  select?: { name: string };
  date?: { start: string; end?: string } | null;
  checkbox?: boolean;
  url?: string;
  email?: string;
  phone_number?: string;
  multi_select?: Array<{ name: string }>;
  files?: Array<{ name: string; external: { url: string } }>;
  relation?: Array<{ id: string }>;
  formula?: { type: string; [key: string]: unknown };
  people?: Array<{ id: string }>;
}

interface NotionPropertyMap {
  [key: string]: NotionPropertyValueObject;
}

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

// Notion APIクライアント
export class NotionApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ヘッダー生成
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    };
  }

  // データベースにページを作成
  async createPage(databaseId: string, properties: NotionPropertyMap) {
    try {
      const response = await fetch(`${NOTION_API_BASE_URL}/pages`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message: string };
        throw new Error(`Failed to create page: ${errorData.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating page in Notion:", error);
      throw error;
    }
  }

  // データベースを検索
  async queryDatabase(databaseId: string, filter?: NotionDatabaseQueryFilter) {
    try {
      const requestBody: { filter?: NotionDatabaseQueryFilter } = {};
      if (filter) requestBody.filter = filter;

      const response = await fetch(
        `${NOTION_API_BASE_URL}/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { message: string };
        throw new Error(`Failed to query database: ${errorData.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error querying Notion database:", error);
      throw error;
    }
  }
}

// 領収書アイテムをNotionのプロパティ形式に変換
export function receiptToNotionProperties(
  receipt: ReceiptItem,
  client: Client,
  transferType: string, // 授受区分 (受取/渡し)
  subType?: string // サブタイプ(該当する場合)
): NotionPropertyMap {
  // 基本プロパティの変換
  const properties: NotionPropertyMap = {
    // タイトルフィールド (支払先)
    支払先: {
      title: [
        {
          text: {
            content: receipt.vendor || "未設定",
          },
        },
      ],
    },
    // 日付フィールド
    日付: {
      date: receipt.date ? { start: receipt.date } : null,
    },
    // 金額フィールド
    金額: {
      number: receipt.amount || 0,
    },
    // メモフィールド
    メモ: {
      rich_text: [
        {
          text: {
            content: receipt.memo || "",
          },
        },
      ],
    },
    // ドキュメントタイプ
    ドキュメント種類: {
      select: {
        name: receipt.type,
      },
    },
    // 最終更新日
    更新日: {
      date: {
        start: receipt.updatedAt || new Date().toISOString().split("T")[0],
      },
    },
    // 授受区分
    授受区分: {
      select: {
        name: transferType,
      },
    },
    // 顧客名
    顧客名: {
      rich_text: [
        {
          text: {
            content: client.name,
          },
        },
      ],
    },
  };

  // カテゴリフィールド (タグ) - 値がある場合のみ追加
  if (receipt.tag) {
    properties["カテゴリ"] = {
      select: {
        name: receipt.tag,
      },
    };
  }

  // サブタイプがある場合は追加
  if (subType) {
    properties["サブタイプ"] = {
      select: {
        name: subType,
      },
    };
  }

  return properties;
}
