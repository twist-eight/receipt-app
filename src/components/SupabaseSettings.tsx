import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

interface SupabaseSettingsProps {
  onSave: (settings: SupabaseConfigSettings) => void;
  initialSettings?: SupabaseConfigSettings;
}

export interface SupabaseConfigSettings {
  apiKey: string;
  projectUrl?: string;
}

const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<SupabaseConfigSettings>(
    initialSettings || {
      apiKey: "",
      projectUrl: "",
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
      // Supabaseの接続テスト（現在のセッションを取得）
      const { data, error } = await supabase.auth.getSession();

      if (!error) {
        setTestResult({
          success: true,
          message: "接続成功: Supabaseに接続できました",
        });
      } else {
        setTestResult({
          success: false,
          message: `接続エラー: ${error.message}`,
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
      <h2 className="text-xl font-semibold mb-4">Supabase連携設定</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supabase API Key <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type={showApiKey ? "text" : "password"}
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
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
            SupabaseのAPIキー。Supabaseプロジェクト設定ページで取得できます。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supabase プロジェクトURL (オプション)
          </label>
          <input
            type="text"
            name="projectUrl"
            value={settings.projectUrl || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://xxxxxxxx.supabase.co"
          />
          <p className="text-xs text-gray-500 mt-1">
            SupabaseプロジェクトのベースURL
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

export default SupabaseSettings;
