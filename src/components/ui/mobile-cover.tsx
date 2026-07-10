"use client";

import { useState } from "react";
import Image from "next/image";

export function MobileCover({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const shouldShowImage = Boolean(src && !failed);
  const imageSrc = src ?? "";

  return (
    <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-blue-600 via-slate-800 to-emerald-600">
      {shouldShowImage ? (
        <Image
          alt={alt}
          className="object-cover"
          fill
          onError={() => setFailed(true)}
          sizes="(max-width: 768px) 100vw, 448px"
          src={imageSrc}
          unoptimized
        />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,#1d4ed8,#0f172a_58%,#047857)]" />
      )}
    </div>
  );
}
