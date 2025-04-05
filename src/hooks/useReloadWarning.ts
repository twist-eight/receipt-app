import { useEffect } from "react";

/**
 * ページリロードや離脱時に警告を表示するカスタムフック
 * @param isEnabled 警告を有効にするかどうか
 * @param message 表示する警告メッセージ
 */
export function useReloadWarning(isEnabled: boolean, message?: string) {
  useEffect(() => {
    if (!isEnabled) return;

    const warningMessage =
      message ||
      "このページを離れると、未保存のデータが失われます。本当に続けますか？";

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 古いブラウザ向けの対応
      e.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isEnabled, message]);
}
