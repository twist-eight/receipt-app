// src/types/client.ts
// 顧問先に関する型定義

// 顧問先マスタの型定義
export interface Client {
  id: string;
  name: string;
  notionDatabaseId: string; // 顧問先ごとのNotion DB ID
  notionApiKey?: string; // 個別APIキー (省略時はグローバル設定を使用)
  documentTypes: DocumentTypeConfig[]; // ドキュメント種類の設定
}

// ドキュメント種類の設定
export interface DocumentTypeConfig {
  type: string; // 種類名 (例: 領収書、通帳)
  subTypes: string[]; // サブタイプの選択肢 (例: [A銀行, B銀行])
  properties?: CustomProperty[]; // 追加のカスタムプロパティ
}

// カスタムプロパティの設定
export interface CustomProperty {
  name: string;
  type: "text" | "select" | "number" | "date";
  options?: string[]; // select型の場合の選択肢
}
