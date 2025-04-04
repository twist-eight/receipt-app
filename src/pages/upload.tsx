import { useState } from "react";
import { useRouter } from "next/router";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

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

  const pdfToImage = async (file: File): Promise<string> => {
    const pdfData = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context!, viewport }).promise;
    return canvas.toDataURL("image/jpeg");
  };

  const convertPngToJpegBlob = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx!.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
            },
            "image/jpeg",
            0.95
          );
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    setIsLoading(true);

    const results = await Promise.all(
      files.map(async (file, i) => {
        let imageUrl = "";
        let pdfUrl = "";

        if (file.type === "application/pdf") {
          pdfUrl = URL.createObjectURL(file);
          imageUrl = await pdfToImage(file);
        } else if (file.type === "image/png") {
          const jpegBlob = await convertPngToJpegBlob(file);
          imageUrl = URL.createObjectURL(jpegBlob);

          const pdfDoc = await PDFDocument.create();
          const jpgImage = await pdfDoc.embedJpg(await jpegBlob.arrayBuffer());
          const page = pdfDoc.addPage();
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          pdfUrl = URL.createObjectURL(blob);
        } else if (file.type.startsWith("image/")) {
          imageUrl = URL.createObjectURL(file);

          const pdfDoc = await PDFDocument.create();
          const imageBytes = await file.arrayBuffer();
          const embedded = await pdfDoc.embedJpg(imageBytes);
          const page = pdfDoc.addPage();
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          pdfUrl = URL.createObjectURL(blob);
        }

        return {
          id: `upload-${i}`,
          imageUrl,
          pdfUrl,
          date: "2025-04-01",
          vendor: "仮の商店",
          amount: 1000,
          type: "領収書",
          memo: "アップロードテスト",
          tag: "交際費",
          status: "完了",
        };
      })
    );

    sessionStorage.setItem("ocrResults", JSON.stringify(results));
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
