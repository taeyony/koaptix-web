import { MarketChartCard } from "../components/home/MarketChartCard";
import { RankingCard } from "../components/home/RankingCard";
// 아래 경로는 의장님의 supabase 설정 파일 위치에 맞게 수정이 필요할 수 있습니다!
// 보통 src/lib/supabase/client.ts 또는 admin.ts에 있습니다.
// import { supabase } from "@/lib/supabase/client"; 

/**
 * [잼이사 비기] 알맹이(데이터)를 가져오는 함수입니다.
 * 원래 의장님이 쓰시던 로직이 있다면 이 내용을 그에 맞게 교체하시면 됩니다!
 */
async function getHomeData() {
  // 실제 DB 연결 전까지 에러가 안 나게끔 임시(Mock) 데이터를 넣어두겠습니다.
  // 나중에 여기서 직접 Supabase 데이터를 fetch 하시면 됩니다!
  return {
    kpis: [
      { label: "Market Cap", value: "1,239.74", subValue: "+4.39 (+0.36%)" },
      { label: "Listed Units", value: "501개", subValue: "24년 7월 기준" },
    ],
    index: {
      valueLabel: "1,239.74",
      changePct: 0.36,
      chartData: [
        { label: "07.31", value: 1000 },
        { label: "08.31", value: 1080 },
        { label: "09.30", value: 1120 },
        { label: "10.31", value: 1180 },
        { label: "11.30", value: 1210 },
        { label: "12.31", value: 1230 },
        { label: "01.31", value: 1239 },
      ],
    },
    rankings: [
      { code: "APT001", name: "반포 자이", rank: 1, price: 3500000000, changePct: 1.2 },
      { code: "APT002", name: "압구정 현대", rank: 2, price: 4200000000, changePct: -0.5 },
      // ... 추가 데이터
    ],
  };
}

export default async function Page() {
  // 이제 이 함수가 위에서 정의되었으므로 빨간 줄이 사라집니다!
  const home = await getHomeData();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-[#eaf2ff]">
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4 lg:px-6 lg:pb-12">
        {/* 상단 타이틀 섹션 */}
        <section className="mb-3 grid gap-3 sm:mb-4 sm:gap-4">
          <div className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
            <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                    KOAPTIX LIVE BOARD
                  </p>
                  <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl lg:text-[32px]">
                    KOAPTIX 500 / Top 50
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-white/55 sm:text-[15px]">
                    모바일 최적화 및 HTS 보드 레이아웃 적용 완료
                  </p>
                </div>

                {/* KPI 요약 카드 */}
                <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:max-w-[360px]">
                  {home.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">
                        {kpi.label}
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                        {kpi.value}
                      </p>
                      {kpi.subValue && (
                        <p className="mt-1 text-xs text-white/45 sm:text-sm">{kpi.subValue}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 메인 컨텐츠 섹션 (차트 + 랭킹) */}
        <section className="grid gap-3 sm:gap-4 lg:grid-cols-12">
          {/* 차트 영역 (7열 차지) */}
          <div className="min-w-0 lg:col-span-7">
            <MarketChartCard
              title="KOAPTIX 500"
              valueLabel={home.index.valueLabel}
              changePct={home.index.changePct}
              data={home.index.chartData}
            />
          </div>

          {/* 랭킹 영역 (5열 차지) */}
          <div className="min-w-0 lg:col-span-5">
            <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
              <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                      LEADERS BOARD
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
                      Top 50 Rankings
                    </h2>
                  </div>
                </div>
              </div>

              {/* 랭킹 리스트 */}
              <div className="grid grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 lg:max-h-[600px] lg:overflow-y-auto">
                {home.rankings.map((item) => (
                  <RankingCard key={item.code} item={item} />
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}