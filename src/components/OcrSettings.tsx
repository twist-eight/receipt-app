import React, { useState, useEffect } from "react";

interface OcrSettingsProps {
  onSave: (settings: OcrConfigSettings) => void;
  initialSettings?: OcrConfigSettings;
}

export interface OcrConfigSettings {
  apiKey: string;
  defaultLanguage: string;
  autoApplyResults: boolean;
}

const OcrSettings: React.FC<OcrSettingsProps> = ({
  onSave,
  initialSettings,
}) => {
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
      // OCRサービスの接続テスト（デモでは成功するシミュレーション）
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // この部分は実際のOCRサービスとの接続テストに置き換える
      setTestResult({
        success: true,
        message: "接続成功: OCRサービスに接続できました",
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

  const handleSaveSettings = () => {
    onSave(settings);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">OCR設定</h2>

      <div className="space-y-4">
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
