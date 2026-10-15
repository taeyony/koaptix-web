export function HomeV2SectionHeading({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="ko-section-heading flex flex-wrap items-end justify-between gap-4">
      <h2 className="ko-section-title text-section font-bold tracking-heading text-ink">
        {title}
      </h2>
      {note ? (
        <p className="max-w-[16rem] text-right text-caption leading-copy text-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}
