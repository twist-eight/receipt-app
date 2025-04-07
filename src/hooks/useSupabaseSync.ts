import { useState } from "react";
import { ReceiptItem } from "../types/receipt";
import { Client } from "../types/client";
import { supabase } from "../utils/supabaseClient";

// SupabaseSyncOptionsの定義
export interface SupabaseSyncOptions {
  transferType: string; // 授受区分
  subType?: string; // サブタイプ
}

export function useSupabaseSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    success: number;
    failed: number;
  }>({ success: 0, failed: 0 });

  // 複数の領収書を一括でSupabaseと同期
  const syncReceiptsToSupabase = async (
    receipts: ReceiptItem[],
    client: Client,
    options: SupabaseSyncOptions
  ) => {
    if (!client.id) {
      setError("顧問先IDが設定されていません。");
      return { success: 0, failed: receipts.length };
    }

    setIsSyncing(true);
    setError(null);
    setSyncStatus({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (const receipt of receipts) {
        try {
          // レシートをPDFとしてSupabaseストレージに保存
          // （実際のPDFファイルがあれば）
          let storagePath = "";
          if (receipt.pdfUrl && receipt.pdfUrl.startsWith("blob:")) {
            const pdfResponse = await fetch(receipt.pdfUrl);
            const pdfBlob = await pdfResponse.blob();
            const fileName = `${receipt.id}.pdf`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("receipts")
              .upload(filePath, pdfBlob);

            if (uploadError) {
              console.error("PDF upload error:", uploadError);
            } else {
              storagePath = filePath;
            }
          }

          // レシートデータをSupabaseデータベースに保存
          const { error: insertError } = await supabase
            .from("receipts")
            .upsert({
              id: receipt.id,
              client_id: client.id,
              vendor: receipt.vendor || "",
              amount: receipt.amount || 0,
              date: receipt.date || null,
              pdf_path: storagePath || null,
              pdf_name: `${receipt.vendor || "receipt"}.pdf`,
              type: receipt.type || "領収書",
              memo: receipt.memo || "",
              tag: receipt.tag || "",
              status: receipt.status || "完了",
              transfer_type: options.transferType,
              sub_type: options.subType || null,
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            throw insertError;
          }

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
    syncReceiptsToSupabase,
    isSyncing,
    error,
    syncStatus,
  };
}
