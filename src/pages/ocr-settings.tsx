// src/pages/ocr-settings.tsx
import { useState, useEffect } from "react";
import OcrSettings, {
  OcrConfigSettings,
} from "../features/ocr/components/OcrSettings";
import OpenAISettings, {
  OpenAIConfigSettings,
} from "../features/ocr/components/OpenAISettings";
import Link from "next/link";

export default function OcrSettingsPage() {
  const [ocrSettings, setOcrSettings] = useState<OcrConfigSettings | null>(
    null
  );
  const [openAISettings, setOpenAISettings] =
    useState<OpenAIConfigSettings | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 初期表示時に保存された設定を読み込む
  useEffect(() => {
    try {
      // OCR設定の読み込み
      const savedOcrSettings = localStorage.getItem("ocrSettings");
      if (savedOcrSettings) {
        setOcrSettings(JSON.parse(savedOcrSettings));
      }

      // OpenAI設定の読み込み
      const apiKey = localStorage.getItem("openai_api_key") || "";
      const model = localStorage.getItem("openai_model") || "gpt-4o-mini";

      if (apiKey) {
        setOpenAISettings({
          apiKey,
          model,
        });
      }
    } catch (err) {
      console.error("設定の読み込みに失敗しました:", err);
      setMessage({
        type: "error",
        text: "保存された設定の読み込みに失敗しました",
      });
    }
  }, []);

  // OCR設定保存処理
  const handleSaveOcrSettings = (newSettings: OcrConfigSettings) => {
    try {
      localStorage.setItem("ocrSettings", JSON.stringify(newSettings));
      setOcrSettings(newSettings);
      setMessage({
        type: "success",
        text: "OCR設定が保存されました",
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

  // OpenAI設定保存処理
  const handleSaveOpenAISettings = (newSettings: OpenAIConfigSettings) => {
    try {
      setOpenAISettings(newSettings);
      setMessage({
        type: "success",
        text: "OpenAI設定が保存されました",
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

      <div className="space-y-8">
        {/* OCR設定コンポーネント */}
        <OcrSettings
          onSave={handleSaveOcrSettings}
          initialSettings={ocrSettings || undefined}
        />

        {/* 新しく追加されたOpenAI設定コンポーネント */}
        <div className="mt-8">
          <OpenAISettings
            onSave={handleSaveOpenAISettings}
            initialSettings={openAISettings || undefined}
          />
        </div>

        {/* 機能説明部分 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">OCR機能について</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">基本的なOCR処理</h3>
              <p className="text-sm text-gray-700">
                Google Cloud Vision
                APIを使用して領収書や請求書から文字情報を抽出します。APIキーが必要です。
              </p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">
                AI強化OCR処理（新機能）
              </h3>
              <p className="text-sm text-gray-700">
                OpenAI
                APIを利用することで、単なる文字認識だけでなく、領収書のレイアウトを理解し、高精度で情報を抽出できます。
                特に以下の情報の抽出精度が大幅に向上します：
              </p>
              <ul className="list-disc ml-5 mt-2 text-sm">
                <li>取引先名（会社名・店舗名）</li>
                <li>日付（様々なフォーマットに対応）</li>
                <li>金額（合計額の特定精度向上）</li>
                <li>T番号・インボイス番号</li>
                <li>明細項目の正確な抽出</li>
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
      </div>
    </div>
  );
}
