import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Client } from "../types/client";

interface ClientContextType {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  removeClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
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

  // LocalStorageからクライアント情報を読み込み
  useEffect(() => {
    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
      try {
        const parsed = JSON.parse(storedClients);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
        }
      } catch (e) {
        console.error("Failed to parse stored clients:", e);
      }
    }
  }, []);

  // クライアント情報が変更されたらLocalStorageに保存
  useEffect(() => {
    if (clients.length > 0) {
      localStorage.setItem("clients", JSON.stringify(clients));
    }
  }, [clients]);

  const addClient = (client: Client) => {
    // IDが指定されていない場合は生成する
    const newClient = {
      ...client,
      id: client.id || uuidv4(),
    };
    setClients((prev) => [...prev, newClient]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id ? { ...client, ...updates } : client
      )
    );
  };

  const removeClient = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
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
  };

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
};
