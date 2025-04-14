import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import { ReceiptItem } from "../types/receipt";

// PDFワーカーの設定
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export function usePdfProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDFページを画像に変換する
  const pdfPageToImage = async (
    pdfData: Uint8Array,
    pageIndex: number
  ): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(pageIndex + 1);

      // 高解像度スケールを設定（1.5倍）
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context could not be created");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 背景を白で塗りつぶし（透明部分の問題を解決）
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.85); // 品質を調整
    } catch (err) {
      console.error("Error converting PDF to image:", err);
      setError("PDFから画像への変換に失敗しました");
      throw err;
    }
  };

  // PDFの全ページを画像に変換する
  const pdfToImages = async (pdfData: Uint8Array): Promise<string[]> => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const totalPages = pdf.numPages;
      const imageUrls: string[] = [];

      for (let i = 0; i < totalPages; i++) {
        const imageUrl = await pdfPageToImage(pdfData, i);
        imageUrls.push(imageUrl);
      }

      return imageUrls;
    } catch (err) {
      console.error("Error converting PDF to images:", err);
      setError("PDFから画像への変換に失敗しました");
      throw err;
    }
  };

  // 複数ページPDFを個別のPDFに分割
  const splitPdfPages = async (
    file: File
  ): Promise<{ imageUrl: string; pdfUrl: string }[]> => {
    try {
      const results = [];
      const data = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(data);
      const totalPages = pdfDoc.getPageCount();

      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);

        // オリジナルのページサイズをそのまま使用
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();
        const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const imageUrl = await pdfPageToImage(
          new Uint8Array(await pdfBlob.arrayBuffer()),
          0
        );

        results.push({ pdfUrl, imageUrl });
      }

      return results;
    } catch (err) {
      console.error("Error splitting PDF:", err);
      setError("PDFの分割処理に失敗しました");
      throw err;
    }
  };

  // 画像をPDFに変換
  const convertImageToPdf = async (
    file: File
  ): Promise<{ imageUrl: string; pdfUrl: string }> => {
    try {
      const imageUrl = URL.createObjectURL(file);
      const pdfDoc = await PDFDocument.create();
      const imageBytes = await file.arrayBuffer();

      // 画像の種類に応じて埋め込み
      const ext = file.type.split("/")[1];
      const embedded =
        ext === "png"
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

      // 画像の元のサイズを取得
      const imgWidth = embedded.width;
      const imgHeight = embedded.height;

      // 画像サイズに合わせたページを作成
      const page = pdfDoc.addPage([imgWidth, imgHeight]);

      // 画像をページに描画（アスペクト比を維持）
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(blob);

      return { imageUrl, pdfUrl };
    } catch (err) {
      console.error("Error converting image to PDF:", err);
      setError("画像からPDFへの変換に失敗しました");
      throw err;
    }
  };

  // PDFをマージする関数
  const mergePdfs = async (
    pdfUrls: string[]
  ): Promise<{ mergedPdfUrl: string; mergedImageUrls: string[] }> => {
    if (pdfUrls.length < 2) {
      throw new Error("At least two PDFs are required for merging");
    }

    try {
      // 空のPDFドキュメントを作成
      const mergedPdfDoc = await PDFDocument.create();

      // 各PDFを読み込んでマージ
      for (const pdfUrl of pdfUrls) {
        let pdfData: Uint8Array;

        if (pdfUrl.startsWith("blob:")) {
          // Blob URLからデータを取得
          const response = await fetch(pdfUrl);
          const blob = await response.blob();
          pdfData = new Uint8Array(await blob.arrayBuffer());
        } else if (pdfUrl.startsWith("data:application/pdf")) {
          // Data URLからデータを取得
          const base64Data = pdfUrl.split(",")[1];
          const binaryString = atob(base64Data);
          pdfData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            pdfData[i] = binaryString.charCodeAt(i);
          }
        } else {
          throw new Error(`Unsupported PDF URL format: ${pdfUrl}`);
        }

        // PDFドキュメントを読み込む
        const pdfDoc = await PDFDocument.load(pdfData);

        // ページをコピー
        const copiedPages = await mergedPdfDoc.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );

        // オリジナルのサイズを維持してページを追加
        copiedPages.forEach((page) => {
          mergedPdfDoc.addPage(page);
        });
      }

      // マージしたPDFを保存
      const mergedPdfBytes = await mergedPdfDoc.save();
      const mergedPdfBlob = new Blob([mergedPdfBytes], {
        type: "application/pdf",
      });
      const mergedPdfUrl = URL.createObjectURL(mergedPdfBlob);

      // 全ページをサムネイル画像として使用
      const mergedImageUrls = await pdfToImages(mergedPdfBytes);

      return { mergedPdfUrl, mergedImageUrls };
    } catch (err) {
      console.error("Failed to merge PDFs:", err);
      throw new Error("PDFのマージに失敗しました");
    }
  };

  // PDFからサムネイルを生成する関数（Blob形式で返す）
  const generateThumbnail = async (
    pdfData: Uint8Array,
    maxWidth = 400, // 200から400に増加
    maxHeight = 400 // 200から400に増加
  ): Promise<Blob> => {
    try {
      // PDFの最初のページを高解像度でレンダリング
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1); // 最初のページのみ使用

      // 元のページビューポートを取得
      const viewport = page.getViewport({ scale: 1.5 }); // スケールを1.0→1.5に上げて高解像度に

      // アスペクト比を計算
      const aspectRatio = viewport.width / viewport.height;

      // サムネイルの幅と高さを決定（アスペクト比を維持）
      let width, height;
      if (aspectRatio > 1) {
        // 横長の場合
        width = Math.min(maxWidth, viewport.width);
        height = width / aspectRatio;
      } else {
        // 縦長の場合
        height = Math.min(maxHeight, viewport.height);
        width = height * aspectRatio;
      }

      // アスペクト比を維持したスケールを計算
      const scale = width / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      // キャンバスにレンダリング
      const canvas = document.createElement("canvas");
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context could not be created");
      }

      // 背景を白で塗りつぶす（透明部分対応）
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // 高品質レンダリングを設定
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      await page.render({ canvasContext: context, viewport: scaledViewport })
        .promise;

      // JPEG形式でBlobとして返す - 品質を0.5→0.85に上げる
      return new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob || new Blob([]));
          },
          "image/jpeg",
          0.85 // 品質を大幅に上げる
        );
      });
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      setError("サムネイル生成に失敗しました");

      // エラー時は空のBlobを返す
      return new Blob([]);
    }
  };

  // 一時的な表示用URL生成関数
  const createThumbnailUrl = async (thumbnailBlob: Blob): Promise<string> => {
    if (thumbnailBlob.size === 0) {
      // デフォルトのプレースホルダー画像SVGを返す
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'%3E%3C/path%3E%3C/svg%3E";
    }
    return URL.createObjectURL(thumbnailBlob);
  };

  // ヘルパー関数：BlobをBase64に変換
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ファイルを処理して受領書アイテムを作成
  const processFiles = async (
    files: File[],
    mergeMode: boolean
  ): Promise<ReceiptItem[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      const results: ReceiptItem[] = [];
      const today = new Date().toISOString().split("T")[0]; // 今日の日付

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];

        if (file.type === "application/pdf") {
          if (mergeMode) {
            // 複数ページのPDFを1つの受領書として扱う
            const pdfUrl = URL.createObjectURL(file);
            const fileData = new Uint8Array(await file.arrayBuffer());

            // 全ページの画像を取得
            const imageUrls = await pdfToImages(fileData);

            // サムネイルBlobを生成して一時URLを作成
            const thumbnailBlob = await generateThumbnail(fileData);
            const thumbnailUrl = await createThumbnailUrl(thumbnailBlob);

            // キャッシュに保存（後でアップロード時に使用）
            const receiptId = uuidv4();
            sessionStorage.setItem(
              `thumbnail_${receiptId}`,
              await blobToBase64(thumbnailBlob)
            );

            results.push({
              id: receiptId,
              imageUrls,
              pdfUrl,
              thumbnailUrl, // 一時的なURL（表示用）
              date: "",
              updatedAt: today,
              vendor: "",
              amount: 0,
              type: "領収書",
              memo: "",
              tag: "",
              status: "完了",
            });
          } else {
            // PDFの各ページを別々の受領書として処理
            const pages = await splitPdfPages(file);

            for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              const pageBlob = await (await fetch(page.pdfUrl)).blob();
              const pageArrayBuffer = await pageBlob.arrayBuffer();
              const pageData = new Uint8Array(pageArrayBuffer);
              // サムネイルBlobを生成して一時URLを作成
              const thumbnailBlob = await generateThumbnail(pageData);
              const thumbnailUrl = await createThumbnailUrl(thumbnailBlob);

              // キャッシュに保存
              const receiptId = uuidv4();
              sessionStorage.setItem(
                `thumbnail_${receiptId}`,
                await blobToBase64(thumbnailBlob)
              );

              results.push({
                id: receiptId,
                imageUrls: [page.imageUrl],
                pdfUrl: page.pdfUrl,
                thumbnailUrl, // 一時的なURL（表示用）
                date: "",
                updatedAt: today,
                vendor: "",
                amount: 0,
                type: "領収書",
                memo: "",
                tag: "",
                status: "完了",
              });
            }
          }
        } else if (file.type.startsWith("image/")) {
          // 画像ファイルをPDFに変換
          const { imageUrl, pdfUrl } = await convertImageToPdf(file);

          // 画像ファイルの場合は、そのまま縮小してサムネイルとして使用
          const img = new Image();
          img.src = imageUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
          });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // 適切なサイズにリサイズ
          const maxSize = 400;
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // 高品質描画の設定
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // 背景を白で塗りつぶす（透明画像対応）
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          const thumbnailBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(
              (blob) => resolve(blob || new Blob([])),
              "image/jpeg",
              0.85
            );
          });

          const thumbnailUrl = URL.createObjectURL(thumbnailBlob);

          // キャッシュに保存
          const receiptId = uuidv4();
          sessionStorage.setItem(
            `thumbnail_${receiptId}`,
            await blobToBase64(thumbnailBlob)
          );

          results.push({
            id: receiptId,
            imageUrls: [imageUrl],
            pdfUrl,
            thumbnailUrl, // 一時的なURL（表示用）
            date: "",
            updatedAt: today,
            vendor: "",
            amount: 0,
            type: "領収書",
            memo: "",
            tag: "",
            status: "完了",
          });
        }
      }

      return results;
    } catch (err) {
      console.error("Error processing files:", err);
      setError("ファイル処理中にエラーが発生しました");
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processFiles,
    pdfPageToImage,
    pdfToImages,
    splitPdfPages,
    convertImageToPdf,
    mergePdfs,
    generateThumbnail,
    createThumbnailUrl,
    blobToBase64,
    isProcessing,
    error,
  };
}
