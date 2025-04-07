import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { ReceiptProvider } from "../contexts/ReceiptContext";
import { ClientProvider } from "../contexts/ClientContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClientProvider>
      <ReceiptProvider>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-md">
            <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6 text-sm overflow-x-auto">
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
                href="/register"
                className="text-blue-600 hover:underline whitespace-nowrap"
              >
                📄 Supabase登録
              </Link>
              <Link
                href="/export"
                className="text-blue-600 hover:underline whitespace-nowrap"
              >
                📊 Supabaseエクスポート
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
          </header>
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
