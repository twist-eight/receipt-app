// src/pages/upload.tsx

import { useState } from "react";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">領収書アップロード</h1>
      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFileChange}
        className="mb-4"
      />
      <ul className="space-y-2">
        {files.map((file, i) => (
          <li key={i} className="p-2 bg-gray-100 rounded shadow">
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
