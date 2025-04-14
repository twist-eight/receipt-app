// src/components/ErrorMessage.tsx
import React from "react";

interface ErrorMessageProps {
  message: string | null;
  onClose?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onClose,
  className = "",
}) => {
  if (!message) return null;

  return (
    <div className={`mb-4 p-3 bg-red-100 text-red-700 rounded-md ${className}`}>
      {message}
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-red-700 hover:text-red-900"
          aria-label="エラーメッセージを閉じる"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
