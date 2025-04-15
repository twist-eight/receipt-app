// 中心的な型定義ファイル

// 基本的なレスポンス型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// エラー状態の型
export interface ErrorState {
  message: string | null;
  code?: string;
  field?: string;
}

// ローディング状態の型
export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  total?: number;
  message?: string;
}

// ページネーション状態の型
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// フィルター条件の型
export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  type?: string;
  transferType?: TransferType;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// 顧問先に関する型定義
export interface Client {
  id: string;
  name: string;
  documentTypes: DocumentTypeConfig[];
  updatedAt?: string;
  createdAt?: string;
}

// ドキュメント種類の設定
export interface DocumentTypeConfig {
  type: string;
  subTypes: string[];
  properties?: CustomProperty[];
}

// カスタムプロパティの設定
export interface CustomProperty {
  name: string;
  type: "text" | "select" | "number" | "date";
  options?: string[];
}

// 領収書アイテムの型定義
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
}

// 領収書タイプの厳格な型定義
export type ReceiptType = "領収書" | "明細書" | "契約書" | "見積書" | "通帳";

// 領収書ステータスの厳格な型定義
export type ReceiptStatus = "完了" | "要質問";

// 授受区分の厳格な型定義
export type TransferType = "受取" | "渡し" | "内部資料";

// OCR設定の型定義
export interface OcrConfigSettings {
  apiKey: string;
  defaultLanguage: string;
  autoApplyResults: boolean;
}

// OCR結果の型定義
export interface OCRResult {
  text: string;
  vendor?: string;
  date?: string;
  amount?: number;
  tNumber?: string;
  items?: {
    description: string;
    price: number;
    quantity?: number;
  }[];
  confidence: number;
}

// OCR処理のオプション
export interface OCROptions {
  language?: string;
  documentType?: string;
}

// SupabaseSync設定のオプション
export interface SupabaseSyncOptions {
  transferType: string;
  subType?: string;
}
