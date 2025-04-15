import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesChange,
  accept = "image/*,application/pdf",
  multiple = true,
  maxFiles = 10,
  className = "",
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!multiple && acceptedFiles.length > 1) {
        acceptedFiles = [acceptedFiles[0]];
      }

      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`最大${maxFiles}ファイルまでアップロード可能です`);
        return;
      }

      const newFiles = [...files, ...acceptedFiles];
      setFiles(newFiles);
      onFilesChange(newFiles);
      setError(null);
    },
    [files, multiple, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { accept: [accept] } : undefined,
    multiple,
  });

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeAllFiles = () => {
    setFiles([]);
    onFilesChange([]);
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">ファイルをドロップしてアップロード</p>
        ) : (
          <div>
            <p>クリックまたはドラッグ＆ドロップでファイルをアップロード</p>
            <p className="text-sm text-gray-500 mt-1">
              {accept === "image/*,application/pdf"
                ? "画像ファイルまたはPDFをアップロード"
                : `${accept}形式のファイルをアップロード`}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">
              アップロードファイル ({files.length})
            </h3>
            {files.length > 1 && (
              <button
                type="button"
                onClick={removeAllFiles}
                className="text-sm text-red-500 hover:text-red-700"
              >
                すべて削除
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="border p-2 rounded shadow-sm relative flex items-center"
              >
                <div className="flex-1 truncate pr-6">
                  <p className="text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
