// src/features/ocr/components/OpenAISettings.tsx
import React, { useState, useEffect } from "react";
import { useToast } from "../../../shared/contexts/ToastContext";

export interface OpenAIConfigSettings {
  apiKey: string;
  model: string;
}

interface OpenAISettingsProps {
  onSave: (settings: OpenAIConfigSettings) => void;
  initialSettings?: OpenAIConfigSettings;
}

const OpenAISettings: React.FC<OpenAISettingsProps> = ({
  onSave,
  initialSettings,
}) => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<OpenAIConfigSettings>(
    initialSettings || {
      apiKey: "",
      model: "gpt-4o-mini",
    }
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    // ローカルストレージからAPIキーを取得
    const savedApiKey = localStorage.getItem("openai_api_key");
    const savedModel = localStorage.getItem("openai_model");

    if (savedApiKey || savedModel) {
      setSettings({
        apiKey: savedApiKey || "",
        model: savedModel || "gpt-4o-mini",
      });
    } else if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      // OpenAI APIの接続テスト
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: "接続成功: OpenAI APIに接続できました",
        });
      } else {
        const errorData = await response.json();
        setTestResult({
          success: false,
          message: `接続エラー: ${
            errorData.error?.message || response.statusText
          }`,
        });
      }
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
    try {
      // ローカルストレージに保存
      localStorage.setItem("openai_api_key", settings.apiKey);
      localStorage.setItem("openai_model", settings.model);

      onSave(settings);
      addToast("OpenAI設定を保存しました", "success");
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
      <h2 className="text-xl font-semibold mb-4">OpenAI API設定</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type={showApiKey ? "text" : "password"}
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="sk-..."
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
            OpenAI
            APIのシークレットキー。OpenAIのアカウントページで取得できます。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            使用モデル
          </label>
          <select
            name="model"
            value={settings.model}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="gpt-4o-mini">GPT-4o Mini（推奨）</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4o">GPT-4o（高精度・高コスト）</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            OCR結果を構造化するためのAIモデル
          </p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
          <p className="font-medium">OCR精度向上について：</p>
          <p className="mt-1">
            OpenAI
            APIを連携することで、OCRの精度が大幅に向上します。特に領収書や請求書の複雑なレイアウトからの情報抽出精度が向上します。
          </p>
          <p className="mt-1">
            APIキーはお客様のブラウザにのみ保存され、サーバーには送信されません。
          </p>
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

export default OpenAISettings;
