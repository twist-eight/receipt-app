// src/utils/errorHandling.ts
import { ApiResponse, ErrorState } from "../types";
import { useToast } from "../components/ToastContext";

/**
 * エラーメッセージを標準化するユーティリティ
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Supabaseエラーなどの構造化されたエラー
    if ("message" in errorObj && typeof errorObj.message === "string") {
      return errorObj.message;
    }

    // その他の構造化エラー
    if ("error" in errorObj && typeof errorObj.error === "string") {
      return errorObj.error;
    }

    if ("code" in errorObj && typeof errorObj.code === "string") {
      return `エラーコード: ${errorObj.code}`;
    }
  }

  return "不明なエラーが発生しました";
}

/**
 * 共通エラーハンドリングのためのカスタムフック
 */
export function useErrorHandler() {
  const { addToast } = useToast();

  /**
   * エラーを処理し、適切な方法でユーザーに通知する
   */
  const handleError = (
    error: unknown,
    options?: {
      silent?: boolean;
      fallbackMessage?: string;
      field?: string;
      showToast?: boolean;
    }
  ): ErrorState => {
    const message = formatErrorMessage(error);
    const fallback = options?.fallbackMessage || "処理中にエラーが発生しました";
    const errorMessage = message || fallback;

    // コンソールにログ出力（開発時のデバッグ用）
    console.error("Error:", error);

    // トースト通知表示（オプション）
    if (options?.showToast !== false) {
      addToast(errorMessage, "error");
    }

    return {
      message: errorMessage,
      field: options?.field,
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    };
  };

  /**
   * 非同期関数を安全に実行するラッパー
   */
  const safeAsync = async <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: ErrorState) => void;
      silent?: boolean;
      fallbackMessage?: string;
      showSuccessToast?: boolean;
      successMessage?: string;
    }
  ): Promise<ApiResponse<T>> => {
    try {
      const data = await asyncFn();

      if (options?.onSuccess) {
        options.onSuccess(data);
      }

      if (options?.showSuccessToast && options?.successMessage) {
        addToast(options.successMessage, "success");
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorState = handleError(error, {
        silent: options?.silent,
        fallbackMessage: options?.fallbackMessage,
      });

      if (options?.onError) {
        options.onError(errorState);
      }

      return {
        success: false,
        error: errorState.message || "エラーが発生しました",
      };
    }
  };

  return {
    handleError,
    safeAsync,
    formatErrorMessage,
  };
}
