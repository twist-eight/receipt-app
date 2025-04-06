import React from "react";
import Image from "next/image";
import { ReceiptItem } from "../types/receipt";

interface ReceiptCardProps {
  receipt: ReceiptItem;
  onChange: <K extends keyof ReceiptItem>(
    field: K,
    value: ReceiptItem[K]
  ) => void;
  onOpenPdf: (pdfUrl: string) => void;
  isSelected?: boolean;
  onSelectChange?: (isSelected: boolean) => void;
  showCheckbox?: boolean;
  onDelete?: () => void;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  onChange,
  onOpenPdf,
  isSelected = false,
  onSelectChange,
  showCheckbox = false,
  onDelete,
}) => {
  return (
    <div className="border p-4 rounded shadow-md bg-white relative">
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
          aria-label="削除"
          title="このレシートを削除"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      <div className="flex gap-4 mb-2 items-center">
        {showCheckbox && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) =>
                onSelectChange && onSelectChange(e.target.checked)
              }
              className="mr-2 h-5 w-5"
            />
          </div>
        )}

        {receipt.imageUrl && (
          <div className="relative w-32 h-40 border rounded overflow-hidden">
            <Image
              src={receipt.imageUrl}
              alt="レシート画像"
              fill
              className="object-contain rounded"
            />
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {receipt.pdfUrl && (
            <button
              onClick={() => onOpenPdf(receipt.pdfUrl)}
              className="text-blue-600 underline text-sm hover:text-blue-800 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              PDFを開く
            </button>
          )}
          <p className="text-sm text-gray-500">
            ID: {receipt.id.substring(0, 8)}...
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">日付</label>
          <input
            type="date"
            value={receipt.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">取引先</label>
          <input
            type="text"
            value={receipt.vendor}
            placeholder="取引先"
            onChange={(e) => onChange("vendor", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">金額</label>
          <input
            type="number"
            value={receipt.amount || ""}
            placeholder="金額"
            onChange={(e) => onChange("amount", Number(e.target.value))}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">種類</label>
          <select
            value={receipt.type}
            onChange={(e) => onChange("type", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="領収書">領収書</option>
            <option value="明細書">明細書</option>
            <option value="契約書">契約書</option>
            <option value="見積書">見積書</option>
            <option value="通帳">通帳</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">メモ</label>
          <input
            type="text"
            value={receipt.memo}
            placeholder="メモ"
            onChange={(e) => onChange("memo", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">タグ</label>
          <input
            type="text"
            value={receipt.tag}
            placeholder="タグ（交際費など）"
            onChange={(e) => onChange("tag", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">ステータス</label>
          <select
            value={receipt.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="完了">完了</option>
            <option value="要質問">要質問</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ReceiptCard;
