// src/hooks/useSupabaseSync.ts
import { useState } from "react";
import { ReceiptItem } from "../../../types/receipt";
import { Client } from "../../clients/types/client";
import { supabase } from "../../../lib/supabaseClient";
import * as pdfjsLib from "pdfjs-dist";

// PDFワーカーの設定
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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
          let storagePath = "";
          let thumbnailPath = ""; // 明示的に変数を初期化
          let fileSize = 0;
          let pageCount = 1; // デフォルトは1ページ

          if (receipt.pdfUrl && receipt.pdfUrl.startsWith("blob:")) {
            try {
              const pdfResponse = await fetch(receipt.pdfUrl);
              const pdfBlob = await pdfResponse.blob();
              fileSize = pdfBlob.size;

              // PDFのページ数を取得
              const arrayBuffer = await pdfBlob.arrayBuffer();
              const pdf = await pdfjsLib.getDocument(
                new Uint8Array(arrayBuffer)
              ).promise;
              pageCount = pdf.numPages;

              // PDFをストレージにアップロード (追加する部分)
              const dateStr = receipt.date
                ? receipt.date.replace(/-/g, "")
                : "nodate";
              const pdfFileName = `pdf_${dateStr}_${receipt.id}.pdf`;
              const pdfFilePath = `clients/${client.id}/pdfs/${pdfFileName}`;

              console.log(
                "Attempting to upload PDF:",
                pdfFilePath,
                "for receipt:",
                receipt.id
              );

              const { error: pdfUploadError } = await supabase.storage
                .from("receipts") // receipts バケットを使用
                .upload(pdfFilePath, pdfBlob, {
                  contentType: "application/pdf", // MIME タイプを明示的に指定
                  upsert: true, // 既存ファイルを上書き
                });

              if (pdfUploadError) {
                console.error("PDF upload error:", pdfUploadError);
                console.error("Error details:", pdfUploadError.message);
              } else {
                console.log("PDF uploaded successfully:", pdfFilePath);
                storagePath = pdfFilePath; // PDFパスを保存
              }

              // サムネイルをアップロード
              const thumbnailBase64 = sessionStorage.getItem(
                `thumbnail_${receipt.id}`
              );
              if (thumbnailBase64) {
                try {
                  // Base64からBlobに変換
                  const thumbnailBlob = await fetch(thumbnailBase64).then(
                    (res) => res.blob()
                  );

                  // サムネイルをストレージにアップロード
                  // フォルダ構造を変更：クライアントフォルダ内にサムネイルを保存
                  const thumbnailFileName = `thumbnail_${dateStr}_${receipt.id}.jpg`;
                  const thumbnailFilePath = `clients/${client.id}/thumbnails/${thumbnailFileName}`;

                  console.log(
                    "Attempting to upload thumbnail:",
                    thumbnailFilePath,
                    "for receipt:",
                    receipt.id
                  );

                  const { error: thumbnailError } = await supabase.storage
                    .from("receipts") // receipts バケットを使用
                    .upload(thumbnailFilePath, thumbnailBlob, {
                      contentType: "image/jpeg", // MIME タイプを明示的に指定
                      upsert: true, // 既存ファイルを上書き
                    });

                  if (thumbnailError) {
                    console.error("Thumbnail upload error:", thumbnailError);
                    // エラーの詳細をログ出力
                    console.error("Error details:", thumbnailError.message);
                  } else {
                    console.log(
                      "Thumbnail uploaded successfully:",
                      thumbnailFilePath
                    );
                    thumbnailPath = thumbnailFilePath; // サムネイルパスを設定
                  }

                  // 使用済みの一時データを削除
                  sessionStorage.removeItem(`thumbnail_${receipt.id}`);
                } catch (err) {
                  console.error("Thumbnail processing error:", err);
                }
              } else {
                console.log("No thumbnail data found for receipt:", receipt.id);
              }
            } catch (err) {
              console.error("PDF processing error:", err);
            }
          }

          // レシートデータをSupabaseデータベースに保存
          const { data: receiptData, error: insertError } = await supabase
            .from("receipts")
            .upsert({
              id: receipt.id,
              client_id: client.id,
              vendor: receipt.vendor || "",
              amount: receipt.amount || 0,
              date: receipt.date || null,
              pdf_path: storagePath || null,
              pdf_name: receipt.vendor
                ? `${receipt.vendor}_${receipt.date || "nodate"}.pdf`
                : `receipt_${receipt.id}.pdf`,
              thumbnail_path: thumbnailPath || null, // サムネイルパスを保存
              type: receipt.type || "領収書",
              memo: receipt.memo || "",
              tag: receipt.tag || "",
              status: receipt.status || "完了",
              transfer_type: options.transferType,
              sub_type: options.subType || null,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          // PDFメタデータをpdf_metadataテーブルに保存
          if (receiptData && storagePath) {
            const originalFilename = receipt.vendor
              ? `${receipt.vendor}_${receipt.date || "nodate"}.pdf`
              : `receipt_${receipt.id}.pdf`;

            const { error: metadataError } = await supabase
              .from("pdf_metadata")
              .upsert({
                id: receipt.id, // receiptと同じIDを使用
                receipt_id: receipt.id,
                original_filename: originalFilename,
                file_size: fileSize,
                page_count: pageCount,
                created_at: new Date().toISOString(),
              });

            if (metadataError) {
              console.error("PDF metadata insertion error:", metadataError);
            }
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
