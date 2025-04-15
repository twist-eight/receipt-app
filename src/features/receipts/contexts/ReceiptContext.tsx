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

  // 更新関数を改善
  const updateReceipt = (id: string, updates: Partial<ReceiptItem>) => {
    setReceipts((prev) => {
      // 更新対象のレシートを見つける
      const targetIndex = prev.findIndex((receipt) => receipt.id === id);
      if (targetIndex === -1) {
        console.warn(`ID=${id}のレシートが見つかりません`);
        return prev; // 見つからない場合は何もしない
      }

      // 新しい配列を作成
      const newReceipts = [...prev];

      // 既存のレシートと更新を確実にマージ
      const oldReceipt = newReceipts[targetIndex];
      const updatedReceipt = {
        ...oldReceipt,
        ...updates,
        // 特定のフィールドを明示的に更新
        vendor:
          updates.vendor !== undefined ? updates.vendor : oldReceipt.vendor,
        date: updates.date !== undefined ? updates.date : oldReceipt.date,
        amount:
          updates.amount !== undefined ? updates.amount : oldReceipt.amount,
        memo: updates.memo !== undefined ? updates.memo : oldReceipt.memo,
        tNumber:
          updates.tNumber !== undefined ? updates.tNumber : oldReceipt.tNumber,
        status: updates.status || oldReceipt.status,
        updatedAt: new Date().toISOString().split("T")[0], // 更新日時を確実に設定
      };

      // 配列を更新
      newReceipts[targetIndex] = updatedReceipt;

      // デバッグ情報
      console.log(`レシート更新: ID=${id}`, {
        before: oldReceipt,
        updates: updates,
        after: updatedReceipt,
      });

      // セッションストレージに即時保存
      try {
        sessionStorage.setItem("ocrResults", JSON.stringify(newReceipts));
      } catch (e) {
        console.error("セッションストレージへの保存に失敗:", e);
      }

      return newReceipts;
    });
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
