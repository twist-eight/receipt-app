import React, { useState, useEffect } from "react";

interface NotionSettingsProps {
  onSave: (settings: NotionConfigSettings) => void;
  initialSettings?: NotionConfigSettings;
}

export interface NotionConfigSettings {
  apiKey: string;
  defaultTemplateId?: string;
}

const NotionSettings: React.FC<NotionSettingsProps> = ({
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<NotionConfigSettings>(
    initialSettings || {
      apiKey: "",
      defaultTemplateId: "",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Notion APIの基本的な接続テスト
      const response = await fetch("https://api.notion.com/v1/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `接続成功: ${
            data.name || data.bot?.owner?.name || "Unknown user"
          }`,
        });
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        setTestResult({
          success: false,
          message: `接続エラー: ${errorData.message || response.statusText}`,
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
    onSave(settings);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Notion連携設定</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notion API Key <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type={showApiKey ? "text" : "password"}
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="secret_xxxx..."
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
            Notion APIのシークレットキー。Notionの統合設定ページで取得できます。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            デフォルトテンプレートID (オプション)
          </label>
          <input
            type="text"
            name="defaultTemplateId"
            value={settings.defaultTemplateId || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <p className="text-xs text-gray-500 mt-1">
            新しい顧問先用に複製するデフォルトのNotionデータベースID
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

export default NotionSettings;
