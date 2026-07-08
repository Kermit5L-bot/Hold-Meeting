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
        />
      ) : (
        <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,#1d4ed8,#0f172a_58%,#047857)] p-5">
          <span className="rounded bg-white/15 px-2 py-1 text-xs font-medium text-white/90">
            市场部会议服务
          </span>
        </div>
      )}
    </div>
  );
}
