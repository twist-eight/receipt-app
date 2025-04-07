import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Client } from "../types/client";
import {
  fetchClients,
  createClient as apiCreateClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
} from "../utils/clientApi";

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

  // 初期データの読み込み
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchClients();

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

    loadClients();
  }, []);

  const addClient = async (client: Omit<Client, "id">) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCreateClient(client);

      if (response.success && response.data) {
        setClients((prev) => [...prev, response.data]);
      } else {
        setError(response.error || "顧問先の追加に失敗しました");
      }
    } catch (err) {
      console.error("Failed to add client:", err);
      setError("顧問先の追加中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiUpdateClient(id, updates);

      if (response.success && response.data) {
        setClients((prev) =>
          prev.map((client) => (client.id === id ? response.data : client))
        );
      } else {
        setError(response.error || "顧問先の更新に失敗しました");
      }
    } catch (err) {
      console.error("Failed to update client:", err);
      setError("顧問先の更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const removeClient = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiDeleteClient(id);

      if (response.success) {
        setClients((prev) => prev.filter((client) => client.id !== id));

        // 削除した顧問先が選択中だった場合、選択をクリア
        if (selectedClientId === id) {
          setSelectedClientId(null);
        }
      } else {
        setError(response.error || "顧問先の削除に失敗しました");
      }
    } catch (err) {
      console.error("Failed to remove client:", err);
      setError("顧問先の削除中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getClientById = (id: string) => {
    return clients.find((client) => client.id === id);
  };

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
  };

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
};
