import { ReceiptItem } from "../types/receipt";
import { Client } from "../types/client";

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

// Notion APIクライアント - API Routesを使用するよう変更
export class NotionApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // データベースにページを作成
  async createPage(databaseId: string, properties: NotionPropertyMap) {
    try {
      // Next.jsのAPIルートを使用
      const response = await fetch("/api/notion/create-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseId,
          properties,
          apiKey: this.apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create page: ${errorData.error || "Unknown error"}`
        );
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
      // Next.jsのAPIルートを使用
      const response = await fetch("/api/notion/query-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseId,
          filter,
          apiKey: this.apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to query database: ${errorData.error || "Unknown error"}`
        );
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
    // ドキュメント種類
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
