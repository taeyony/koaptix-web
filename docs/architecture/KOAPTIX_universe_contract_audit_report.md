KOAPTIX universe contract audit report
작성 시점 기준 이 실행 환경에는 KOAPTIX 기준 문서 4개만 존재하고, 실제 앱 소스(`src/...`)는 없습니다.
따라서 아래 내용은 문서 기준 확정 계약 + 코드 부재 상태에서의 exact-replacement 지침입니다.
실코드가 제공되면 그대로 대조/패치/빌드 검증으로 이어가면 됩니다.
---
1. 문서 기준으로 고정해야 하는 판단
멀티 유니버스 공식 source of truth는
`koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`
체인이다.
`complex_rank_history`는 universe_code 없는 단일 이력 엔진이다.
home/search/ranking/map은 같은 `universe_code` 계약으로 맞춰야 한다.
현재 1차 서비스 노출 universe는 광역 4종만 고정한다.
`KOREA_ALL`
`SEOUL_ALL`
`BUSAN_ALL`
`GYEONGGI_ALL`
SGG는 additive only 2차 확장으로 미룬다.
home universe transition은 page-level SSR full reload로 되돌리지 않는다.
`v_koaptix_latest_rank_board`는 legacy/KOREA 호환 뷰로만 보고, 멀티 유니버스 공식 source로 되돌리지 않는다.
---
2. 실제 코드에서 반드시 확인해야 하는 1차 감리 포인트
A. `src/lib/koaptix/universes.ts`
중앙 registry 단일 관리인지
`UniverseCode`, `UniverseOption`, `{ code, label }` shape가 유지되는지
현재 서비스 노출 universe가 광역 4종으로 고정돼 있는지
SGG가 selector 기본 노출 목록에 섞여 있지 않은지
API/query/selectors가 모두 여기서 import 하는지
B. `src/app/api/search/route.ts`
query param 이름이 `universe` 또는 `universe_code` 중 하나로 정리돼 있는지
들어온 값을 registry helper로 정규화/검증하는지
local alias map / 하드코딩 / if-else universe 목록을 route 안에서 별도 유지하지 않는지
실제 query source가 `v_koaptix_latest_universe_rank_board_u`인지
legacy `v_koaptix_latest_rank_board`로 후퇴하지 않았는지
C. `src/components/home/CommandPalette.tsx`
현재 선택 universe를 코드값(`KOREA_ALL` 등)으로 들고 있는지
`/api/search` 호출 시 label/slug가 아니라 canonical code를 넘기는지
home universe 전환 때 full reload가 아니라 delivery fetch만 갱신하는지
D. ranking/TOP1000 selector 파일
selector option source가 `universes.ts` registry인지
selector에 보이는 universe와 실제 API/query로 보내는 universe가 같은 값인지
광역 4종 외 SGG가 기본 노출되지 않는지
E. `src/app/page.tsx`, `src/lib/koaptix/queries.ts`
SSR initial seed도 registry와 같은 code contract를 쓰는지
`getLatestRankBoard`가 `v_koaptix_latest_universe_rank_board_u`를 읽는지
KOREA/지역 limit 분기만 있고 source rollback은 없는지
---
3. 권장 exact-replacement 기준안
아래 코드는 실제 파일이 없어서 타입/DB helper 이름은 가정했지만,
문서 기준 계약 자체는 그대로 반영한 최소 기준안입니다.
3-1. `src/lib/koaptix/universes.ts`
```ts
export const PRIMARY_SERVICE_UNIVERSES = [
  { code: 'KOREA_ALL', label: '전국' },
  { code: 'SEOUL_ALL', label: '서울' },
  { code: 'BUSAN_ALL', label: '부산' },
  { code: 'GYEONGGI_ALL', label: '경기' },
] as const;

export type PrimaryServiceUniverseCode =
  (typeof PRIMARY_SERVICE_UNIVERSES)[number]['code'];

export type UniverseCode = PrimaryServiceUniverseCode | `SGG_${string}`;

export type UniverseOption = {
  code: UniverseCode;
  label: string;
};

export const DEFAULT_UNIVERSE_CODE: PrimaryServiceUniverseCode = 'KOREA_ALL';

export function getPrimaryUniverseOptions(): UniverseOption[] {
  return [...PRIMARY_SERVICE_UNIVERSES];
}

export function isPrimaryServiceUniverseCode(
  value: string | null | undefined,
): value is PrimaryServiceUniverseCode {
  return PRIMARY_SERVICE_UNIVERSES.some((option) => option.code === value);
}

export function isCanonicalUniverseCode(
  value: string | null | undefined,
): value is UniverseCode {
  if (!value) return false;
  if (isPrimaryServiceUniverseCode(value)) return true;
  return /^SGG_\d{5}$/.test(value);
}

export function normalizePrimaryUniverseCode(
  value: string | null | undefined,
): PrimaryServiceUniverseCode {
  return isPrimaryServiceUniverseCode(value) ? value : DEFAULT_UNIVERSE_CODE;
}

export function getUniverseLabel(code: UniverseCode): string {
  const found = PRIMARY_SERVICE_UNIVERSES.find((option) => option.code === code);
  if (found) return found.label;
  if (code.startsWith('SGG_')) return code;
  return code;
}
```
핵심은 다음입니다.
canonical universe contract는 `code`
현재 서비스 노출 목록은 광역 4종만
SGG는 type/helper 수준에서만 additive 허용, 기본 selector 노출에서는 제외
3-2. `src/app/api/search/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { normalizePrimaryUniverseCode } from '@/lib/koaptix/universes';
import { searchUniverseBoard } from '@/lib/koaptix/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get('q') ?? '').trim();
  const limit = Number(searchParams.get('limit') ?? '10');
  const universeCode = normalizePrimaryUniverseCode(
    searchParams.get('universe') ?? searchParams.get('universe_code'),
  );

  if (!q) {
    return NextResponse.json({ items: [], universeCode });
  }

  const items = await searchUniverseBoard({
    universeCode,
    query: q,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 10,
  });

  return NextResponse.json({ items, universeCode });
}
```
핵심은 다음입니다.
route 안에서 universe 하드코딩 금지
registry helper로 normalize
query source helper도 same contract 사용
3-3. `src/components/home/CommandPalette.tsx`
```tsx
import type { PrimaryServiceUniverseCode } from '@/lib/koaptix/universes';

interface CommandPaletteProps {
  universeCode: PrimaryServiceUniverseCode;
}

export function CommandPalette({ universeCode }: CommandPaletteProps) {
  async function runSearch(q: string) {
    const params = new URLSearchParams({
      q,
      universe: universeCode,
      limit: '10',
    });

    const res = await fetch(`/api/search?${params.toString()}`);
    return res.json();
  }

  // ...existing palette UI
}
```
금지 패턴은 다음입니다.
label(`서울`) 전달
slug(`seoul`) 전달
palette 내부 독자 alias map 유지
3-4. ranking/TOP1000 selector
```ts
import {
  getPrimaryUniverseOptions,
  type PrimaryServiceUniverseCode,
} from '@/lib/koaptix/universes';

export const TOP1000_UNIVERSE_OPTIONS = getPrimaryUniverseOptions();

export type Top1000UniverseCode = PrimaryServiceUniverseCode;
```
또는 React selector라면:
```tsx
const options = getPrimaryUniverseOptions();

<select value={universeCode} onChange={(e) => setUniverseCode(e.target.value as PrimaryServiceUniverseCode)}>
  {options.map((option) => (
    <option key={option.code} value={option.code}>
      {option.label}
    </option>
  ))}
</select>
```
핵심은 selector 노출값과 실제 query 전달값이 동일한 `option.code`여야 한다는 점입니다.
3-5. `src/lib/koaptix/queries.ts`
```ts
import {
  normalizePrimaryUniverseCode,
  type PrimaryServiceUniverseCode,
} from '@/lib/koaptix/universes';

export async function getLatestRankBoard(params?: {
  universeCode?: string | null;
  limit?: number;
}) {
  const universeCode: PrimaryServiceUniverseCode = normalizePrimaryUniverseCode(
    params?.universeCode,
  );

  const limit = Math.max(1, Math.min(params?.limit ?? 20, 100));

  // source는 반드시 v_koaptix_latest_universe_rank_board_u
  return queryLatestUniverseRankBoard({ universeCode, limit });
}
```
3-6. `src/app/page.tsx`
```ts
import { DEFAULT_UNIVERSE_CODE } from '@/lib/koaptix/universes';
import { getLatestRankBoard } from '@/lib/koaptix/queries';

const initialUniverseCode = DEFAULT_UNIVERSE_CODE;
const initialBoardLimit = initialUniverseCode === 'KOREA_ALL' ? 40 : 60;

const initialBoard = await getLatestRankBoard({
  universeCode: initialUniverseCode,
  limit: initialBoardLimit,
});
```
실제 코드에 이미 regional 60 / KOREA 40 분기가 있다면,
그 분기만 registry code 기준으로 유지하면 됩니다.
---
4. repo가 생기면 즉시 돌릴 grep 체크
```bash
rg -n "KOREA_ALL|SEOUL_ALL|BUSAN_ALL|GYEONGGI_ALL|SGG_" src
rg -n "latest_rank_board" src
rg -n "latest_universe_rank_board_u" src
rg -n "api/search|CommandPalette|universeCode|universe_code|universe=" src
rg -n "서울|부산|경기|전국|seoul|busan|gyeonggi|korea" src/app src/components src/lib
```
판정 기준:
`src/lib/koaptix/universes.ts` 밖에서 universe 목록을 또 선언하면 정렬 실패
`/api/search`가 `latest_rank_board`를 보면 실패
selector가 label을 value로 쓰면 실패
`CommandPalette`가 현재 universe를 props/state/query에서 안 받으면 실패
TOP1000 selector와 query param 값이 다르면 실패
---
5. 최종 합격 판정 체크리스트
home/search/ranking이 같은 `universe_code` contract로 움직인다.
selector에 노출되는 universe와 실제 query universe가 일치한다.
광역 4종만 1차 서비스 노출로 고정된다.
SGG는 기본 비노출 또는 검증 subset만 additive로 붙는다.
multi-universe source가 legacy view로 되돌아가지 않는다.
home universe transition이 SSR full reload로 되돌아가지 않는다.