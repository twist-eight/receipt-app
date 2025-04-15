import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ReceiptItem } from "../types/receipt";

interface ReceiptContextType {
  receipts: ReceiptItem[];
  setReceipts: (receipts: ReceiptItem[]) => void;
  addReceipt: (receipt: ReceiptItem) => void;
  addReceipts: (receipts: ReceiptItem[]) => void;
  updateReceipt: (id: string, updates: Partial<ReceiptItem>) => void;
  removeReceipt: (id: string) => void;
  clearReceipts: () => void;
}

const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined);

export const useReceiptContext = () => {
  const context = useContext(ReceiptContext);
  if (context === undefined) {
    throw new Error("useReceiptContext must be used within a ReceiptProvider");
  }
  return context;
};

interface ReceiptProviderProps {
  children: ReactNode;
}

export const ReceiptProvider: React.FC<ReceiptProviderProps> = ({
  children,
}) => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  // セッションストレージからの初期読み込み
  useEffect(() => {
    const storedReceipts = sessionStorage.getItem("ocrResults");
    if (storedReceipts) {
      try {
        const parsed = JSON.parse(storedReceipts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReceipts(parsed);
        }
      } catch (e) {
        console.error("Failed to parse stored receipts:", e);
      }
    }
  }, []);

  // 状態が変更されたらセッションストレージに保存
  useEffect(() => {
    if (receipts.length > 0) {
      sessionStorage.setItem("ocrResults", JSON.stringify(receipts));
    }
  }, [receipts]);

  const addReceipt = (receipt: ReceiptItem) => {
    setReceipts((prev) => [...prev, receipt]);
  };

  const addReceipts = (newReceipts: ReceiptItem[]) => {
    setReceipts((prev) => [...prev, ...newReceipts]);
  };

  const updateReceipt = (id: string, updates: Partial<ReceiptItem>) => {
    setReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === id ? { ...receipt, ...updates } : receipt
      )
    );
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
  };

  const clearReceipts = () => {
    setReceipts([]);
    sessionStorage.removeItem("ocrResults");
  };

  const value = {
    receipts,
    setReceipts,
    addReceipt,
    addReceipts,
    updateReceipt,
    removeReceipt,
    clearReceipts,
  };

  return (
    <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>
  );
};
