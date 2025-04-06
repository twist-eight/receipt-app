import { useState, useEffect } from "react";
import { useClientContext } from "../contexts/ClientContext";
import NotionSettings, {
  NotionConfigSettings,
} from "../components/NotionSettings";

export default function NotionPage() {
  const [globalSettings, setGlobalSettings] = useState<NotionConfigSettings>({
    apiKey: "",
  });
  const [showGlobalSettings, setShowGlobalSettings] = useState(true);
  const { clients, selectedClientId, setSelectedClientId, updateClient } =
    useClientContext();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 保存されているAPIキーを読み込む
  useEffect(() => {
    const savedApiKey = localStorage.getItem("notionApiKey");
    if (savedApiKey) {
      setGlobalSettings((prev) => ({ ...prev, apiKey: savedApiKey }));
    }
  }, []);

  // グローバル設定の保存
  const handleSaveGlobalSettings = (settings: NotionConfigSettings) => {
    localStorage.setItem("notionApiKey", settings.apiKey);
    setGlobalSettings(settings);
    setMessage({ type: "success", text: "グローバル設定が保存されました" });
    setTimeout(() => setMessage(null), 3000);
  };

  // 顧問先別設定の保存
  const handleSaveClientSettings = (settings: NotionConfigSettings) => {
    if (!selectedClientId) return;

    // ClientContextを通じて更新
    updateClient(selectedClientId, { notionApiKey: settings.apiKey });

    setMessage({ type: "success", text: "顧問先別設定が保存されました" });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notion連携設定</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">共通設定</h2>
          <button
            onClick={() => setShowGlobalSettings(!showGlobalSettings)}
            className="text-blue-600 hover:underline text-sm flex items-center"
          >
            {showGlobalSettings ? "閉じる" : "開く"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ml-1 transform ${
                showGlobalSettings ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {showGlobalSettings && (
          <NotionSettings
            onSave={handleSaveGlobalSettings}
            initialSettings={globalSettings}
          />
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">顧問先別設定</h2>

        {clients.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-500 mb-2">顧問先が登録されていません</p>
            <button
              onClick={() => (window.location.href = "/clients")}
              className="text-blue-600 hover:underline"
            >
              顧問先設定ページで登録する
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                顧問先選択
              </label>
              <select
                value={selectedClientId || ""}
                onChange={(e) => setSelectedClientId(e.target.value || null)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">顧問先を選択してください</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClientId && (
              <div>
                <h3 className="text-md font-medium mb-2">
                  {clients.find((c) => c.id === selectedClientId)?.name} の設定
                </h3>
                <NotionSettings
                  onSave={handleSaveClientSettings}
                  initialSettings={{
                    apiKey:
                      clients.find((c) => c.id === selectedClientId)
                        ?.notionApiKey || "",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
