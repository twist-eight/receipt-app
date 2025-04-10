// OCRサービスと通信するためのユーティリティ関数

// OCR結果の型定義
export interface OCRResult {
  text: string;
  vendor?: string;
  date?: string;
  amount?: number;
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

// OCRサービスをモックする関数（実際のAPI連携に置き換えることを想定）
export async function processImageWithOCR(
  imageUrl: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  // このサンプルでは実際のAPIを呼ばずにモックデータを返す
  // 実際の実装では、ここでAPIを呼び出し、結果を返す

  console.log(`OCR処理を実行: ${imageUrl}`, options);

  // 1〜3秒のランダムな遅延を発生させる（APIの処理時間をシミュレート）
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  // 領収書のような場合
  if (options.documentType === "領収書") {
    return {
      text: "株式会社サンプル\n領収書\n2024年3月15日\n合計: ¥12,500-\n内訳:\nサービス利用料 10,000円\n消費税 1,000円\n手数料 1,500円",
      vendor: "株式会社サンプル",
      date: "2024-03-15",
      amount: 12500,
      items: [
        { description: "サービス利用料", price: 10000 },
        { description: "消費税", price: 1000 },
        { description: "手数料", price: 1500 },
      ],
      confidence: 0.85,
    };
  }

  // 明細書のような場合
  if (options.documentType === "明細書") {
    return {
      text: "株式会社サンプル\n明細書\n2024年3月18日\n合計: ¥35,000-\n内訳:\n商品A 15,000円\n商品B 12,000円\n送料 3,000円\n消費税 5,000円",
      vendor: "株式会社サンプル",
      date: "2024-03-18",
      amount: 35000,
      items: [
        { description: "商品A", price: 15000 },
        { description: "商品B", price: 12000 },
        { description: "送料", price: 3000 },
        { description: "消費税", price: 5000 },
      ],
      confidence: 0.92,
    };
  }

  // デフォルトの戻り値
  return {
    text: "株式会社〇〇\n領収書\n2024年3月20日\n合計: ¥8,800-\nご利用ありがとうございました。",
    vendor: "株式会社〇〇",
    date: "2024-03-20",
    amount: 8800,
    confidence: 0.75,
  };
}
