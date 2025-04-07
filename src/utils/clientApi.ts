// src/utils/clientApi.ts
import { supabase } from "./supabaseClient";
import { Client, DocumentTypeConfig } from "../types/client";

// Supabaseのデータベーステーブルの型を定義
interface ClientDatabaseRecord {
  id: string;
  name: string;
  // notion_database_id: string; // 削除
  // notion_api_key?: string;    // 削除
  document_types: DocumentTypeConfig[];
  updated_at: string;
  created_at: string;
}

// 顧問先を取得する関数
export async function fetchClients(): Promise<{
  success: boolean;
  data?: Client[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) {
      throw error;
    }

    // APIレスポンスをアプリの型定義に変換
    const clients = data.map((item) => ({
      id: item.id,
      name: item.name,
      // notionDatabaseId: item.notion_database_id || "", // 削除
      // notionApiKey: item.notion_api_key,               // 削除
      documentTypes: item.document_types || [],
    })) as Client[];

    return { success: true, data: clients };
  } catch (error) {
    console.error("Fetch clients error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

// 顧問先を作成する関数
export async function createClient(
  clientData: Omit<Client, "id">
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: clientData.name,
        // notion_database_id: clientData.notionDatabaseId, // 削除
        // notion_api_key: clientData.notionApiKey,         // 削除
        document_types: clientData.documentTypes || [],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // レスポンスをアプリの型定義に変換
    const client: Client = {
      id: data.id,
      name: data.name,
      // notionDatabaseId: data.notion_database_id || "", // 削除
      // notionApiKey: data.notion_api_key,               // 削除
      documentTypes: data.document_types || [],
    };

    return { success: true, data: client };
  } catch (error) {
    console.error("Create client error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

// 顧問先を更新する関数
export async function updateClient(
  id: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const updateData: Partial<ClientDatabaseRecord> = {};

    if (updates.name !== undefined) updateData.name = updates.name;

    if (updates.documentTypes !== undefined)
      updateData.document_types = updates.documentTypes;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // レスポンスをアプリの型定義に変換
    const client: Client = {
      id: data.id,
      name: data.name,
      // notionDatabaseId: data.notion_database_id || "", // 削除
      // notionApiKey: data.notion_api_key,               // 削除
      documentTypes: data.document_types || [],
    };

    return { success: true, data: client };
  } catch (error) {
    console.error("Update client error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}
