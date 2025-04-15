// src/components/OcrResultDisplay.tsx
import React from "react";
import { OCRResult } from "../services/ocrService";
import Image from "next/image";

interface OcrResultDisplayProps {
  result: OCRResult;
  thumbnailUrl?: string; // サムネイル表示用のURL (追加)
  className?: string;
  onApply?: () => void; // 結果適用ボタン用 (追加)
}

const OcrResultDisplay: React.FC<OcrResultDisplayProps> = ({
  result,
  thumbnailUrl,
  className = "",
  onApply,
}) => {
  // 信頼度に基づいて色を決定
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-700";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">OCR結果</h3>
        <span
          className={`${getConfidenceColor(
            result.confidence
          )} text-sm font-medium`}
        >
          信頼度: {Math.round(result.confidence * 100)}%
        </span>
      </div>

      {/* サムネイル表示部分を追加 */}
      {thumbnailUrl && (
        <div className="mb-4 flex justify-center">
          <div className="relative h-40 w-40 border rounded overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt="ドキュメントのサムネイル"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {result.vendor && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">取引先:</span>
            <span className="font-medium">{result.vendor}</span>
          </div>
        )}

        {result.date && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">日付:</span>
            <span className="font-medium">{result.date}</span>
          </div>
        )}

        {result.amount !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">金額:</span>
            <span className="font-medium">
              ¥{result.amount.toLocaleString()}
            </span>
          </div>
        )}

        {result.items && result.items.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-1">内訳:</p>
            <div className="bg-gray-50 p-2 rounded text-sm">
              {result.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between py-1 border-b border-gray-200 last:border-0"
                >
                  <span>{item.description}</span>
                  <span>¥{item.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {result.text && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-1">抽出されたテキスト:</p>
          <div className="bg-gray-50 p-2 rounded text-sm font-mono whitespace-pre-wrap border border-gray-200">
            {result.text}
          </div>
        </div>
      )}

      {/* 結果適用ボタンを追加 */}
      {onApply && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onApply}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            この結果を適用
          </button>
        </div>
      )}
    </div>
  );
};

export default OcrResultDisplay;
