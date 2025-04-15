// src/utils/receiptApi.ts
import { supabase } from "../lib/supabaseClient";
import { ReceiptItem } from "../types/receipt";
import { v4 as uuidv4 } from "uuid";

// Supabaseデータベースのレシートテーブル構造に対応する型
interface ReceiptDatabaseRecord {
  id: string;
  client_id: string | null;
  vendor: string;
  amount: number;
  date: string | null;
  pdf_path: string;
  pdf_name: string;
  type: string;
  memo: string;
  tag: string;
  status: string;
  created_at?: string;
  updated_at: string;
}

// PDFをアップロードしてレシートを作成する関数
export async function uploadPdfAndCreateReceipt(
  file: File,
  receiptData: Partial<ReceiptItem>
): Promise<{ success: boolean; data?: ReceiptDatabaseRecord; error?: string }> {
  try {
    // ファイル名をユニークにするためにUUIDを追加
    const fileExtension = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `receipts/${fileName}`;

    // ストレージにPDFファイルをアップロード
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`PDFアップロードエラー: ${uploadError.message}`);
    }

    // ファイルのURLを取得
    const { data: pdfData } = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath);

    if (!pdfData) {
      throw new Error("PDFのURLを取得できませんでした");
    }

    // データベースに領収書データを保存
    const { data, error: insertError } = await supabase
      .from("receipts")
      .insert({
        id: receiptData.id || uuidv4(),
        client_id: null, // 後で顧問先を割り当てる
        vendor: receiptData.vendor || "",
        amount: receiptData.amount || 0,
        date: receiptData.date || null,
        pdf_path: filePath,
        pdf_name: file.name,
        type: receiptData.type || "領収書",
        memo: receiptData.memo || "",
        tag: receiptData.tag || "",
        status: receiptData.status || "完了",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`レシート作成エラー: ${insertError.message}`);
    }

    // PDFメタデータを保存
    await supabase.from("pdf_metadata").insert({
      receipt_id: data.id,
      original_filename: file.name,
      file_size: file.size,
      page_count: 1, // 実際のページ数はフロントエンドで計算してください
    });

    return { success: true, data };
  } catch (error) {
    console.error("Receipt upload error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

// レシートを取得する関数
export async function fetchReceipts(): Promise<{
  success: boolean;
  data?: ReceiptItem[];
  error?: string;
}> {
  try {
    // レシートデータを取得
    const { data, error } = await supabase
      .from("receipts")
      .select(
        `
        *,
        pdf_metadata(*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // APIレスポンスを適切な形式に変換
    const receipts = data.map((item) => {
      // PDFのURLを生成
      const { data: pdfData } = supabase.storage
        .from("receipts")
        .getPublicUrl(item.pdf_path);

      return {
        id: item.id,
        imageUrls: [], // 画像は保存しないため空配列を返す
        pdfUrl: pdfData?.publicUrl || "",
        date: item.date || "",
        updatedAt: item.updated_at,
        vendor: item.vendor || "",
        amount: item.amount || 0,
        type: item.type || "領収書",
        memo: item.memo || "",
        tag: item.tag || "",
        status: item.status || "完了",
      } as ReceiptItem;
    });

    return { success: true, data: receipts };
  } catch (error) {
    console.error("Fetch receipts error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

// レシートを更新する関数
export async function updateReceipt(
  id: string,
  updates: Partial<ReceiptItem>
): Promise<{ success: boolean; data?: ReceiptDatabaseRecord; error?: string }> {
  try {
    // データベースのレシート情報を更新
    const { data, error } = await supabase
      .from("receipts")
      .update({
        vendor: updates.vendor,
        amount: updates.amount,
        date: updates.date,
        type: updates.type,
        memo: updates.memo,
        tag: updates.tag,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Update receipt error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

// レシートを削除する関数
export async function deleteReceipt(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 先にPDFメタデータを削除
    await supabase.from("pdf_metadata").delete().eq("receipt_id", id);

    // レシート情報を取得して、関連するPDFファイルのパスを特定
    const { data: receiptData } = await supabase
      .from("receipts")
      .select("pdf_path")
      .eq("id", id)
      .single();

    if (receiptData?.pdf_path) {
      // ストレージからPDFファイルを削除
      await supabase.storage.from("receipts").remove([receiptData.pdf_path]);
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
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}
// クライアントIDに基づいて、保存されたレシートを取得する関数
export async function fetchSavedReceipts(
  clientId: string | null,
  options?: {
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }
): Promise<{
  success: boolean;
  data?: ReceiptItem[];
  error?: string;
}> {
  try {
    // クエリを構築
    let query = supabase.from("receipts").select(
      `
        *,
        pdf_metadata(*)
      `
    );

    // クライアントIDに基づいてフィルタリング
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    // 日付範囲フィルタを適用
    if (options?.startDate) {
      query = query.gte("date", options.startDate);
    }
    if (options?.endDate) {
      query = query.lte("date", options.endDate);
    }

    // タイプフィルタを適用
    if (options?.type) {
      query = query.eq("type", options.type);
    }

    // ソート順を適用
    const sortField = options?.sortBy || "date";
    const sortOrder = options?.sortOrder || "desc";
    query = query.order(sortField, { ascending: sortOrder === "asc" });

    // 制限を適用
    if (options?.limit) {
      query = query.limit(options.limit);
    }

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
            } else {
              console.error(`${item.id}の署名付きURL生成失敗:`, signUrlError);
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
            } else {
              console.error(
                `${item.id}のサムネイルURL生成失敗:`,
                thumbnailError
              );
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
        } as ReceiptItem;
      })
    );

    return { success: true, data: receipts };
  } catch (error) {
    console.error("Fetch saved receipts error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}
