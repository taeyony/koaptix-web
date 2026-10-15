export function SearchProgress({ label = "단지를 찾고 있어요" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" data-testid="search-progress" className="flex items-center justify-center gap-3 px-4 py-5 text-control text-ink">
      <span aria-hidden="true" className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-[var(--ko-accent)] border-r-transparent motion-reduce:animate-none" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-caption text-muted">잠시만 기다려 주세요.</span>
      </span>
    </div>
  );
}
