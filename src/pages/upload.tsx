"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergePdfFiles = async (pdfFiles: File[]): Promise<File> => {
    const mergedPdf = await PDFDocument.create();

    for (const file of pdfFiles) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => {
        mergedPdf.addPage(page);
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
  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processFiles = (files: File[]) => {
    const newFileSets: FileSet[] = [];

    const pdfs = files.filter((f) => f.type === "application/pdf");
    const images = files.filter((f) => f.type.startsWith("image/"));

    if (multiPageUpload) {
      const initialSet: FileSet = {
        id: `set-${setCounter++}`,
        pdf: pdfs[0],
        image: images[0],
        checked: false,
      };

      mergePdfFiles(pdfs).then(async (merged) => {
        const previewImages = await convertPdfToImages(merged);
        const group: Group = {
          id: `group-${groupCounter++}`,
          sets: [initialSet],
          mergedPdf: merged,
          previewImages,
        };
        setGroups((prev) => [...prev, group]);
      });
    } else {
      const min = Math.min(pdfs.length, images.length);
      for (let i = 0; i < min; i++) {
        newFileSets.push({
          id: `set-${setCounter++}`,
          pdf: pdfs[i],
          image: images[i],
          checked: false,
        });
      }
      setFileSets((prev) => [...prev, ...newFileSets]);
    }
  };

  const toggleCheck = (id: string) => {
    setFileSets((prev) =>
      prev.map((set) =>
        set.id === id ? { ...set, checked: !set.checked } : set
      )
    );
  };
  const groupSelected = async () => {
    const selectedSets = fileSets.filter((set) => set.checked);
    if (selectedSets.length === 0) return;

    const pdfFiles = selectedSets
      .map((s) => s.pdf)
      .filter((f): f is File => !!f);

    const merged = await mergePdfFiles(pdfFiles);
    const previewImages = await convertPdfToImages(merged);

    const newGroup: Group = {
      id: `group-${groupCounter++}`,
      sets: selectedSets,
      mergedPdf: merged,
      previewImages,
    };

    setGroups((prev) => [...prev, newGroup]);
    setFileSets((prev) => prev.filter((s) => !s.checked));
  };

  const removeSet = (id: string) => {
    setFileSets((prev) => prev.filter((s) => s.id !== id));
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">
        領収書アップロード
      </h1>

      {/* アップロードオプション */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={multiPageUpload}
          onChange={(e) => setMultiPageUpload(e.target.checked)}
          id="multi-page"
        />
        <label htmlFor="multi-page" className="text-sm text-gray-700">
          このアップロードを連続ページとして扱う
        </label>
      </div>

      {/* アップロードエリア */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition cursor-pointer mb-6"
      >
        <p className="text-sm">
          ファイルをドラッグ＆ドロップ、またはクリックで選択
        </p>
        <input
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleUpload}
        />
      </div>

      {/* グループ化ボタン */}
      {fileSets.some((s) => s.checked) && (
        <div className="mb-4 text-right">
          <button
            onClick={groupSelected}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded shadow"
          >
            ✅ チェックしたセットをグループ化
          </button>
        </div>
      )}

      {/* セット一覧 */}
      {fileSets.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-3">
            未グループのファイルセット
          </h2>
          <ul className="space-y-2">
            {fileSets.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between p-3 bg-white/80 rounded shadow"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={set.checked}
                    onChange={() => toggleCheck(set.id)}
                  />
                  <div className="flex items-center gap-2">
                    {set.image && (
                      <Image
                        src={URL.createObjectURL(set.image)}
                        alt="preview"
                        width={40}
                        height={40}
                        className="rounded object-cover"
                        unoptimized
                      />
                    )}
                    <span className="text-sm text-gray-800">
                      {set.pdf?.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeSet(set.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* グループ表示 */}
      {groups.map((group) => (
        <div
          key={group.id}
          className="mb-6 p-4 bg-white/70 border border-gray-300 rounded shadow"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-800">
              📦 グループ: {group.id}
            </h3>
            <button
              onClick={() => removeGroup(group.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              グループを削除
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.previewImages.map((img, i) => (
              <Image
                key={i}
                src={URL.createObjectURL(img)}
                alt={`preview-${i}`}
                width={100}
                height={100}
                className="rounded border object-cover"
                unoptimized
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
