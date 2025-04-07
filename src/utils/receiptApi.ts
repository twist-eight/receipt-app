import { supabase } from "./supabaseClient";
import { ReceiptItem } from "../types/receipt";
import { v4 as uuidv4 } from "uuid";

// PDFをアップロードしてレシートを作成する関数
export async function uploadPdfAndCreateReceipt(
  file: File,
  receiptData: Partial<ReceiptItem>
): Promise<{ success: boolean; data?: any; error?: string }> {
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
): Promise<{ success: boolean; data?: any; error?: string }> {
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
