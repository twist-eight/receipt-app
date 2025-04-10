import { useState, useEffect } from "react";
import OcrSettings, { OcrConfigSettings } from "../components/OcrSettings";
import Link from "next/link";

export default function OcrSettingsPage() {
  const [settings, setSettings] = useState<OcrConfigSettings | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 初期表示時に保存された設定を読み込む
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem("ocrSettings");
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (err) {
        console.error("設定の読み込みに失敗しました:", err);
        setMessage({
          type: "error",
          text: "保存された設定の読み込みに失敗しました",
        });
      }
    };

    loadSettings();
  }, []);

  // 設定保存処理
  const handleSaveSettings = (newSettings: OcrConfigSettings) => {
    try {
      localStorage.setItem("ocrSettings", JSON.stringify(newSettings));
      setSettings(newSettings);
      setMessage({
        type: "success",
        text: "設定が保存されました",
      });

      // 成功メッセージは3秒後に消える
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err) {
      console.error("設定の保存に失敗しました:", err);
      setMessage({
        type: "error",
        text: "設定の保存中にエラーが発生しました",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">OCR設定</h1>

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

      <OcrSettings
        onSave={handleSaveSettings}
        initialSettings={settings || undefined}
      />

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">OCR機能について</h2>
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="mb-2">
            OCR（光学文字認識）機能を使って、領収書や明細書から自動的にテキストを抽出できます。
          </p>
          <p className="mb-2">
            この機能を利用するには、対応するOCRサービスのAPIキーが必要です。
          </p>
          <p>主なOCR機能:</p>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>領収書から取引先、日付、金額などの自動抽出</li>
            <li>明細書から詳細項目の自動抽出</li>
            <li>複数言語対応（日本語・英語）</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/ocr"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            OCR処理ページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
