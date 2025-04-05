import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { ReceiptProvider } from "../contexts/ReceiptContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ReceiptProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-md">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              🏠 トップ
            </Link>
            <Link href="/upload" className="text-blue-600 hover:underline">
              📤 アップロード
            </Link>
            <Link href="/review" className="text-blue-600 hover:underline">
              🧐 レビュー
            </Link>
            <Link href="/export" className="text-blue-600 hover:underline">
              📄 CSV出力
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
  );
}
