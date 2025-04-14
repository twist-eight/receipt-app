// src/services/receiptService.ts
import { supabase } from "../utils/supabaseClient";
import { ApiResponse, ReceiptItem, FilterOptions } from "../types";

/**
 * 領収書データに関するサービス層
 * Supabaseとの通信を担当
 */
export const receiptService = {
  /**
   * 領収書の一覧を取得する
   */
  async fetchReceipts(
    clientId?: string,
    options?: FilterOptions
  ): Promise<ApiResponse<ReceiptItem[]>> {
    try {
      // クエリを構築
      let query = supabase.from("receipts").select(`
          *,
          pdf_metadata(*)
        `);

      // クライアントIDに基づいてフィルタリング
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      // 日付フィルタを適用
      if (options?.startDate) {
        query = query.gte("date", options.startDate);
      }
      if (options?.endDate) {
        query = query.lte("date", options.endDate);
      }

      // 種類フィルタを適用
      if (options?.type) {
        query = query.eq("type", options.type);
      }

      // 授受区分フィルタを適用
      if (options?.transferType) {
        query = query.eq("transfer_type", options.transferType);
      }

      // ソート順を適用
      const sortField = options?.sortBy || "date";
      const sortOrder = options?.sortOrder || "desc";
      query = query.order(sortField, { ascending: sortOrder === "asc" });

      // データを取得
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // バケット名
      const bucketName = "receipts";

      // APIレスポンスを適切な形式に変換
      const receipts = await Promise.all(
        data.map(async (item) => {
          let pdfUrl = "";
          let thumbnailUrl = "";

          // PDFのURLを取得
          if (item.pdf_path) {
            try {
              const { data: signedUrlData, error: signUrlError } =
                await supabase.storage
                  .from(bucketName)
                  .createSignedUrl(item.pdf_path, 60 * 60 * 24 * 7); // 1週間有効

              if (signedUrlData && !signUrlError) {
                pdfUrl = signedUrlData.signedUrl;
              }
            } catch (storageErr) {
              console.error(`${item.id}のストレージエラー:`, storageErr);
            }
          }

          // サムネイルのURLを取得
          if (item.thumbnail_path) {
            try {
              const { data: thumbnailData, error: thumbnailError } =
                await supabase.storage
                  .from(bucketName)
                  .createSignedUrl(item.thumbnail_path, 60 * 60 * 24 * 7); // 1週間有効

              if (thumbnailData && !thumbnailError) {
                thumbnailUrl = thumbnailData.signedUrl;
              }
            } catch (storageErr) {
              console.error(`${item.id}のサムネイルエラー:`, storageErr);
            }
          }

          return {
            id: item.id,
            imageUrls: [], // 画像URLは後で追加機能で対応
            pdfUrl: pdfUrl,
            pdfPath: item.pdf_path, // PDFパスを保持
            thumbnailPath: item.thumbnail_path,
            thumbnailUrl: thumbnailUrl,
            date: item.date || "",
            updatedAt: item.updated_at,
            vendor: item.vendor || "",
            amount: item.amount || 0,
            type: item.type || "領収書",
            memo: item.memo || "",
            tag: item.tag || "",
            status: item.status || "完了",
            transferType: item.transfer_type,
            subType: item.sub_type,
            clientId: item.client_id,
          } as ReceiptItem;
        })
      );

      return { success: true, data: receipts };
    } catch (error) {
      console.error("Fetch receipts error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "データ取得に失敗しました",
      };
    }
  },

  /**
   * 領収書を更新する
   */
  async updateReceipt(
    id: string,
    updates: Partial<ReceiptItem>
  ): Promise<ApiResponse<ReceiptItem>> {
    try {
      // 更新データの準備
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // フィールドのマッピング
      if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.memo !== undefined) updateData.memo = updates.memo;
      if (updates.tag !== undefined) updateData.tag = updates.tag;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.transferType !== undefined)
        updateData.transfer_type = updates.transferType;
      if (updates.subType !== undefined) updateData.sub_type = updates.subType;

      // データを更新
      const { data, error } = await supabase
        .from("receipts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // レスポンスを整形
      const updated: ReceiptItem = {
        id: data.id,
        imageUrls: updates.imageUrls || [],
        pdfUrl: updates.pdfUrl || "",
        pdfPath: data.pdf_path,
        thumbnailPath: data.thumbnail_path,
        thumbnailUrl: updates.thumbnailUrl,
        date: data.date || "",
        updatedAt: data.updated_at,
        vendor: data.vendor || "",
        amount: data.amount || 0,
        type: data.type || "領収書",
        memo: data.memo || "",
        tag: data.tag || "",
        status: data.status || "完了",
        transferType: data.transfer_type,
        subType: data.sub_type,
        clientId: data.client_id,
      };

      return { success: true, data: updated };
    } catch (error) {
      console.error("Update receipt error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "更新に失敗しました",
      };
    }
  },

  /**
   * 領収書を削除する
   */
  async deleteReceipt(id: string): Promise<ApiResponse<void>> {
    try {
      // 先にメタデータを削除
      await supabase.from("pdf_metadata").delete().eq("receipt_id", id);

      // レシート情報を取得して、関連するファイルのパスを特定
      const { data: receiptData } = await supabase
        .from("receipts")
        .select("pdf_path, thumbnail_path")
        .eq("id", id)
        .single();

      // PDFファイルを削除
      if (receiptData?.pdf_path) {
        await supabase.storage.from("receipts").remove([receiptData.pdf_path]);
      }

      // サムネイルを削除
      if (receiptData?.thumbnail_path) {
        await supabase.storage
          .from("receipts")
          .remove([receiptData.thumbnail_path]);
      }

      // レシートデータを削除
      const { error } = await supabase.from("receipts").delete().eq("id", id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Delete receipt error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "削除に失敗しました",
      };
    }
  },

  /**
   * 複数の領収書をSupabaseに同期する
   */
  async syncReceiptsToSupabase(
    receipts: ReceiptItem[],
    clientId: string,
    options: {
      transferType: string;
      subType?: string;
    }
  ): Promise<ApiResponse<{ syncedCount: number }>> {
    try {
      if (!clientId) {
        throw new Error("顧問先IDが必要です");
      }

      let syncedCount = 0;

      // 各レシートを順番に処理
      for (const receipt of receipts) {
        try {
          // PDFをストレージにアップロード
          if (receipt.pdfUrl && receipt.pdfUrl.startsWith("blob:")) {
            // blob URLからバイナリデータを取得
            const response = await fetch(receipt.pdfUrl);
            const pdfBlob = await response.blob();

            // PDFをアップロード
            const dateStr = receipt.date
              ? receipt.date.replace(/-/g, "")
              : "nodate";
            const pdfFileName = `pdf_${dateStr}_${receipt.id}.pdf`;
            const pdfFilePath = `clients/${clientId}/pdfs/${pdfFileName}`;

            const { error: pdfUploadError } = await supabase.storage
              .from("receipts")
              .upload(pdfFilePath, pdfBlob, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (!pdfUploadError) {
              // PDFパスを更新
              receipt.pdfPath = pdfFilePath;

              // サムネイルをアップロード
              const thumbnailBase64 = sessionStorage.getItem(
                `thumbnail_${receipt.id}`
              );
              if (thumbnailBase64) {
                const thumbnailBlob = await fetch(thumbnailBase64).then((res) =>
                  res.blob()
                );
                const thumbnailFileName = `thumbnail_${dateStr}_${receipt.id}.jpg`;
                const thumbnailFilePath = `clients/${clientId}/thumbnails/${thumbnailFileName}`;

                await supabase.storage
                  .from("receipts")
                  .upload(thumbnailFilePath, thumbnailBlob, {
                    contentType: "image/jpeg",
                    upsert: true,
                  });

                receipt.thumbnailPath = thumbnailFilePath;
                sessionStorage.removeItem(`thumbnail_${receipt.id}`);
              }
            }
          }

          // レシートデータをデータベースに保存
          const { error: insertError } = await supabase
            .from("receipts")
            .upsert({
              id: receipt.id,
              client_id: clientId,
              vendor: receipt.vendor || "",
              amount: receipt.amount || 0,
              date: receipt.date || null,
              pdf_path: receipt.pdfPath || null,
              pdf_name: receipt.vendor
                ? `${receipt.vendor}_${receipt.date || "nodate"}.pdf`
                : `receipt_${receipt.id}.pdf`,
              thumbnail_path: receipt.thumbnailPath || null,
              type: receipt.type || "領収書",
              memo: receipt.memo || "",
              tag: receipt.tag || "",
              status: receipt.status || "完了",
              transfer_type: options.transferType,
              sub_type: options.subType || null,
              updated_at: new Date().toISOString(),
            });

          if (!insertError) {
            syncedCount++;
          }
        } catch (itemError) {
          console.error(`アイテム ${receipt.id} の同期中にエラー:`, itemError);
          // 一つのアイテムのエラーで全体が失敗しないように続行
        }
      }

      return {
        success: syncedCount > 0,
        data: { syncedCount },
        error: syncedCount === 0 ? "同期できたアイテムがありません" : undefined,
      };
    } catch (error) {
      console.error("Sync receipts error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "同期に失敗しました",
      };
    }
  },
};
