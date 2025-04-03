import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";

// PDF.jsのワーカーの設定
const pdfjsWorker =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type FileItem = {
  id: string;
  name: string;
  type: string;
  file: File; // 実際のFileオブジェクトを保持
  previewUrl?: string;
  originalFileId?: string; // 元のファイルのID（変換元ファイルの参照用）
  isConverted?: boolean; // 変換されたファイルかどうか
};

type FileGroup = {
  id: string;
  files: FileItem[];
  continuous: boolean;
};

const Upload: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [groups, setGroups] = useState<FileGroup[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>("");

  // react-dropzoneの設定
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles) => {
      handleFilesAdded(acceptedFiles);
    },
  });

  // ファイル追加処理
  const handleFilesAdded = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setProcessingMessage("ファイルを処理中...");

    const newFiles: FileItem[] = [];
    const conversionPromises: Promise<FileItem | null>[] = [];

    // まず、ファイルを処理して基本的なFileItemを作成
    for (const file of acceptedFiles) {
      const id = `file-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const fileItem: FileItem = {
        id,
        name: file.name,
        type: file.type,
        file: file,
      };

      // 画像ファイルの場合はプレビューURLを生成
      if (file.type.startsWith("image/")) {
        fileItem.previewUrl = URL.createObjectURL(file);
        newFiles.push(fileItem);

        // 画像をPDFに変換する処理を追加
        conversionPromises.push(convertImageToPdf(fileItem));
      }
      // PDFファイルの場合
      else if (file.type === "application/pdf") {
        // PDFのプレビューを生成（最初のページのみ）
        try {
          const previewUrl = await generatePdfThumbnail(file);
          fileItem.previewUrl = previewUrl;
        } catch (error) {
          console.error("PDFプレビュー生成エラー:", error);
        }

        newFiles.push(fileItem);

        // PDFを画像に変換する処理を追加
        conversionPromises.push(convertPdfToImage(fileItem));
      }
    }

    // 全ての変換処理が完了するのを待つ
    const convertedFiles = await Promise.all(conversionPromises);

    // 変換に成功したファイルのみをフィルタリングして追加
    const validConvertedFiles = convertedFiles.filter(
      (file) => file !== null
    ) as FileItem[];

    setFiles((prev) => [...prev, ...newFiles, ...validConvertedFiles]);
    setIsProcessing(false);
    setProcessingMessage("");
  };

  // PDFからサムネイル画像を生成する関数
  const generatePdfThumbnail = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // 最初のページだけ

    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // canvasの作成
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Canvas context could not be created");

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL("image/jpeg", 0.8);
  };

  // 画像をPDFに変換する関数
  const convertImageToPdf = async (
    fileItem: FileItem
  ): Promise<FileItem | null> => {
    try {
      return new Promise((resolve) => {
        // ブラウザ環境でのみ実行されるコード
        if (typeof window !== "undefined") {
          const img = new window.Image();
          img.onload = () => {
            // jsPDFを使って新しいPDFを作成
            const doc = new jsPDF({
              orientation: img.width > img.height ? "landscape" : "portrait",
              unit: "px",
              format: [img.width, img.height],
            });

            // 画像をPDFに追加
            doc.addImage(img, "JPEG", 0, 0, img.width, img.height);

            // Blobとして保存
            const pdfBlob = doc.output("blob");

            // FileItemを作成
            const convertedId = `pdf-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`;
            const fileExtension = fileItem.name.includes(".")
              ? fileItem.name.split(".").pop()
              : "";
            const newFileName = fileItem.name.replace(
              `.${fileExtension}`,
              fileExtension ? `_converted.pdf` : ".pdf"
            );

            const pdfFile = new File([pdfBlob], newFileName, {
              type: "application/pdf",
            });

            const convertedFileItem: FileItem = {
              id: convertedId,
              name: newFileName,
              type: "application/pdf",
              file: pdfFile,
              originalFileId: fileItem.id,
              isConverted: true,
            };

            // PDFのプレビューを生成
            generatePdfThumbnail(pdfFile)
              .then((previewUrl) => {
                convertedFileItem.previewUrl = previewUrl;
                resolve(convertedFileItem);
              })
              .catch((err) => {
                console.error("PDF変換プレビュー生成エラー:", err);
                resolve(convertedFileItem);
              });
          };

          img.onerror = () => {
            console.error("画像の読み込みに失敗しました");
            resolve(null);
          };

          img.src = fileItem.previewUrl || URL.createObjectURL(fileItem.file);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error("画像→PDF変換エラー:", error);
      return null;
    }
  };

  // PDFを画像に変換する関数
  const convertPdfToImage = async (
    fileItem: FileItem
  ): Promise<FileItem | null> => {
    try {
      const arrayBuffer = await fileItem.file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // 最初のページだけを変換

      const scale = 2.0; // 高解像度で描画
      const viewport = page.getViewport({ scale });

      // canvasの作成
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) throw new Error("Canvas context could not be created");

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // canvas を JPEG形式のBlobに変換
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob as Blob);
          },
          "image/jpeg",
          0.9
        );
      });

      const convertedId = `img-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newFileName = fileItem.name.replace(".pdf", "_converted.jpg");

      const imgFile = new File([blob], newFileName, {
        type: "image/jpeg",
      });

      const convertedFileItem: FileItem = {
        id: convertedId,
        name: newFileName,
        type: "image/jpeg",
        file: imgFile,
        previewUrl: URL.createObjectURL(blob),
        originalFileId: fileItem.id,
        isConverted: true,
      };

      return convertedFileItem;
    } catch (error) {
      console.error("PDF→画像変換エラー:", error);
      return null;
    }
  };

  // 関連ファイルを自動的にグループ化
  useEffect(() => {
    const autoGroupRelatedFiles = () => {
      // まだグループ化されていないファイル間で元ファイルと変換ファイルの関係を探す
      const fileMap = new Map<string, FileItem>();
      const groupedIds = new Set<string>();

      // グループ化済みのファイルIDを収集
      groups.forEach((group) => {
        group.files.forEach((file) => {
          groupedIds.add(file.id);
        });
      });

      // グループ化されていないファイルをマッピング
      files.forEach((file) => {
        if (!groupedIds.has(file.id)) {
          fileMap.set(file.id, file);
        }
      });

      // 新しいグループを作成
      const newGroups: FileGroup[] = [...groups];

      // 変換されたファイルと元ファイルのペアを探してグループ化
      files.forEach((file) => {
        if (groupedIds.has(file.id)) return; // すでにグループ化済み

        if (file.originalFileId && fileMap.has(file.originalFileId)) {
          const originalFile = fileMap.get(file.originalFileId)!;

          // 両方のファイルがまだグループ化されていない場合だけグループ化
          if (!groupedIds.has(originalFile.id) && !groupedIds.has(file.id)) {
            const groupId = `group-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`;
            newGroups.push({
              id: groupId,
              files: [originalFile, file],
              continuous: false,
            });

            // グループ化したファイルIDを記録
            groupedIds.add(originalFile.id);
            groupedIds.add(file.id);
          }
        }
      });

      // 新しいグループができた場合だけ更新
      if (newGroups.length > groups.length) {
        setGroups(newGroups);

        // グループ化されたファイルをfilesから削除
        setFiles((prev) => prev.filter((file) => !groupedIds.has(file.id)));
      }
    };

    // 自動グループ化を実行
    autoGroupRelatedFiles();
  }, [files, groups]);

  // 選択ファイルのトグル
  const toggleFileSelect = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // 選択ファイルのグループ化
  const groupSelectedFiles = () => {
    if (selectedFileIds.size < 2) return; // 最低2つのファイルが必要

    const newGroupFiles: FileItem[] = [];
    const remainingFiles: FileItem[] = [];

    files.forEach((file) => {
      if (selectedFileIds.has(file.id)) {
        newGroupFiles.push(file);
      } else {
        remainingFiles.push(file);
      }
    });

    if (newGroupFiles.length > 0) {
      const groupId = `group-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newGroup: FileGroup = {
        id: groupId,
        files: newGroupFiles,
        continuous: true, // デフォルトで連続ページ設定
      };
      setGroups((prev) => [...prev, newGroup]);
    }

    // 残りの非グループ化ファイルを更新し、選択をクリア
    setFiles(remainingFiles);
    setSelectedFileIds(new Set());
  };

  // 単一ファイルの削除
  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });

    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  // グループ全体の削除
  const removeGroup = (groupId: string) => {
    setGroups((prev) => {
      const groupToRemove = prev.find((g) => g.id === groupId);
      if (groupToRemove) {
        // プレビューURLをクリーンアップ
        groupToRemove.files.forEach((file) => {
          if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl);
          }
        });
      }
      return prev.filter((g) => g.id !== groupId);
    });
  };

  // グループの連続設定のトグル
  const toggleContinuous = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, continuous: !g.continuous } : g
      )
    );
  };

  // コンポーネントのアンマウント時にURLオブジェクトを解放
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });

      groups.forEach((group) => {
        group.files.forEach((file) => {
          if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl);
          }
        });
      });
    };
  }, [files, groups]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* アップロードエリア */}
      <div
        {...getRootProps({
          className: `mb-4 p-6 border-2 border-dashed rounded-xl text-center transition-colors cursor-pointer
                     ${
                       isDragActive
                         ? "border-blue-500 bg-blue-50 text-blue-500"
                         : "border-gray-400 text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 hover:border-blue-500 hover:text-blue-500"
                     }`,
        })}
      >
        <input {...getInputProps()} />
        <p className="text-lg">
          ここにファイルをドラッグ＆ドロップ
          <br />
          またはクリックして選択
        </p>
        <p className="text-sm mt-2">
          サポート形式: PDF, JPG, PNG, GIF, WEBP, BMP
        </p>
      </div>

      {/* 処理中インジケータ */}
      {isProcessing && (
        <div className="flex justify-center items-center my-4 p-3 bg-blue-50 text-blue-600 rounded-md">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{processingMessage || "処理中..."}</span>
        </div>
      )}

      {/* グループ化アクションボタン */}
      {files.length > 0 && (
        <div className="mb-4 text-right">
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:bg-blue-700 transition"
            onClick={groupSelectedFiles}
            disabled={selectedFileIds.size < 2}
          >
            選択したファイルをグループ化 ({selectedFileIds.size})
          </button>
        </div>
      )}

      {/* 未グループ化ファイルリスト */}
      {files.length > 0 && (
        <div className="space-y-2 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            アップロードファイル
          </h2>
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm border rounded-lg shadow-sm
                        ${
                          file.isConverted
                            ? "border-blue-200 bg-blue-50/30"
                            : "border-gray-200"
                        }
                        ${
                          selectedFileIds.has(file.id)
                            ? "ring-2 ring-blue-500"
                            : ""
                        }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <input
                  type="checkbox"
                  className="mr-2 accent-blue-600"
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => toggleFileSelect(file.id)}
                />

                {/* ファイルアイコンまたはプレビュー */}
                {file.previewUrl ? (
                  <div className="relative w-12 h-12 mr-3 border border-gray-200 rounded overflow-hidden">
                    <Image
                      src={file.previewUrl}
                      alt={file.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span
                    className="w-12 h-12 mr-3 flex items-center justify-center 
                             bg-gray-200 text-gray-600 text-xs font-bold rounded"
                  >
                    {file.type.includes("pdf") ? "PDF" : "FILE"}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{file.name}</p>
                  {file.isConverted && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      変換済み
                    </span>
                  )}
                </div>
              </div>

              <button
                className="text-gray-500 hover:text-red-600 text-xl font-bold px-2"
                onClick={() => removeFile(file.id)}
                title="削除"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* グループリスト */}
      {groups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            グループ化ファイル
          </h2>
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 bg-white/30 backdrop-blur-sm border border-gray-300 rounded-lg shadow"
            >
              {/* グループヘッダー */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-gray-700 font-semibold">
                  グループ ({group.files.length}ファイル)
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 flex items-center">
                    <input
                      type="checkbox"
                      className="mr-1 accent-blue-600"
                      checked={group.continuous}
                      onChange={() => toggleContinuous(group.id)}
                    />
                    連続ページ
                  </label>
                  <button
                    className="text-gray-500 hover:text-red-600 text-xl font-bold"
                    onClick={() => removeGroup(group.id)}
                    title="グループを削除"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* グループファイルプレビュー */}
              <div className="flex flex-wrap gap-2">
                {group.files.map((file, idx) => (
                  <div key={file.id} className="relative group">
                    <div className="w-24 h-24 border border-gray-200 rounded overflow-hidden bg-gray-100">
                      {file.previewUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={file.previewUrl}
                            alt={file.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                          {file.type.includes("pdf") ? "PDF" : "FILE"}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-gray-600 truncate text-center w-24">
                      {file.name.length > 15
                        ? `${file.name.substring(0, 15)}...`
                        : file.name}
                    </div>

                    {/* 連続アイコン */}
                    {idx < group.files.length - 1 && group.continuous && (
                      <div className="absolute -right-2 top-10 z-10 text-gray-400">
                        →
                      </div>
                    )}

                    {/* ホバー時の詳細情報 */}
                    <div className="absolute hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -translate-x-1/4 -bottom-2 z-20">
                      <p className="truncate">{file.name}</p>
                      <p>タイプ: {file.type}</p>
                      {file.isConverted && (
                        <p className="text-blue-300">変換済みファイル</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ファイル処理アクション */}
      {(files.length > 0 || groups.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              disabled={groups.length === 0}
            >
              処理を開始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
