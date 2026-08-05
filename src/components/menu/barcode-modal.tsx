"use client";

import { useRef, useState } from "react";
import Barcode from "react-barcode";
import { Download, X, QrCode } from "lucide-react";

export type BarcodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    barcode?: string;
    code?: string;
    sku?: string;
    price?: number;
  } | null;
};

export default function BarcodeModal({ isOpen, onClose, item }: BarcodeModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<"CODE128" | "EAN13" | "UPC" | "CODE39">("CODE128");
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !item) return null;

  const barcodeValue = item.barcode || item.code || item.sku || item.id || "12345678";
  const itemName = item.name || "Product";

  const handleDownloadPNG = () => {
    if (!containerRef.current) return;
    setDownloading(true);
    try {
      const svgElement = containerRef.current.querySelector("svg");
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // High resolution
        const width = (svgElement.clientWidth || 300) * scale;
        const height = (svgElement.clientHeight || 150) * scale;
        
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);

          const png = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = png;
          downloadLink.download = `${itemName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_barcode.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobURL);
        setDownloading(false);
      };
      image.src = blobURL;
    } catch {
      setDownloading(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!containerRef.current) return;
    try {
      const svgElement = containerRef.current.querySelector("svg");
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `${itemName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_barcode.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } catch (err) {
      console.error("Failed SVG download", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{itemName}</h3>
            <p className="text-xs text-gray-500">Value: {barcodeValue}</p>
          </div>
        </div>

        {/* Format Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Barcode Format
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["CODE128", "EAN13", "UPC", "CODE39"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                  format === fmt
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Barcode Render Area */}
        <div
          ref={containerRef}
          className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 shadow-xs"
        >
          <Barcode
            value={barcodeValue}
            format={format}
            renderer="svg"
            width={1.8}
            height={64}
            margin={0}
            fontSize={14}
            background="#ffffff"
            lineColor="#111827"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-98 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : "Download PNG"}
          </button>
          <button
            type="button"
            onClick={handleDownloadSVG}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all"
          >
            <Download className="h-4 w-4" />
            SVG
          </button>
        </div>
      </div>
    </div>
  );
}
