// components/Toast.tsx
import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000); // Auto close after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const getColor = () => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={`fixed bottom-5 right-5 p-4 rounded-lg z-99999 text-white ${getColor()}`}
      role="alert"
    >
      <div className="flex justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">
          X
        </button>
      </div>
    </div>
  );
};

export default Toast;
