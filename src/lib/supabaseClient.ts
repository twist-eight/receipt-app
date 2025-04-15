import { createClient } from "@supabase/supabase-js";

// 環境変数が設定されているか確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  console.error("Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Supabaseクライアントを作成（オプション付き）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 詳細な診断を行うヘルパー関数
export const runDetailedStorageDiagnostics = async () => {
  try {
    // 1. 認証状態を確認
    const { data: authData, error: authError } =
      await supabase.auth.getSession();

    // 2. バケット一覧を取得
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    // 3. バケット作成を試みる
    let createAttempt = null;
    if (!buckets || !buckets.some((b) => b.name === "receipts")) {
      try {
        const { data, error } = await supabase.storage.createBucket(
          "receipts",
          {
            public: true,
          }
        );
        createAttempt = { success: !error, error: error?.message, data };
      } catch (e) {
        createAttempt = {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      success: true,
      auth: {
        session: authData?.session,
        authenticated: !!authData?.session,
        error: authError?.message,
      },
      storage: {
        buckets,
        bucketsCount: buckets?.length || 0,
        bucketsError: bucketsError?.message,
        createAttempt,
      },
      environment: {
        supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
      },
    };
  } catch (err) {
    return {
      timestamp: new Date().toISOString(),
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

// 直接ストレージURLを生成するヘルパー関数
export const getDirectStorageUrl = (
  bucketName: string,
  path: string
): string => {
  if (!supabaseUrl) return "";
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
};

// ファイルサイズをB, KB, MBに変換するヘルパー関数
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// データベース用のタイムスタンプを作成するヘルパー関数
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
