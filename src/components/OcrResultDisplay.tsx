import React from "react";
import { OCRResult } from "../utils/ocrService";

interface OcrResultDisplayProps {
  result: OCRResult;
  className?: string;
}

const OcrResultDisplay: React.FC<OcrResultDisplayProps> = ({
  result,
  className = "",
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
    </div>
  );
};

export default OcrResultDisplay;
