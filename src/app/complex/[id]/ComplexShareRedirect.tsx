"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ComplexShareRedirect({
  complexId,
}: {
  complexId: string;
}) {
  const router = useRouter();
  const targetUrl = `/?complexId=${encodeURIComponent(complexId)}`;

  useEffect(() => {
    router.replace(targetUrl);
  }, [router, targetUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 text-[#eaf2ff]">
      <div className="w-full max-w-md rounded-3xl border border-cyan-400/15 bg-[#0b1118] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">
          KOAPTIX SHARE LINK
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          단지 보드로 이동 중
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          잠시 후 메인 보드 위에서 해당 단지 바텀 시트가 자동으로 열린다.
        </p>
        <a
          href={targetUrl}
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
        >
          자동 이동이 안 되면 직접 열기
        </a>
      </div>
    </main>
  );
}