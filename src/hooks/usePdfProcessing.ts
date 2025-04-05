import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid"; // この依存関係を追加する必要があります
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

  // ファイルを処理して受領書アイテムを作成
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
            const imageUrl = await pdfPageToImage(
              new Uint8Array(await file.arrayBuffer()),
              0
            );

            results.push({
              id: uuidv4(),
              imageUrl,
              pdfUrl,
              date: new Date().toISOString().split("T")[0],
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

            pages.forEach((page) => {
              results.push({
                id: uuidv4(),
                imageUrl: page.imageUrl,
                pdfUrl: page.pdfUrl,
                date: new Date().toISOString().split("T")[0],
                vendor: "",
                amount: 0,
                type: "領収書",
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
            imageUrl,
            pdfUrl,
            date: new Date().toISOString().split("T")[0],
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
    splitPdfPages,
    convertImageToPdf,
    isProcessing,
    error,
  };
}
