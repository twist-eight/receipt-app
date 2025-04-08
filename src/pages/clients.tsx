// src/pages/clients.tsx
import { useState } from "react";
import { useClientContext } from "../contexts/ClientContext";
import { Client, DocumentTypeConfig } from "../types/client";
import { v4 as uuidv4 } from "uuid";

export default function ClientsPage() {
  const { clients, addClient, updateClient, removeClient } = useClientContext();
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: "",
    // notionDatabaseIdを削除
    documentTypes: [],
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 既存の種類定義 (アプリ全体で共通)
  const baseDocumentTypes = [
    { type: "領収書", subTypes: [] },
    { type: "明細書", subTypes: [] },
    { type: "契約書", subTypes: ["賃貸契約", "業務委託契約", "売買契約"] },
    { type: "見積書", subTypes: [] },
    { type: "通帳", subTypes: ["普通預金", "当座預金", "定期預金"] },
  ];

  // 編集中のクライアント
  const editingClient = editingClientId
    ? clients.find((c) => c.id === editingClientId)
    : null;

  // 新規クライアント追加
  const handleAddClient = () => {
    if (!newClient.name) {
      setError("顧問先名は必須です");
      return;
    }

    const client: Client = {
      id: uuidv4(),
      name: newClient.name,
      documentTypes: newClient.documentTypes?.length
        ? newClient.documentTypes
        : baseDocumentTypes,
    };

    addClient(client);
    setNewClient({
      name: "",
      // リセット部分も修正
      documentTypes: [],
    });
    setIsAddingClient(false);
    setError(null);
  };

  // クライアント更新
  const handleUpdateClient = () => {
    if (!editingClient) return;
    if (!editingClient.name) {
      setError("顧問先名は必須です");
      return;
    }

    updateClient(editingClient.id, editingClient);
    setEditingClientId(null);
    setError(null);
  };

  // クライアント削除
  const handleRemoveClient = (id: string) => {
    if (confirm("この顧問先を削除してもよろしいですか？")) {
      removeClient(id);
      if (editingClientId === id) {
        setEditingClientId(null);
      }
    }
  };

  // ドキュメント種類の追加
  const handleAddDocumentType = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const newDocTypes = [...client.documentTypes, { type: "", subTypes: [] }];
    updateClient(clientId, { documentTypes: newDocTypes });
  };

  // ドキュメント種類の更新
  const handleUpdateDocumentType = (
    clientId: string,
    index: number,
    updates: Partial<DocumentTypeConfig>
  ) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const updatedDocTypes = [...client.documentTypes];
    updatedDocTypes[index] = { ...updatedDocTypes[index], ...updates };
    updateClient(clientId, { documentTypes: updatedDocTypes });
  };

  // ドキュメント種類の削除
  const handleRemoveDocumentType = (clientId: string, index: number) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const updatedDocTypes = client.documentTypes.filter((_, i) => i !== index);
    updateClient(clientId, { documentTypes: updatedDocTypes });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">顧問先設定</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* 顧問先一覧 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">顧問先一覧</h2>
          <button
            onClick={() => setIsAddingClient(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            新規追加
          </button>
        </div>

        {clients.length === 0 ? (
          <p className="text-gray-500">顧問先が登録されていません</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧問先名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ドキュメント種類
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.documentTypes.length}種類
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingClientId(client.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleRemoveClient(client.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新規顧問先フォーム */}
      {isAddingClient && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">新規顧問先の追加</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧問先名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) =>
                  setNewClient({ ...newClient, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
                placeholder="例: 株式会社サンプル"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingClient(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顧問先編集フォーム */}
      {editingClientId && editingClient && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">顧問先情報の編集</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧問先名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingClient.name}
                onChange={(e) =>
                  updateClient(editingClientId, { name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* ドキュメント種類設定 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium">ドキュメント種類設定</h3>
                <button
                  onClick={() => handleAddDocumentType(editingClientId)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + 種類を追加
                </button>
              </div>

              {editingClient.documentTypes.map((docType, index) => (
                <div key={index} className="border p-3 rounded-md mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <input
                      type="text"
                      value={docType.type}
                      onChange={(e) =>
                        handleUpdateDocumentType(editingClientId, index, {
                          type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="ドキュメント種類名"
                    />
                    <button
                      onClick={() =>
                        handleRemoveDocumentType(editingClientId, index)
                      }
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      サブタイプ（カンマ区切りで入力）
                    </label>
                    <input
                      type="text"
                      value={docType.subTypes.join(", ")}
                      onChange={(e) => {
                        const subTypes = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s);
                        handleUpdateDocumentType(editingClientId, index, {
                          subTypes,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="例: A銀行, B銀行, C信用金庫"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingClientId(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateClient}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
