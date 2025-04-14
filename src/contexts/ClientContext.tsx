// src/contexts/ClientContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Client } from "../types";
import { clientService } from "../services/clientService";
import { useLoading } from "./LoadingContext";
import { useToast } from "../components/ToastContext";
import { useErrorHandler } from "../utils/errorHandling";

interface ClientContextType {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Omit<Client, "id">) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
};

export const ClientProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { startLoading, stopLoading } = useLoading();
  const { addToast } = useToast();
  const { handleError, safeAsync } = useErrorHandler();

  // 効果的なエラークリア関数
  const clearError = () => setError(null);

  // 初期データのロード
  const loadClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientService.fetchClients();

      if (response.success && response.data) {
        setClients(response.data);
      } else {
        setError(response.error || "顧問先の取得に失敗しました");
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
      setError("データの読み込み中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 初期化時にデータを読み込む
  useEffect(() => {
    loadClients();

    // ローカルストレージから選択中の顧問先IDを復元
    const savedClientId = localStorage.getItem("selectedClientId");
    if (savedClientId) {
      setSelectedClientId(savedClientId);
    }
  }, []);

  // 選択中の顧問先IDが変更されたらローカルストレージに保存
  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem("selectedClientId", selectedClientId);
    } else {
      localStorage.removeItem("selectedClientId");
    }
  }, [selectedClientId]);

  // クライアントを追加
  const addClient = async (client: Omit<Client, "id">) => {
    startLoading("顧問先を追加中...");
    setError(null);

    try {
      const response = await clientService.createClient(client);

      if (response.success && response.data) {
        setClients((prev) => [...prev, response.data as Client]);
        addToast("顧問先を追加しました", "success");
      } else {
        setError(response.error || "顧問先の追加に失敗しました");
        addToast("顧問先の追加に失敗しました", "error");
      }
    } catch (err) {
      handleError(err, {
        fallbackMessage: "顧問先の追加中にエラーが発生しました",
      });
    } finally {
      stopLoading();
    }
  };

  // クライアントを更新
  const updateClient = async (id: string, updates: Partial<Client>) => {
    startLoading("顧問先情報を更新中...");
    setError(null);

    try {
      const response = await clientService.updateClient(id, updates);

      if (response.success && response.data) {
        setClients((prev) =>
          prev.map((client) => (client.id === id ? response.data : client))
        );
        addToast("顧問先情報を更新しました", "success");
      } else {
        setError(response.error || "顧問先の更新に失敗しました");
        addToast("顧問先の更新に失敗しました", "error");
      }
    } catch (err) {
      handleError(err, {
        fallbackMessage: "顧問先の更新中にエラーが発生しました",
      });
    } finally {
      stopLoading();
    }
  };

  // クライアントを削除
  const removeClient = async (id: string) => {
    startLoading("顧問先を削除中...");
    setError(null);

    try {
      const response = await clientService.deleteClient(id);

      if (response.success) {
        setClients((prev) => prev.filter((client) => client.id !== id));
        addToast("顧問先を削除しました", "success");

        // 削除した顧問先が選択中だった場合、選択をクリア
        if (selectedClientId === id) {
          setSelectedClientId(null);
        }
      } else {
        setError(response.error || "顧問先の削除に失敗しました");
        addToast("顧問先の削除に失敗しました", "error");
      }
    } catch (err) {
      handleError(err, {
        fallbackMessage: "顧問先の削除中にエラーが発生しました",
      });
    } finally {
      stopLoading();
    }
  };

  // クライアント一覧を再読み込み
  const refreshClients = async () => {
    return await safeAsync(loadClients, {
      successMessage: "顧問先一覧を更新しました",
      showSuccessToast: true,
      fallbackMessage: "顧問先一覧の更新に失敗しました",
    });
  };

  // IDでクライアントを検索
  const getClientById = (id: string) => {
    return clients.find((client) => client.id === id);
  };

  // コンテキスト値の作成
  const value = {
    clients,
    setClients,
    addClient,
    updateClient,
    removeClient,
    getClientById,
    selectedClientId,
    setSelectedClientId,
    isLoading,
    error,
    clearError,
    refreshClients,
  };

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
};
