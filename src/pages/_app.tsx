// src/pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { ReceiptProvider } from "../contexts/ReceiptContext";
import { ClientProvider, useClientContext } from "../contexts/ClientContext";

// HeaderComponentを作成
const HeaderComponent = () => {
  const { selectedClientId, clients } = useClientContext();

  // 選択中の顧問先情報
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-2">
        {/* 顧問先表示エリア */}
        {selectedClient ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2 flex justify-between items-center">
            <div>
              <span className="font-medium text-sm">選択中の顧問先:</span>
              <span className="ml-2 text-blue-700 font-bold">
                {selectedClient.name}
              </span>
            </div>
            <Link href="/" className="text-xs text-blue-600 hover:underline">
              変更
            </Link>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-2 flex justify-between items-center">
            <span className="text-sm text-yellow-700">
              顧問先が選択されていません
            </span>
            <Link href="/" className="text-xs text-blue-600 hover:underline">
              選択する
            </Link>
          </div>
        )}

        {/* 既存のナビゲーションメニュー */}
        <nav className="flex items-center gap-6 text-sm overflow-x-auto">
          <Link
            href="/"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            🏠 トップ
          </Link>
          <Link
            href="/upload"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            📤 アップロード
          </Link>
          <Link
            href="/group"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            🔗 グループ化
          </Link>
          <Link
            href="/ocr"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            🔍 OCR実行
          </Link>
          <Link
            href="/review"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            🧐 レビュー
          </Link>
          <Link
            href="/export"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            📊 Supabaseへ登録
          </Link>
          <Link
            href="/clients"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            👥 顧問先設定
          </Link>
          <Link
            href="/supabase"
            className="text-blue-600 hover:underline whitespace-nowrap"
          >
            ⚙️ Supabase設定
          </Link>
        </nav>
      </div>
    </header>
  );
};

// Appコンポーネント内で、HeaderComponentをラップする必要があります
function AppWithProviders({ Component, pageProps }: AppProps) {
  return (
    <ClientProvider>
      <ReceiptProvider>
        <div className="min-h-screen bg-gray-50">
          <HeaderWithClient />
          <main className="py-6 px-4">
            <Component {...pageProps} />
          </main>
          <footer className="py-4 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} 領収書処理システム
          </footer>
        </div>
      </ReceiptProvider>
    </ClientProvider>
  );
}

// ClientContextを使用するためにヘッダーを分離
const HeaderWithClient = () => {
  return <HeaderComponent />;
};

export default function App(props: AppProps) {
  return <AppWithProviders {...props} />;
}
