import { useState } from "react";
import { ReceiptItem } from "../types/receipt";
import { Client } from "../types/client";
import { NotionApiClient, receiptToNotionProperties } from "../utils/notionApi";

// NotionSyncOptionsをエクスポート
export interface NotionSyncOptions {
  transferType: string; // 授受区分
  subType?: string; // サブタイプ
}

export function useNotionSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    success: number;
    failed: number;
  }>({ success: 0, failed: 0 });

  // 複数の領収書を一括でNotionと同期
  const syncReceiptsToNotion = async (
    receipts: ReceiptItem[],
    client: Client,
    options: NotionSyncOptions,
    apiKey: string
  ) => {
    if (!apiKey) {
      setError("Notion API Keyが設定されていません。");
      return { success: 0, failed: receipts.length };
    }

    if (!client.notionDatabaseId) {
      setError("NotionデータベースIDが設定されていません。");
      return { success: 0, failed: receipts.length };
    }

    setIsSyncing(true);
    setError(null);
    setSyncStatus({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    try {
      const notionClient = new NotionApiClient(apiKey);

      for (const receipt of receipts) {
        try {
          // NotionのプロパティにマッピングしてAPIに渡す
          const properties = receiptToNotionProperties(
            receipt,
            client,
            options.transferType,
            options.subType
          );

          // Notionにページを作成
          await notionClient.createPage(client.notionDatabaseId, properties);

          successCount++;
          setSyncStatus({ success: successCount, failed: failedCount });
        } catch (err) {
          failedCount++;
          setSyncStatus({ success: successCount, failed: failedCount });
          console.error(`Failed to sync receipt ${receipt.id}:`, err);
        }
      }

      return { success: successCount, failed: failedCount };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`同期中にエラーが発生しました: ${errorMessage}`);
      return { success: successCount, failed: receipts.length - successCount };
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncReceiptsToNotion,
    isSyncing,
    error,
    syncStatus,
  };
}
