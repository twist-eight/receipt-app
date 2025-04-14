// src/components/AppProviders.tsx
import React, { ReactNode } from "react";
import { ClientProvider } from "../contexts/ClientContext";
import { ReceiptProvider } from "../contexts/ReceiptContext";
import { ToastProvider } from "../components/ToastContext";
import { LoadingProvider } from "../contexts/LoadingContext";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * アプリケーション全体で使用するコンテキストプロバイダーをまとめたコンポーネント
 * プロバイダーの順序は重要 - 依存関係のあるプロバイダーは内側にネストする
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <LoadingProvider>
      <ToastProvider position="top-right" maxToasts={5}>
        <ClientProvider>
          <ReceiptProvider>{children}</ReceiptProvider>
        </ClientProvider>
      </ToastProvider>
    </LoadingProvider>
  );
};

export default AppProviders;
