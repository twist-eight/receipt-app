export interface ReceiptItem {
  id: string;
  imageUrls: string[]; // Changed from imageUrl to imageUrls array
  pdfUrl: string;
  date: string;
  vendor: string;
  amount: number;
  type: string;
  memo: string;
  tag: string;
  status: string;
}

export type ReceiptType = "領収書" | "明細書" | "契約書" | "見積書" | "通帳";

export type ReceiptStatus = "完了" | "要質問";

export interface ReceiptFormState {
  date: string;
  vendor: string;
  amount: number;
  type: ReceiptType;
  memo: string;
  tag: string;
  status: ReceiptStatus;
}
