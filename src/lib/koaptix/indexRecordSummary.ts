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
