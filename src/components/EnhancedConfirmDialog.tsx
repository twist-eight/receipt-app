// src/components/EnhancedConfirmDialog.tsx
import React, { useEffect } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  extraContent?: React.ReactNode;
  icon?: React.ReactNode;
  confirmButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const EnhancedConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDestructive = false,
  extraContent,
  icon,
  confirmButtonProps,
  cancelButtonProps,
}) => {
  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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
      aria-labelledby="dialog-title"
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start mb-4">
          {icon && <div className="mr-3 flex-shrink-0">{icon}</div>}
          <div>
            <h3 id="dialog-title" className="text-lg font-bold">
              {title}
            </h3>
            <p className="mt-2 text-gray-700">{message}</p>
          </div>
        </div>

        {/* カスタムコンテンツがあれば表示 */}
        {extraContent && <div className="mb-6">{extraContent}</div>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            {...cancelButtonProps}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${
              isDestructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white rounded transition`}
            autoFocus
            {...confirmButtonProps}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConfirmDialog;
