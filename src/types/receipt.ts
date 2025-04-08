// src/types/receipt.ts
export interface ReceiptItem {
  id: string;
  imageUrls: string[]; // Changed from imageUrl to imageUrls array
  pdfUrl: string;
  date: string; // 領収書の日付、初期値は空に
  updatedAt: string; // 追加: 更新日時
  vendor: string;
  amount: number;
  type: string;
  memo: string;
  tag: string;
  status: string;
  transferType?: TransferType;
  subType?: string;
  isConfirmed?: boolean; // 追加：確認済みフラグ
}

export type ReceiptType = "領収書" | "明細書" | "契約書" | "見積書" | "通帳";

export type ReceiptStatus = "完了" | "要質問";

export type TransferType = "受取" | "渡し" | "内部資料";
