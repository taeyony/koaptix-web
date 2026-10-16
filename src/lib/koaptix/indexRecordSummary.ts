type IndexRecord = { snapshotDate: string; value: number; componentComplexCount: number | null };
export type IndexRecordRange = IndexRecord & { endDate: string; recordCount: number };

/** Presentation only: preserve gaps, exact values, counts, and the original records. */
export function summarizeIndexRecords(rows: readonly IndexRecord[]): IndexRecordRange[] {
  const ranges: IndexRecordRange[] = [];
  for (const row of [...rows].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))) {
    const last = ranges.at(-1);
    const consecutive = last && Date.parse(row.snapshotDate + "T00:00:00Z") - Date.parse(last.endDate + "T00:00:00Z") === 86_400_000;
    if (last && consecutive && last.value === row.value && last.componentComplexCount === row.componentComplexCount) {
      last.endDate = row.snapshotDate;
      last.recordCount += 1;
    } else ranges.push({ ...row, endDate: row.snapshotDate, recordCount: 1 });
  }
  return ranges;
}

/** Change-log view: retain missing observation days explicitly when equal values span a gap. */
export function summarizeIndexChanges(rows: readonly IndexRecord[]) {
  const changes: (IndexRecordRange & { unrecordedDays: number; previousGapDays: number })[] = [];
  for (const range of summarizeIndexRecords(rows)) {
    const last = changes.at(-1);
    const gap = last ? Math.round((Date.parse(range.snapshotDate + "T00:00:00Z") - Date.parse(last.endDate + "T00:00:00Z")) / 86_400_000) : 0;
    if (last && last.value === range.value && last.componentComplexCount === range.componentComplexCount) {
      last.endDate = range.endDate;
      last.recordCount += range.recordCount;
      last.unrecordedDays += Math.max(0, gap - 1);
    } else changes.push({ ...range, unrecordedDays: 0, previousGapDays: gap });
  }
  return changes;
}
