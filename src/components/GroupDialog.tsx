import React, { useState, useEffect } from "react";

interface GroupDialogProps {
  selectedCount: number;
  onConfirm: (groupName: string) => void;
  onCancel: () => void;
}

const GroupDialog: React.FC<GroupDialogProps> = ({
  selectedCount,
  onConfirm,
  onCancel,
}) => {
  const [groupName, setGroupName] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(groupName);
  };

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
        <p className="mb-4 text-gray-700">
          選択した {selectedCount} 個のアイテムをグループ化します。
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="groupName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              グループ名
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="例: 出張経費"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              グループ化する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupDialog;
