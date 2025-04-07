import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function SupabasePage() {
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectInfo, setProjectInfo] = useState<{
    url: string;
    version: string;
    timestamp: string;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    message: string;
  }>({ isConnected: false, message: "接続確認中..." });

  // プロジェクト情報と接続ステータスの取得
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Supabaseの接続確認
        const { error } = await supabase.auth.getSession();

        if (error) {
          setConnectionStatus({
            isConnected: false,
            message: `接続エラー: ${error.message}`,
          });
        } else {
          setConnectionStatus({
            isConnected: true,
            message: "Supabase接続済み",
          });
        }

        // プロジェクト情報の取得を試みる
        try {
          const { data } = await supabase
            .from("supabase_functions")
            .select("version")
            .limit(1)
            .single();
          setProjectInfo({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || "設定済み",
            version: data?.version || "バージョン情報取得済み",
            timestamp: new Date().toLocaleString(),
          });
        } catch {
          // 特定のテーブルが存在しなくてもエラーにしない
          setProjectInfo({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || "設定済み",
            version: "バージョン情報なし",
            timestamp: new Date().toLocaleString(),
          });
        }
      } catch (error) {
        setConnectionStatus({
          isConnected: false,
          message: `接続確認中にエラーが発生しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        setMessage({
          type: "error",
          text: "Supabase接続の確認に失敗しました",
        });
      }
    };

    checkConnection();
  }, []);

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

        {/* 接続ステータス表示 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="flex items-center">
            {connectionStatus.isConnected ? (
              <span className="text-green-600 font-medium flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {connectionStatus.message}
              </span>
            ) : (
              <span className="text-red-600 font-medium flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {connectionStatus.message}
              </span>
            )}
          </div>
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
