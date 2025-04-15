// src/utils/errorUtils.ts

/**
 * エラーオブジェクトからエラーメッセージを抽出
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    // Supabaseなどのエラーオブジェクトに対応
    if (
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
    ) {
      return (error as Record<string, string>).message;
    }

    // その他のエラー情報を持つオブジェクト
    if (
      "error" in error &&
      typeof (error as Record<string, unknown>).error === "string"
    ) {
      return (error as Record<string, string>).error;
    }
  }

  return "不明なエラーが発生しました";
};

/**
 * エラーをキャッチして標準的な形式で処理するラッパー関数
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    // カスタムエラーハンドラがあれば実行
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error("Error caught in withErrorHandling:", error);
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * ブラウザ固有のエラーを処理するためのユーティリティ
 */
export const handleBrowserError = (
  error: unknown
): { type: string; message: string } => {
  // ストレージクォータ超過エラー
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return {
      type: "storage",
      message:
        "ブラウザのストレージ容量が不足しています。不要なデータを削除してください。",
    };
  }

  // ネットワークエラー
  if (error instanceof TypeError && error.message.includes("network")) {
    return {
      type: "network",
      message:
        "ネットワーク接続に問題があります。インターネット接続を確認してください。",
    };
  }

  // その他のブラウザエラー
  return {
    type: "browser",
    message: getErrorMessage(error),
  };
};
