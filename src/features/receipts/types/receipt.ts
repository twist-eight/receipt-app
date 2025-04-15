// src/types/receipt.ts と src/types/index.ts の ReceiptItem 型を統一します

// src/types/receipt.ts を修正
export interface ReceiptItem {
  id: string;
  imageUrls: string[];
  pdfUrl: string;
  pdfPath?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  date: string;
  updatedAt: string;
  vendor: string;
  amount: number;
  type: ReceiptType;
  memo: string;
  tag: string;
  status: ReceiptStatus;
  transferType?: TransferType;
  subType?: string;
  isConfirmed?: boolean;
  clientId?: string;
  tNumber?: string; // T番号を追加
  isOcrProcessed?: boolean; // OCR処理済みフラグを追加
}

export type ReceiptType = "領収書" | "明細書" | "契約書" | "見積書" | "通帳";
export type ReceiptStatus = "完了" | "要質問";
export type TransferType = "受取" | "渡し" | "内部資料";
