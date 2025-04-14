// src/services/clientService.ts
import { supabase } from "../utils/supabaseClient";
import { ApiResponse, Client } from "../types";

/**
 * 顧問先データに関するサービス層
 */
export const clientService = {
  /**
   * 全ての顧問先を取得
   */
  async fetchClients(): Promise<ApiResponse<Client[]>> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      // データをアプリケーションの型に変換
      const clients = data.map((item) => ({
        id: item.id,
        name: item.name,
        documentTypes: item.document_types || [],
        updatedAt: item.updated_at,
        createdAt: item.created_at,
      })) as Client[];

      return { success: true, data: clients };
    } catch (error) {
      console.error("Fetch clients error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "顧問先データの取得に失敗しました",
      };
    }
  },

  /**
   * 顧問先を作成
   */
  async createClient(
    clientData: Omit<Client, "id">
  ): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientData.name,
          document_types: clientData.documentTypes || [],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
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
        documentTypes: data.document_types || [],
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      };

      return { success: true, data: client };
    } catch (error) {
      console.error("Create client error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "顧問先の作成に失敗しました",
      };
    }
  },

  /**
   * 顧問先を更新
   */
  async updateClient(
    id: string,
    updates: Partial<Client>
  ): Promise<ApiResponse<Client>> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.documentTypes !== undefined)
        updateData.document_types = updates.documentTypes;

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
        documentTypes: data.document_types || [],
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      };

      return { success: true, data: client };
    } catch (error) {
      console.error("Update client error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "顧問先の更新に失敗しました",
      };
    }
  },

  /**
   * 顧問先を削除
   */
  async deleteClient(id: string): Promise<ApiResponse<void>> {
    try {
      // 関連するレシートやファイルも削除する場合はここで処理
      // リレーションを保持するために削除前に関連データを確認

      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Delete client error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "顧問先の削除に失敗しました",
      };
    }
  },

  /**
   * 指定IDの顧問先を取得
   */
  async getClientById(id: string): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      const client: Client = {
        id: data.id,
        name: data.name,
        documentTypes: data.document_types || [],
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      };

      return { success: true, data: client };
    } catch (error) {
      console.error("Get client error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "顧問先の取得に失敗しました",
      };
    }
  },
};
