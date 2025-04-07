import { useState, useEffect } from "react";
import { useClientContext } from "../contexts/ClientContext";
import SupabaseSettings, {
  SupabaseConfigSettings,
} from "../components/SupabaseSettings";
import { supabase } from "../utils/supabaseClient";

export default function SupabasePage() {
  const [globalSettings, setGlobalSettings] = useState<SupabaseConfigSettings>({
    apiKey: "",
  });
  const [showGlobalSettings, setShowGlobalSettings] = useState(true);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectInfo, setProjectInfo] = useState<{
    url: string;
    version: string;
    timestamp: string;
  } | null>(null);

  // 保存されているAPIキーを読み込む
  useEffect(() => {
    const savedApiKey = localStorage.getItem("supabaseApiKey");
    if (savedApiKey) {
      setGlobalSettings((prev) => ({ ...prev, apiKey: savedApiKey }));
    }

    // プロジェクト情報の取得
    const getProjectInfo = async () => {
      try {
        const { data } = await supabase
          .from("supabase_functions")
          .select("version")
          .limit(1)
          .single();
        setProjectInfo({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || "設定済み",
          version: data?.version || "バージョン不明",
          timestamp: new Date().toLocaleString(),
        });
      } catch (error) {
        console.error("プロジェクト情報の取得に失敗しました:", error);
        setProjectInfo({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || "設定済み",
          version: "バージョン不明",
          timestamp: new Date().toLocaleString(),
        });
      }
    };

    getProjectInfo();
  }, []);

  // グローバル設定の保存
  const handleSaveGlobalSettings = (settings: SupabaseConfigSettings) => {
    localStorage.setItem("supabaseApiKey", settings.apiKey);
    setGlobalSettings(settings);
    setMessage({ type: "success", text: "グローバル設定が保存されました" });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase連携設定</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">現在の接続情報</h2>
          <button
            onClick={() => setShowProjectInfo(!showProjectInfo)}
            className="text-blue-600 hover:underline text-sm flex items-center"
          >
            {showProjectInfo ? "閉じる" : "詳細を表示"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ml-1 transform ${
                showProjectInfo ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {showProjectInfo && projectInfo && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium">Supabase URL:</div>
              <div className="text-sm">{projectInfo.url}</div>

              <div className="text-sm font-medium">バージョン:</div>
              <div className="text-sm">{projectInfo.version}</div>

              <div className="text-sm font-medium">最終確認日時:</div>
              <div className="text-sm">{projectInfo.timestamp}</div>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-green-600 font-medium">✓ Supabase接続済み</p>
          <p className="text-sm text-gray-600 mt-1">
            環境変数で設定されたSupabase接続を使用しています。
          </p>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">接続情報</h2>
        <p className="mb-4">
          このアプリケーションは以下のテーブルを使用しています：
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li className="text-sm">clients - 顧問先情報</li>
          <li className="text-sm">receipts - 領収書データ</li>
          <li className="text-sm">pdf_metadata - PDFファイルメタデータ</li>
        </ul>

        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
          <p className="font-medium">注意：</p>
          <p>接続設定の変更が必要な場合は、環境変数を更新してください。</p>
        </div>
      </div>
    </div>
  );
}
