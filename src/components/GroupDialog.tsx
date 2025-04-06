import React, { useEffect } from "react";

interface GroupDialogProps {
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const GroupDialog: React.FC<GroupDialogProps> = ({
  selectedCount,
  onConfirm,
  onCancel,
}) => {
  // ESCキーが押された時にダイアログを閉じる
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onCancel]);

  // ダイアログが開いている間は背景のスクロールを無効にする
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-dialog-title"
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="group-dialog-title" className="text-lg font-bold mb-4">
          選択したアイテムをグループ化
        </h3>
        <p className="mb-6 text-gray-700">
          選択した {selectedCount} 個のアイテムをグループ化します。
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            グループ化する
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDialog;
