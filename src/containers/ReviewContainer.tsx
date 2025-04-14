// src/containers/ReviewContainer.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { useClientContext } from "../contexts/ClientContext";
import { useReloadWarning } from "../hooks/useReloadWarning";
import { useErrorHandler } from "../utils/errorHandling";
import { useLoading } from "../contexts/LoadingContext";
import { useToast } from "../components/ToastContext";
import { ReceiptItem, ReceiptType, TransferType } from "../types";

export function useReviewLogic() {
  const router = useRouter();
  const { receipts, updateReceipt, removeReceipt, clearReceipts } =
    useReceiptContext();
  const { selectedClientId, clients } = useClientContext();
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] =
    useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();
  const { addToast } = useToast();

  // リロード警告を有効化（データがある場合のみ）
  useReloadWarning(
    receipts.length > 0,
    "ページをリロードすると画像とPDFが表示できなくなる可能性があります。続けますか？"
  );

  // 選択中の顧問先
  const selectedClient = useMemo(
    () =>
      selectedClientId ? clients.find((c) => c.id === selectedClientId) : null,
    [selectedClientId, clients]
  );

  // 未確認アイテムのみをフィルタリング
  const unconfirmedReceipts = useMemo(() => {
    return receipts.filter((receipt) => !confirmedItems.has(receipt.id));
  }, [receipts, confirmedItems]);

  // 現在のレシート - 未確認のもののみから選択
  const currentReceipt = useMemo(
    () => unconfirmedReceipts[currentIndex] || null,
    [unconfirmedReceipts, currentIndex]
  );

  // データが存在しない場合のインデックス調整
  useEffect(() => {
    if (unconfirmedReceipts.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= unconfirmedReceipts.length) {
      setCurrentIndex(Math.max(0, unconfirmedReceipts.length - 1));
    }
  }, [unconfirmedReceipts, currentIndex]);

  // 初期表示時にisConfirmedフラグがついているアイテムを確認済みセットに追加
  useEffect(() => {
    const storedConfirmed = sessionStorage.getItem("confirmedItems");

    const newConfirmedItems = new Set<string>();

    // セッションストレージから読み込み
    if (storedConfirmed) {
      try {
        const parsed: string[] = JSON.parse(storedConfirmed);
        parsed.forEach((id) => newConfirmedItems.add(id));
      } catch (e) {
        console.error("Failed to parse confirmed items from storage:", e);
      }
    }

    // レシートからisConfirmedフラグが付いたものを追加
    receipts.forEach((receipt) => {
      if (receipt.isConfirmed) {
        newConfirmedItems.add(receipt.id);
      }
    });

    setConfirmedItems(newConfirmedItems);

    // 更新されたリストをセッションストレージに保存
    sessionStorage.setItem(
      "confirmedItems",
      JSON.stringify([...newConfirmedItems])
    );
  }, [receipts]);

  // PDFを開く処理
  const handleOpenPdf = useCallback(
    (pdfUrl: string) => {
      try {
        if (pdfUrl.startsWith("blob:") || pdfUrl.startsWith("http")) {
          window.open(pdfUrl, "_blank");
        } else if (pdfUrl.startsWith("data:application/pdf")) {
          const byteCharacters = atob(pdfUrl.split(",")[1]);
          const byteNumbers = new Array(byteCharacters.length)
            .fill(0)
            .map((_, i) => byteCharacters.charCodeAt(i));
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
        } else {
          throw new Error("無効なPDF URLです");
        }
      } catch (err) {
        handleError(err, {
          fallbackMessage: "PDFを開けませんでした",
          showToast: true,
        });
      }
    },
    [handleError]
  );

  // アイテムを削除
  const handleDeleteItem = useCallback(
    (id: string) => {
      const loadingId = startLoading("レシートを削除中...");

      try {
        const receiptToDelete = receipts.find((receipt) => receipt.id === id);
        if (!receiptToDelete) return;

        // BlobURLを解放
        if (receiptToDelete.imageUrls) {
          receiptToDelete.imageUrls.forEach((imageUrl) => {
            if (imageUrl.startsWith("blob:")) {
              URL.revokeObjectURL(imageUrl);
            }
          });
        }
        if (receiptToDelete.pdfUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(receiptToDelete.pdfUrl);
        }

        // 確認済みアイテムリストからも削除
        setConfirmedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          // セッションストレージも更新
          sessionStorage.setItem("confirmedItems", JSON.stringify([...newSet]));
          return newSet;
        });

        // コンテキスト経由で削除
        removeReceipt(id);

        setItemToDelete(null);
        setIsConfirmDialogOpen(false);

        // インデックスを調整
        if (currentIndex >= receipts.length - 1) {
          setCurrentIndex(Math.max(0, receipts.length - 2));
        }

        addToast("レシートを削除しました", "success");
      } catch (err) {
        handleError(err, {
          fallbackMessage: "レシートの削除に失敗しました",
          showToast: true,
        });
      } finally {
        stopLoading(loadingId);
      }
    },
    [
      receipts,
      currentIndex,
      removeReceipt,
      startLoading,
      stopLoading,
      handleError,
      addToast,
    ]
  );

  // すべてのデータをクリア
  const handleClearAllData = useCallback(() => {
    const loadingId = startLoading("すべてのデータを削除中...");

    try {
      // BlobURLを解放
      receipts.forEach((receipt) => {
        if (receipt.imageUrls) {
          receipt.imageUrls.forEach((imageUrl) => {
            if (imageUrl.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(imageUrl);
              } catch (e) {
                console.error("Failed to revoke image URL:", e);
              }
            }
          });
        }
        if (receipt.pdfUrl?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(receipt.pdfUrl);
          } catch (e) {
            console.error("Failed to revoke PDF URL:", e);
          }
        }
      });

      // コンテキスト経由で全削除
      clearReceipts();
      setIsConfirmDialogOpen(false);

      // 確認済みアイテムもクリア
      setConfirmedItems(new Set());
      sessionStorage.removeItem("confirmedItems");

      addToast("すべてのデータを削除しました", "success");
    } catch (err) {
      handleError(err, {
        fallbackMessage: "データの削除に失敗しました",
        showToast: true,
      });
    } finally {
      stopLoading(loadingId);
    }
  }, [
    receipts,
    clearReceipts,
    startLoading,
    stopLoading,
    handleError,
    addToast,
  ]);

  // フィールド更新
  const handleUpdateField = useCallback(
    <K extends keyof ReceiptItem>(field: K, value: ReceiptItem[K]) => {
      if (!currentReceipt) return;
      updateReceipt(currentReceipt.id, { [field]: value });
    },
    [currentReceipt, updateReceipt]
  );

  // アイテムを確認済みとしてマーク
  const toggleConfirmed = useCallback(
    (id: string) => {
      // 現在のアイテムが要質問の場合は確認済みにできない
      const receipt = receipts.find((r) => r.id === id);
      if (receipt && receipt.status === "要質問") {
        addToast("要質問のアイテムは確認済みにできません", "error");
        return;
      }

      // isConfirmedフラグを更新
      updateReceipt(id, { isConfirmed: !confirmedItems.has(id) });

      setConfirmedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        // セッションストレージに保存
        sessionStorage.setItem("confirmedItems", JSON.stringify([...newSet]));
        return newSet;
      });

      addToast(
        confirmedItems.has(id) ? "確認を解除しました" : "確認済みにしました",
        "success"
      );
    },
    [receipts, confirmedItems, updateReceipt, addToast]
  );

  // 前のアイテムへ移動
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // 次のアイテムへ移動
  const goToNext = useCallback(() => {
    if (currentIndex < unconfirmedReceipts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, unconfirmedReceipts.length]);

  // Supabase登録ページへ移動
  const goToExport = useCallback(() => {
    router.push("/export");
  }, [router]);

  // 選択したタイプのサブタイプを取得する関数
  const getSubTypesForSelectedType = useCallback(
    (type: string | null) => {
      if (!selectedClient || !type) return [];

      const docType = selectedClient.documentTypes.find(
        (dt) => dt.type === type
      );
      return docType ? docType.subTypes : [];
    },
    [selectedClient]
  );

  return {
    // 状態
    receipts,
    unconfirmedReceipts,
    currentReceipt,
    currentIndex,
    confirmedItems,
    error,
    setError,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    itemToDelete,
    setItemToDelete,

    // 顧問先
    selectedClient,

    // アクション
    handleOpenPdf,
    handleDeleteItem,
    handleClearAllData,
    handleUpdateField,
    toggleConfirmed,
    goToPrevious,
    goToNext,
    goToExport,
    getSubTypesForSelectedType,

    // 型定義
    typeOptions: [
      "領収書",
      "明細書",
      "契約書",
      "見積書",
      "通帳",
    ] as ReceiptType[],
    transferTypeOptions: ["受取", "渡し", "内部資料"] as TransferType[],
  };
}
