import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type FileSet = {
  id: string;
  file: File;
  type: "pdf" | "image";
  checked: boolean;
};

type Group = {
  id: string;
  files: FileSet[];
  mergedPdf?: File;
  previewImages: File[];
};

let setCounter = 1;
let groupCounter = 1;

export default function UploadPage() {
  const [fileSets, setFileSets] = useState<FileSet[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [multiPageUpload, setMultiPageUpload] = useState(false);

  const convertPdfToImages = async (file: File): Promise<File[]> => {
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    const result: File[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
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
              `${file.name.replace(/\.[^.]+$/, "")}_page${i}.jpg`,
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
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    if (multiPageUpload) {
      // 一括グループとして追加
      const newSets: FileSet[] = fileArray.map((f) => ({
        id: `set-${setCounter++}`,
        file: f,
        type: f.type.startsWith("image/") ? "image" : "pdf",
        checked: false,
      }));

      const pdfs = newSets.filter((f) => f.type === "pdf").map((f) => f.file);

      mergePdfFiles(pdfs).then(async (mergedPdf) => {
        const images = await convertPdfToImages(mergedPdf);
        const newGroup: Group = {
          id: `group-${groupCounter++}`,
          files: newSets,
          mergedPdf,
          previewImages: images,
        };
        setGroups((prev) => [...prev, newGroup]);
      });
    } else {
      // 単体で仮セットとして保持
      const newSets: FileSet[] = fileArray.map((f) => ({
        id: `set-${setCounter++}`,
        file: f,
        type: f.type.startsWith("image/") ? "image" : "pdf",
        checked: false,
      }));
      setFileSets((prev) => [...prev, ...newSets]);
    }

    e.target.value = ""; // 同じファイル再選択時のためリセット
  };

  const toggleCheck = (id: string) => {
    setFileSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const groupSelected = async () => {
    const selected = fileSets.filter((s) => s.checked);
    if (selected.length === 0) return;

    const pdfs = selected.filter((s) => s.type === "pdf").map((s) => s.file);
    const mergedPdf = await mergePdfFiles(pdfs);
    const images = await convertPdfToImages(mergedPdf);

    const newGroup: Group = {
      id: `group-${groupCounter++}`,
      files: selected,
      mergedPdf,
      previewImages: images,
    };

    setGroups((prev) => [...prev, newGroup]);
    setFileSets((prev) => prev.filter((s) => !s.checked)); // グループ化したものを削除
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        領収書アップロード（セット＆グループ対応）
      </h1>

      <div className="mb-4">
        <label className="mr-2 font-medium">
          📎 このアップロードは連続ページとして扱う
        </label>
        <input
          type="checkbox"
          checked={multiPageUpload}
          onChange={(e) => setMultiPageUpload(e.target.checked)}
        />
      </div>

      <input
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleUpload}
        className="mb-6"
      />

      {fileSets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            仮セット一覧（未グループ）
          </h2>
          <button
            className="mb-2 px-3 py-1 bg-blue-500 text-white rounded"
            onClick={groupSelected}
          >
            ✅ チェックしたセットをグループ化
          </button>
          <ul className="space-y-1">
            {fileSets.map((set) => (
              <li key={set.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={set.checked}
                  onChange={() => toggleCheck(set.id)}
                />
                <span className="text-sm">
                  {set.file.name} ({set.type})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className="mb-8 border p-4 rounded shadow">
          <h2 className="font-semibold mb-2">📦 グループ: {group.id}</h2>
          <ul className="list-disc pl-6 mb-2">
            {group.files.map((f) => (
              <li key={f.id} className="text-sm">
                {f.file.name} ({f.type})
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {group.previewImages.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={URL.createObjectURL(img)}
                alt={`preview-${i}`}
                className="w-full h-auto border rounded"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
