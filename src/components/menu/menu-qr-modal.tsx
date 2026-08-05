"use client";

import { useEffect, useState } from "react";
import { Download, X, QrCode, ExternalLink, Copy, Check } from "lucide-react";

export type MenuQRModalProps = {
  isOpen: boolean;
  onClose: () => void;
  menuUrl?: string;
};

export default function MenuQRModal({ isOpen, onClose, menuUrl }: MenuQRModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTargetUrl(menuUrl || `${window.location.origin}/menu`);
    }
  }, [menuUrl, isOpen]);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(targetUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      setDownloading(true);
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = "pos_menu_qr_code.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download QR image", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Digital Menu QR Code</h3>
            <p className="text-xs text-gray-500">Scan or download for your customers</p>
          </div>
        </div>

        {/* QR Code Render Area */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-inner my-4">
          <img
            src={qrImageUrl}
            alt="Menu QR Code"
            className="h-52 w-52 rounded-xl bg-white p-2 shadow-sm object-contain"
          />
          <p className="text-xs font-semibold text-gray-500 mt-3 text-center truncate max-w-full px-2">
            {targetUrl}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadQR}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00a651] px-4 py-3 text-sm font-bold text-white hover:bg-[#008f45] active:scale-98 transition-all disabled:opacity-50 shadow-md shadow-[#00a651]/20"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : "Download QR Code (PNG)"}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy Menu URL"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Menu Page in New Tab
          </a>
        </div>
      </div>
    </div>
  );
}
