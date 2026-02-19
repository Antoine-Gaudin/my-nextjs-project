"use client";

import dynamic from "next/dynamic";

const ImageConverter = dynamic(() => import("@/app/components/ImageConverter"), {
  ssr: false,
});

export default function ConvertirWebpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <ImageConverter />
    </div>
  );
}
