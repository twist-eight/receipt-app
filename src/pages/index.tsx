import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">領収書処理システム</h1>
      <ul className="space-y-2">
        <li>
          <Link href="/upload" className="text-blue-600 underline">
            アップロードページへ
          </Link>
        </li>
        <li>
          <Link href="/review" className="text-blue-600 underline">
            OCR結果レビューへ
          </Link>
        </li>
        <li>
          <Link href="/export" className="text-blue-600 underline">
            CSV出力ページへ
          </Link>
        </li>
      </ul>
    </div>
  );
}
