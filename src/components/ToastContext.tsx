// src/components/ToastContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  autoClose?: boolean;
}

interface ToastContextProps {
  toasts: Toast[];
  addToast: (
    message: string,
    type?: ToastType,
    options?: {
      duration?: number;
      autoClose?: boolean;
    }
  ) => string; // トーストIDを返す
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = "top-right",
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ポジションに応じたクラス
  const positionClass = {
    "top-right": "fixed top-0 right-0 p-4 z-50",
    "top-left": "fixed top-0 left-0 p-4 z-50",
    "bottom-right": "fixed bottom-0 right-0 p-4 z-50",
    "bottom-left": "fixed bottom-0 left-0 p-4 z-50",
    "top-center": "fixed top-0 left-1/2 transform -translate-x-1/2 p-4 z-50",
    "bottom-center":
      "fixed bottom-0 left-1/2 transform -translate-x-1/2 p-4 z-50",
  }[position];

  // トーストを追加
  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options?: { duration?: number; autoClose?: boolean }
    ): string => {
      const id = Math.random().toString(36).substr(2, 9);
      const duration =
        options?.duration ??
        (type === "error"
          ? 5000 // エラーは少し長めに表示
          : type === "success"
          ? 3000 // 成功は標準的な長さ
          : type === "warning"
          ? 4000 // 警告は少し長め
          : 3000); // 情報は標準的な長さ

      const autoClose = options?.autoClose ?? true;

      const newToast = { id, message, type, duration, autoClose };

      setToasts((prevToasts) => {
        // 最大数を超える場合、最も古いものを削除
        const updatedToasts = [...prevToasts, newToast];
        return updatedToasts.slice(
          Math.max(0, updatedToasts.length - maxToasts)
        );
      });

      if (autoClose && duration !== Infinity) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id; // トーストIDを返す（後で手動で削除できるように）
    },
    [maxToasts]
  );

  // トーストを削除
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // すべてのトーストをクリア
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <div className={positionClass}>
        <div className="space-y-2 flex flex-col items-end">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3 rounded shadow-lg transition-all duration-300 max-w-md transform translate-y-0 opacity-100 flex items-center ${
                toast.type === "success"
                  ? "bg-green-500 text-white"
                  : toast.type === "error"
                  ? "bg-red-500 text-white"
                  : toast.type === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-500 text-white"
              } animate-[fadeIn_0.3s_ease-in-out]`}
              style={{ minWidth: "240px" }}
            >
              {/* アイコン */}
              <div className="mr-3">
                {toast.type === "success" && (
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === "error" && (
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === "warning" && (
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === "info" && (
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* メッセージ */}
              <div className="flex-1">{toast.message}</div>

              {/* 閉じるボタン */}
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-white hover:text-gray-200 focus:outline-none"
                aria-label="通知を閉じる"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
