import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ReceiptItem } from "../types/receipt";
import {
  fetchReceipts,
  updateReceipt as apiUpdateReceipt,
  deleteReceipt as apiDeleteReceipt,
} from "../utils/receiptApi";

interface ReceiptContextType {
  receipts: ReceiptItem[];
  setReceipts: (receipts: ReceiptItem[]) => void;
  addReceipt: (receipt: ReceiptItem) => Promise<void>;
  addReceipts: (receipts: ReceiptItem[]) => Promise<void>;
  updateReceipt: (id: string, updates: Partial<ReceiptItem>) => Promise<void>;
  removeReceipt: (id: string) => Promise<void>;
  clearReceipts: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    const loadReceipts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchReceipts();

        if (response.success && response.data) {
          setReceipts(response.data);
        } else {
          setError(response.error || "レシートの取得に失敗しました");
        }
      } catch (err) {
        console.error("Failed to load receipts:", err);
        setError("データの読み込み中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();
  }, []);

  // PDFの一括アップロードは別途実装

  const addReceipt = async (receipt: ReceiptItem) => {
    setIsLoading(true);
    setError(null);

    try {
      // 実際のAPIによるレシート追加はuploadPdfAndCreateReceipt経由で行う
      // ここでは簡易的な実装として、UIのステートのみ更新
      setReceipts((prev) => [...prev, receipt]);
    } catch (err) {
      console.error("Failed to add receipt:", err);
      setError("レシートの追加に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const addReceipts = async (newReceipts: ReceiptItem[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // 複数レシートの追加も同様
      setReceipts((prev) => [...prev, ...newReceipts]);
    } catch (err) {
      console.error("Failed to add receipts:", err);
      setError("レシートの一括追加に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const updateReceipt = async (id: string, updates: Partial<ReceiptItem>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiUpdateReceipt(id, updates);

      if (response.success) {
        // UIの状態を更新
        setReceipts((prev) =>
          prev.map((receipt) =>
            receipt.id === id ? { ...receipt, ...updates } : receipt
          )
        );
      } else {
        setError(response.error || "レシートの更新に失敗しました");
      }
    } catch (err) {
      console.error("Failed to update receipt:", err);
      setError("レシートの更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const removeReceipt = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiDeleteReceipt(id);

      if (response.success) {
        // UIの状態を更新
        setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
      } else {
        setError(response.error || "レシートの削除に失敗しました");
      }
    } catch (err) {
      console.error("Failed to remove receipt:", err);
      setError("レシートの削除中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const clearReceipts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // すべてのレシートを削除
      // 注意: これは実際には一つずつAPIを呼び出す必要がある
      const deletePromises = receipts.map((receipt) =>
        apiDeleteReceipt(receipt.id)
      );
      await Promise.all(deletePromises);

      // UI状態をクリア
      setReceipts([]);
    } catch (err) {
      console.error("Failed to clear receipts:", err);
      setError("レシートの一括削除中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    receipts,
    setReceipts,
    addReceipt,
    addReceipts,
    updateReceipt,
    removeReceipt,
    clearReceipts,
    isLoading,
    error,
  };

  return (
    <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>
  );
};
