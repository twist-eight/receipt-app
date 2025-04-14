// src/components/AppProviders.tsx
import React, { ReactNode } from "react";
import { ClientProvider } from "../contexts/ClientContext";
import { ReceiptProvider } from "../contexts/ReceiptContext";
import { ToastProvider } from "./ToastContext";
import { LoadingProvider } from "./LoadingContext";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <LoadingProvider>
      <ToastProvider>
        <ClientProvider>
          <ReceiptProvider>{children}</ReceiptProvider>
        </ClientProvider>
      </ToastProvider>
    </LoadingProvider>
  );
};

export default AppProviders;
