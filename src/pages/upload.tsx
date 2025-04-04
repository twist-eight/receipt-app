import { useState } from "react";
import { useRouter } from "next/router";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { ReceiptItem } from "@/types/receipt";
import { v4 as uuidv4 } from "uuid";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const pdfPageToImage = async (
    pdfData: Uint8Array,
    pageIndex: number
  ): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context!, viewport }).promise;
    return canvas.toDataURL("image/jpeg");
  };

  const splitPdfPages = async (file: File): Promise<ReceiptItem[]> => {
    const data = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(data);
    const totalPages = pdfDoc.getPageCount();
    const results: ReceiptItem[] = [];

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
      const groupId = uuidv4();

      results.push({
        id: `page-${i}`,
        imageUrl,
        pdfUrl,
        date: "2025-04-01",
        vendor: "仮の商店",
        amount: 1000,
        type: "領収書",
        memo: "PDF分割",
        tag: "交際費",
        status: "完了",
        groupId,
      });
    }

    return results;
  };

  const handleUpload = async () => {
    setIsLoading(true);
    const allResults: ReceiptItem[] = [];

    for (const file of files) {
      if (file.type === "application/pdf") {
        const splitResults = await splitPdfPages(file);
        allResults.push(...splitResults);
      } else if (file.type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(file);
        const pdfDoc = await PDFDocument.create();
        const imageBytes = await file.arrayBuffer();
        const embedded = await (file.type.includes("png")
          ? pdfDoc.embedPng(imageBytes)
          : pdfDoc.embedJpg(imageBytes));
        const page = pdfDoc.addPage();
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const groupId = uuidv4();

        allResults.push({
          id: `img-${Date.now()}`,
          imageUrl,
          pdfUrl,
          date: "2025-04-01",
          vendor: "仮の商店",
          amount: 1000,
          type: "領収書",
          memo: "画像処理",
          tag: "交際費",
          status: "完了",
          groupId,
        });
      }
    }

    sessionStorage.setItem("ocrResults", JSON.stringify(allResults));
    router.push("/review");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">領収書アップロード</h1>
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFilesChange}
        className="mb-4"
      />
      <div className="grid grid-cols-2 gap-4 mb-6">
        {files.map((file, index) => (
          <div key={index} className="border p-2 rounded shadow-sm relative">
            <p className="text-sm truncate">{file.name}</p>
            <button
              className="absolute top-1 right-1 text-red-500"
              onClick={() => handleRemoveFile(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleUpload}
        disabled={isLoading || files.length === 0}
      >
        {isLoading ? "アップロード中..." : "OCR実行（仮）"}
      </button>
    </div>
  );
}
