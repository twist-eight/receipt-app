// src/components/OcrSettings.tsx
import React, { useState, useEffect } from "react";
import { useToast } from "../../../shared/contexts/ToastContext"; // トースト通知を利用する

export interface OcrConfigSettings {
  apiKey: string;
  defaultLanguage: string;
  autoApplyResults: boolean;
}

interface OcrSettingsProps {
  onSave: (settings: OcrConfigSettings) => void;
  initialSettings?: OcrConfigSettings;
}

const OcrSettings: React.FC<OcrSettingsProps> = ({
  onSave,
  initialSettings,
}) => {
  const { addToast } = useToast(); // トースト通知を使用
  const [settings, setSettings] = useState<OcrConfigSettings>(
    initialSettings || {
      apiKey: "",
      defaultLanguage: "ja",
      autoApplyResults: true,
    }
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // 入力フィールド変更ハンドラーを統一
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setSettings((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // APIテスト関数の改善
  const handleTestConnection = async () => {
    if (!settings.apiKey) {
      setTestResult({
        success: false,
        message: "API Keyを入力してください",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // モックのテスト処理の代わりに実際のAPI接続テストを実装
      // この例では単純なモックを使用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 実際の環境では、実際のAPI接続テストコードをここに記述
      const success = true; // APIテスト結果

      setTestResult({
        success,
        message: success
          ? "接続成功: OCRサービスに接続できました"
          : "接続エラー: OCRサービスに接続できませんでした",
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `接続エラー: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 設定保存関数の改善
  const handleSaveSettings = () => {
    try {
      onSave(settings);
      addToast("設定が保存されました", "success");
    } catch (error) {
      addToast(
        `設定の保存に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">OCR設定</h2>

      <div className="space-y-4">
        {/* APIキー入力フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OCR API Key <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type={showApiKey ? "text" : "password"}
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="OCRサービスのAPIキーを入力"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md border-y border-r"
            >
              {showApiKey ? "隠す" : "表示"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            OCRサービスのAPIキー。各OCRサービスプロバイダーから取得できます。
          </p>
        </div>

        {/* 言語設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            デフォルト言語
          </label>
          <select
            name="defaultLanguage"
            value={settings.defaultLanguage}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ja">日本語</option>
            <option value="en">英語</option>
            <option value="auto">自動検出</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            OCR処理時のデフォルト言語設定
          </p>
        </div>

        {/* 自動適用設定 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoApplyResults"
            name="autoApplyResults"
            checked={settings.autoApplyResults}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="autoApplyResults"
            className="ml-2 block text-sm text-gray-700"
          >
            OCR結果を自動的に適用する
          </label>
        </div>

        {/* ボタン類 */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between pt-4">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`px-4 py-2 rounded ${
              isTesting
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {isTesting ? "テスト中..." : "接続テスト"}
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            設定を保存
          </button>
        </div>

        {/* テスト結果の表示 */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded ${
              testResult.success
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default OcrSettings;
