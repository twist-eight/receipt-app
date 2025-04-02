import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type FileSet = {
  id: string;
  pdf?: File;
  image?: File;
  checked: boolean;
};

type Group = {
  id: string;
  sets: FileSet[];
  mergedPdf?: File;
  previewImages: File[];
};

let setCounter = 1;
let groupCounter = 1;

export default function UploadPage() {
  const [fileSets, setFileSets] = useState<FileSet[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [multiPageUpload, setMultiPageUpload] = useState(false);

  const mergePdfFiles = async (pdfFiles: File[]): Promise<File> => {
    const mergedPdf = await PDFDocument.create();

    for (const file of pdfFiles) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page: unknown) => {
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
            const imageFile = new File([blob], `${file.name}_page${i}.jpg`, {
              type: "image/jpeg",
            });
            result.push(imageFile);
          }
          resolve();
        }, "image/jpeg");
      });
    }

    return result;
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFileSets: FileSet[] = [];

    if (multiPageUpload) {
      // 連続ページとしてグループ化
      const pdfFiles = files.filter((f) => f.type === "application/pdf");
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      const initialSet: FileSet = {
        id: `set-${setCounter++}`,
        pdf: pdfFiles[0],
        image: imageFiles[0],
        checked: false,
      };

      mergePdfFiles(pdfFiles).then(async (merged) => {
        const images = await convertPdfToImages(merged);
        const group: Group = {
          id: `group-${groupCounter++}`,
          sets: [initialSet],
          mergedPdf: merged,
          previewImages: images,
        };
        setGroups((prev) => [...prev, group]);
      });
    } else {
      // 個別ファイルを1セットずつ登録（PDFと画像でペア）
      const pdfs = files.filter((f) => f.type === "application/pdf");
      const images = files.filter((f) => f.type.startsWith("image/"));

      const minLength = Math.min(pdfs.length, images.length);

      for (let i = 0; i < minLength; i++) {
        newFileSets.push({
          id: `set-${setCounter++}`,
          pdf: pdfs[i],
          image: images[i],
          checked: false,
        });
      }

      setFileSets((prev) => [...prev, ...newFileSets]);
    }

    e.target.value = "";
  };

  const toggleCheck = (id: string) => {
    setFileSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const groupSelected = async () => {
    const selectedSets = fileSets.filter((s) => s.checked);
    if (selectedSets.length === 0) return;

    const pdfFiles = selectedSets
      .map((s) => s.pdf)
      .filter((f): f is File => !!f);

    const mergedPdf = await mergePdfFiles(pdfFiles);
    const images = await convertPdfToImages(mergedPdf);

    const group: Group = {
      id: `group-${groupCounter++}`,
      sets: selectedSets,
      mergedPdf,
      previewImages: images,
    };

    setGroups((prev) => [...prev, group]);
    setFileSets((prev) => prev.filter((s) => !s.checked));
  };
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">領収書アップロード</h1>

      {/* オプション：連続ページとして扱う */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={multiPageUpload}
          onChange={(e) => setMultiPageUpload(e.target.checked)}
        />
        <label className="font-medium">
          このアップロードを連続ページとして扱う
        </label>
      </div>

      {/* ファイルアップロード */}
      <input
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleUpload}
        className="mb-6"
      />

      {/* 仮セット一覧（グループ化されていないもの） */}
      {fileSets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">未グループのセット</h2>
          <button
            onClick={groupSelected}
            className="mb-2 px-4 py-1 bg-blue-500 text-white rounded"
          >
            ✅ チェックしたセットをグループ化
          </button>
          <ul className="space-y-2">
            {fileSets.map((set) => (
              <li key={set.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={set.checked}
                  onChange={() => toggleCheck(set.id)}
                />
                <span className="text-sm text-gray-800">
                  {set.pdf?.name} + {set.image?.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* グループ一覧 */}
      {groups.map((group) => (
        <div key={group.id} className="mb-8 p-4 border rounded shadow">
          <h3 className="font-semibold mb-2">📦 グループ: {group.id}</h3>
          <ul className="list-disc pl-5 mb-3 text-sm">
            {group.sets.map((s) => (
              <li key={s.id}>
                {s.pdf?.name} + {s.image?.name}
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
