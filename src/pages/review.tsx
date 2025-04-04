import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

interface ReceiptItem {
  id: string;
  imageUrl: string;
  pdfUrl: string;
  date: string;
  vendor: string;
  amount: number;
  type: string;
  memo: string;
  tag: string;
  status: string;
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("ocrResults");
    if (raw) {
      const parsed = JSON.parse(raw);
      setItems(parsed);
    } else {
      router.push("/upload");
    }
  }, [router]);

  const handleChange = (
    index: number,
    field: keyof ReceiptItem,
    value: string
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const loadTestData = () => {
    const testData: ReceiptItem[] = [
      {
        id: "test001",
        imageUrl: "/sample.jpg",
        pdfUrl: "/sample.pdf",
        date: "2025-04-01",
        vendor: "テスト商店",
        amount: 1234,
        type: "領収書",
        memo: "テスト用メモ",
        tag: "交際費",
        status: "完了",
      },
    ];
    localStorage.setItem("ocrResults", JSON.stringify(testData));
    setItems(testData);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">OCR結果の確認と編集</h1>

      {items.length === 0 && (
        <div className="mb-6">
          <p className="mb-2">
            データがありません。テストデータを読み込みますか？
          </p>
          <button
            onClick={loadTestData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            テストモードを開始
          </button>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item, i) => (
          <div key={item.id} className="border p-4 rounded shadow-md">
            <div className="flex gap-4 mb-2 items-center">
              <div className="relative w-32 h-40">
                <Image
                  src={item.imageUrl}
                  alt="preview"
                  fill
                  className="object-contain rounded"
                />
              </div>
              <a
                href={item.pdfUrl}
                target="_blank"
                rel="noopener"
                className="text-blue-600 underline text-sm"
              >
                PDFを開く
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input
                type="date"
                value={item.date}
                onChange={(e) => handleChange(i, "date", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="text"
                value={item.vendor}
                placeholder="取引先"
                onChange={(e) => handleChange(i, "vendor", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="number"
                value={item.amount}
                placeholder="金額"
                onChange={(e) => handleChange(i, "amount", e.target.value)}
                className="border p-2 rounded"
              />
              <select
                value={item.type}
                onChange={(e) => handleChange(i, "type", e.target.value)}
                className="border p-2 rounded"
              >
                <option>領収書</option>
                <option>明細書</option>
                <option>契約書</option>
                <option>見積書</option>
                <option>通帳</option>
              </select>
              <input
                type="text"
                value={item.memo}
                placeholder="メモ"
                onChange={(e) => handleChange(i, "memo", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="text"
                value={item.tag}
                placeholder="タグ（交際費など）"
                onChange={(e) => handleChange(i, "tag", e.target.value)}
                className="border p-2 rounded"
              />
              <select
                value={item.status}
                onChange={(e) => handleChange(i, "status", e.target.value)}
                className="border p-2 rounded"
              >
                <option>完了</option>
                <option>要質問</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
