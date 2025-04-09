export interface ReceiptItem {
  id: string;
  imageUrls: string[];
  pdfUrl: string;
  pdfPath?: string;
  thumbnailPath?: string; // 変更: サムネイルパスを保存
  thumbnailUrl?: string; // 追加: 表示用のサムネイルURL
  date: string;
  updatedAt: string;
  vendor: string;
  amount: number;
  type: string;
  memo: string;
  tag: string;
  status: string;
  transferType?: TransferType;
  subType?: string;
  isConfirmed?: boolean;
}

export type ReceiptType = "領収書" | "明細書" | "契約書" | "見積書" | "通帳";

export type ReceiptStatus = "完了" | "要質問";

export type TransferType = "受取" | "渡し" | "内部資料";
