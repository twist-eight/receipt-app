// src/contexts/LoadingContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
} from "react";
import LoadingSpinner from "../components/LoadingSpinner";

interface LoadingContextProps {
  isLoading: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  updateLoadingMessage: (message: string) => void;
  updateProgress: (current: number, total?: number) => void;
  loadingMessage: string;
  progress: number | null; // 進捗状況（0〜100）
}

const LoadingContext = createContext<LoadingContextProps | undefined>(
  undefined
);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("読み込み中...");
  const [progress, setProgress] = useState<number | null>(null);

  // ローディング状態のスタック追跡（複数箇所からの同時リクエスト対応）
  const loadingStackRef = useRef<Array<{ id: number; message: string }>>([]);
  const loadingIdCounterRef = useRef(0);

  const startLoading = (message?: string) => {
    // 新しいローディングを追加
    const loadingId = loadingIdCounterRef.current++;
    const loadingItem = { id: loadingId, message: message || "読み込み中..." };
    loadingStackRef.current.push(loadingItem);

    // ローディング状態とメッセージを更新
    setIsLoading(true);
    if (message) setLoadingMessage(message);
    setProgress(null); // 進捗をリセット

    // IDを返して、後で特定のローディングを停止できるようにする
    return loadingId;
  };

  const stopLoading = (loadingId?: number) => {
    if (loadingId !== undefined) {
      // 特定のローディングのみを停止
      loadingStackRef.current = loadingStackRef.current.filter(
        (item) => item.id !== loadingId
      );
    } else {
      // すべてのローディングを停止
      loadingStackRef.current = [];
    }

    // スタックが空になったらローディング状態を解除
    if (loadingStackRef.current.length === 0) {
      setIsLoading(false);
      setProgress(null);
    } else {
      // 最新のローディングメッセージを表示
      const latestLoading =
        loadingStackRef.current[loadingStackRef.current.length - 1];
      setLoadingMessage(latestLoading.message);
    }
  };

  const updateLoadingMessage = (message: string) => {
    if (loadingStackRef.current.length > 0) {
      // 最新のローディングのメッセージを更新
      const latestIndex = loadingStackRef.current.length - 1;
      loadingStackRef.current[latestIndex].message = message;
    }
    setLoadingMessage(message);
  };

  const updateProgress = (current: number, total?: number) => {
    if (total) {
      const progressPercentage = Math.round((current / total) * 100);
      setProgress(progressPercentage);
    } else {
      setProgress(current);
    }
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        startLoading,
        stopLoading,
        updateLoadingMessage,
        updateProgress,
        loadingMessage,
        progress,
      }}
    >
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <LoadingSpinner size="large" text={loadingMessage} />
            {progress !== null && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 text-center mt-1">
                  {progress}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};
