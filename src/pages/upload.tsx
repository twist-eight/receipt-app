import React, { useState, DragEvent, ChangeEvent } from "react";
import Image from "next/image";

type FileItem = {
  id: string;
  name: string;
  type: string;
  previewUrl?: string;
};

type FileGroup = {
  id: string;
  files: FileItem[];
  continuous: boolean;
};

const Upload: React.FC = () => {
  // state for ungrouped files and grouped sets
  const [files, setFiles] = useState<FileItem[]>([]);
  const [groups, setGroups] = useState<FileGroup[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );

  // handle file selection via input or drop
  const handleFilesAdded = (fileList: FileList) => {
    const newFiles: FileItem[] = [];
    Array.from(fileList).forEach((file) => {
      const id = `${Date.now()}-${file.name}`;
      const fileItem: FileItem = {
        id,
        name: file.name,
        type: file.type,
      };
      // If image, create a preview URL
      if (file.type.startsWith("image/")) {
        fileItem.previewUrl = URL.createObjectURL(file);
      }
      // For PDFs, we could set a generic icon or PDF preview if needed
      newFiles.push(fileItem);
    });
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(e.target.files);
    }
  };

  // handle selection via checkbox
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

  // group selected files
  const groupSelectedFiles = () => {
    if (selectedFileIds.size < 2) return; // need at least 2 to group
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
      const groupId = `group-${Date.now()}`;
      const newGroup: FileGroup = {
        id: groupId,
        files: newGroupFiles,
        continuous: true, // default to continuous pages
      };
      setGroups((prev) => [...prev, newGroup]);
    }
    // update remaining ungrouped files and clear selection
    setFiles(remainingFiles);
    setSelectedFileIds(new Set());
  };

  // remove a single file (ungrouped)
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  // remove a whole group
  const removeGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // toggle continuous option for a group
  const toggleContinuous = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, continuous: !g.continuous } : g
      )
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Upload area */}
      <div
        className="mb-4 p-6 border-2 border-dashed border-gray-400 rounded-xl text-center text-gray-500 
                   hover:border-blue-500 hover:text-blue-500 transition-colors cursor-pointer 
                   bg-gradient-to-r from-gray-50 to-gray-100"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <p className="text-lg">
          ここにファイルをドラッグ＆ドロップ
          <br />
          またはクリックして選択
        </p>
        <input
          id="fileInput"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFileInputChange}
        />
      </div>

      {/* Group action button */}
      {files.length > 0 && (
        <div className="mb-4 text-right">
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:bg-blue-700 transition"
            onClick={groupSelectedFiles}
            disabled={selectedFileIds.size < 2}
          >
            選択したファイルをグループ化
          </button>
        </div>
      )}

      {/* Ungrouped files list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm border border-gray-200 
                         rounded-lg shadow-sm"
            >
              <div className="flex items-center min-w-0">
                <input
                  type="checkbox"
                  className="mr-2 accent-blue-600"
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => toggleFileSelect(file.id)}
                />
                {/* File icon or preview */}
                {file.type.startsWith("image/") ? (
                  <Image
                    src={file.previewUrl!}
                    alt={file.name}
                    width={32}
                    height={32}
                    className="rounded mr-2 object-cover"
                  />
                ) : (
                  <span
                    className="w-8 h-8 mr-2 flex items-center justify-center 
                                   bg-red-500 text-white text-xs font-bold rounded"
                  >
                    PDF
                  </span>
                )}
                <span className="text-sm text-gray-800 truncate">
                  {file.name}
                </span>
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

      {/* Groups list */}
      {groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 bg-white/30 backdrop-blur-sm border border-gray-300 rounded-lg shadow"
            >
              {/* Group header */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-gray-700 font-semibold">
                  グループ {group.id}
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
              {/* Group file previews */}
              <div className="flex flex-wrap gap-2">
                {group.files.map((file, idx) => (
                  <div
                    key={file.id}
                    className="flex items-center text-sm text-gray-800 bg-gray-100 rounded px-2 py-1"
                  >
                    {file.type.startsWith("image/") ? (
                      <Image
                        src={file.previewUrl!}
                        alt={file.name}
                        width={24}
                        height={24}
                        className="rounded mr-1 object-cover"
                      />
                    ) : (
                      <span
                        className="w-6 h-6 mr-1 flex items-center justify-center 
                                       bg-red-500 text-white text-xs font-bold rounded"
                      >
                        PDF
                      </span>
                    )}
                    <span className="truncate max-w-[100px]">{file.name}</span>
                    {idx < group.files.length - 1 && group.continuous && (
                      <span className="mx-1 text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;
