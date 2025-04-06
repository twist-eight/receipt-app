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
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context could not be created");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/jpeg");
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

      const ext = file.type.split("/")[1];
      const embedded =
        ext === "png"
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

      const page = pdfDoc.addPage();
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
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

  // PDFをマージする関数（修正版）
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

        // ページを追加
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

  // ファイルを処理して受領書アイテムを作成（修正版）
  const processFiles = async (
    files: File[],
    mergeMode: boolean
  ): Promise<ReceiptItem[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      const results: ReceiptItem[] = [];

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];

        if (file.type === "application/pdf") {
          if (mergeMode) {
            // 複数ページのPDFを1つの受領書として扱う
            const pdfUrl = URL.createObjectURL(file);
            const fileData = new Uint8Array(await file.arrayBuffer());

            // 全ページの画像を取得
            const imageUrls = await pdfToImages(fileData);

            results.push({
              id: uuidv4(),
              imageUrls, // 全ページ分の画像を保存
              pdfUrl,
              date: new Date().toISOString().split("T")[0],
              vendor: "",
              amount: 0,
              type: "領収書", // デフォルト値
              memo: "",
              tag: "",
              status: "完了",
            });
          } else {
            // PDFの各ページを別々の受領書として処理
            const pages = await splitPdfPages(file);

            pages.forEach((page) => {
              results.push({
                id: uuidv4(),
                imageUrls: [page.imageUrl], // 配列として保存
                pdfUrl: page.pdfUrl,
                date: new Date().toISOString().split("T")[0],
                vendor: "",
                amount: 0,
                type: "領収書", // デフォルト値
                memo: "",
                tag: "",
                status: "完了",
              });
            });
          }
        } else if (file.type.startsWith("image/")) {
          // 画像ファイルをPDFに変換
          const { imageUrl, pdfUrl } = await convertImageToPdf(file);

          results.push({
            id: uuidv4(),
            imageUrls: [imageUrl], // 配列として保存
            pdfUrl,
            date: new Date().toISOString().split("T")[0],
            vendor: "",
            amount: 0,
            type: "領収書", // デフォルト値
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
    isProcessing,
    error,
  };
}
