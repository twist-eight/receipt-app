import Link from "next/link";
import { useClientContext } from "../contexts/ClientContext";
import { useEffect, useState } from "react";

export default function Home() {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const [error, setError] = useState<string | null>(null);

  // 初期表示時、顧問先が1つもない場合はエラーメッセージを表示
  useEffect(() => {
    if (clients.length === 0) {
      setError("顧問先が登録されていません。先に顧問先を設定してください。");
    } else {
      setError(null);
    }
  }, [clients]);

  const selectedClient = clients.find(
    (client) => client.id === selectedClientId
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">領収書処理システム</h1>

      {/* 顧問先選択セクション */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">顧問先選択</h2>

        {error ? (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
            <Link
              href="/clients"
              className="ml-2 text-blue-600 hover:underline"
            >
              顧問先設定ページへ
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label
                htmlFor="client-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                作業対象の顧問先:
              </label>
              <select
                id="client-select"
                value={selectedClientId || ""}
                onChange={(e) => setSelectedClientId(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">選択してください</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="font-medium">現在の選択: {selectedClient.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  この顧問先を対象に作業を進めます。途中で変更する場合はトップページに戻ってください。
                </p>
              </div>
            )}
          </>
        )}
      </div>

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
            データベース登録ページへ
          </Link>
        </li>
      </ul>
    </div>
  );
}
