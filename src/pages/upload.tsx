import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type FileEntry = {
  file: File;
  type: "pdf" | "image";
};

type Group = {
  id: string;
  files: FileEntry[];
  mergedPdf?: File;
  images: File[]; // PDF → 全ページ画像化
};

let groupCounter = 1;

export default function UploadPage() {
  const [groups, setGroups] = useState<Group[]>([]);

  const createNewGroup = () => {
    const newGroup: Group = {
      id: `group-${groupCounter++}`,
      files: [],
      images: [],
    };
    setGroups((prev) => [...prev, newGroup]);
  };

  const mergePdfFiles = async (files: File[]): Promise<File> => {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergedPdf.addPage(page as any);
      });
    }

    const mergedBytes = await mergedPdf.save();
    return new File([mergedBytes], "merged.pdf", { type: "application/pdf" });
  };

  const convertPdfToImages = async (file: File): Promise<File[]> => {
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    const numPages = pdf.numPages;
    const result: File[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const imageFile = new File(
              [blob],
              `${file.name.replace(/\.pdf$/, "")}_page${i}.jpg`,
              { type: "image/jpeg" }
            );
            result.push(imageFile);
          }
          resolve();
        }, "image/jpeg");
      });
    }

    return result;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    groupId: string
  ) => {
    const inputFiles = e.target.files;
    if (!inputFiles) return;

    const fileList = Array.from(inputFiles);
    const groupIndex = groups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    const newEntries: FileEntry[] = fileList.map((f) => ({
      file: f,
      type: f.type.startsWith("image/") ? "image" : "pdf",
    }));

    const updatedFiles = [...groups[groupIndex].files, ...newEntries];

    const pdfFiles = updatedFiles
      .filter((f) => f.type === "pdf")
      .map((f) => f.file);

    const merged =
      pdfFiles.length > 0 ? await mergePdfFiles(pdfFiles) : undefined;
    const imageFiles: File[] =
      merged && merged.type === "application/pdf"
        ? await convertPdfToImages(merged)
        : [];

    const updatedGroup: Group = {
      ...groups[groupIndex],
      files: updatedFiles,
      mergedPdf: merged,
      images: imageFiles,
    };

    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = updatedGroup;
    setGroups(updatedGroups);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        領収書アップロード（グループ対応）
      </h1>

      <button
        onClick={createNewGroup}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded"
      >
        ➕ グループを追加
      </button>

      {groups.map((group) => (
        <div key={group.id} className="border p-4 rounded-lg mb-6 shadow">
          <h2 className="text-lg font-semibold mb-2">{group.id}</h2>
          <input
            type="file"
            multiple
            accept=".pdf,image/*"
            onChange={(e) => handleFileUpload(e, group.id)}
            className="mb-4"
          />

          <h3 className="text-sm text-gray-700">🗃 ファイル一覧</h3>
          <ul className="list-disc pl-6 mb-4">
            {group.files.map((entry, idx) => (
              <li key={idx} className="text-sm">
                {entry.file.name}（{entry.type}）
              </li>
            ))}
          </ul>

          {group.images.length > 0 && (
            <>
              <h3 className="text-sm text-gray-700 mb-2">
                🖼 プレビュー（PDF → 全ページ画像）
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {group.images.map((img, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={URL.createObjectURL(img)}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-auto border rounded"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
