module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/lib/koaptix/queries.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getComplexDetailById",
    ()=>getComplexDetailById,
    "getHomeKpi",
    ()=>getHomeKpi,
    "getIndexChart",
    ()=>getIndexChart,
    "getLatestRankBoard",
    ()=>getLatestRankBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
function createServerSupabase() {
    const supabaseUrl = ("TURBOPACK compile-time value", "https://dsnqbadkyfmzeikzgvqp.supabase.co");
    const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbnFiYWRreWZtemVpa3pndnFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUzNjU5NywiZXhwIjoyMDg5MTEyNTk3fQ.BXvMbY_ohkRYQ0X23qX9vVo0jdIUIL8CdXVZhCWW8xc");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}
async function getLatestRankBoard(limit = 50, offset = 0) {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("v_koaptix_latest_rank_board").select("*").order("rank_all", {
        ascending: true
    }).range(offset, offset + limit - 1); // 💡 여기서 지정한 구간(예: 51위~100위)만큼만 잘라서 가져옵니다!
    if (error) {
        console.error("Failed to fetch latest rank board:", error);
        throw error;
    }
    return data ?? [];
}
function normalizeComplexId(complexId) {
    if (typeof complexId === "number") return complexId;
    const parsed = Number(complexId);
    return Number.isFinite(parsed) ? parsed : complexId;
}
async function getComplexDetailById(complexId) {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("v_koaptix_complex_detail_sheet").select(`
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        rank_delta_1d,
        sigungu_name,
        legal_dong_name,
        household_count,
        approval_year,
        building_count,
        parking_count,
        updated_at
      `).eq("complex_id", normalizeComplexId(complexId)).maybeSingle();
    if (error) {
        throw new Error(`Failed to fetch complex detail: ${error.message}`);
    }
    return data ?? null;
}
async function getHomeKpi() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("v_koaptix_home_kpi").select("*").maybeSingle();
    if (error) {
        console.error("Failed to fetch home KPI:", error);
        return null;
    }
    return data;
}
async function getIndexChart() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("v_koaptix_total_market_cap_history") // 👈 지차장이 만든 최신 시계열 뷰로 교체!
    .select("*").order("snapshot_date", {
        ascending: true
    });
    if (error) {
        console.error("Failed to fetch chart data:", error);
        return [];
    }
    return data || [];
}
}),
"[project]/src/lib/koaptix/mappers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mapComplexDetailRow",
    ()=>mapComplexDetailRow,
    "mapHomeKpiToKpiCards",
    ()=>mapHomeKpiToKpiCards,
    "mapIndexChartData",
    ()=>mapIndexChartData,
    "mapLatestRankBoardRow",
    ()=>mapLatestRankBoardRow,
    "mapLatestRankBoardRows",
    ()=>mapLatestRankBoardRows
]);
function toNumber(value, fallback = 0) {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}
function toNullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function toOptionalNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function toText(value) {
    return value?.trim() ?? "";
}
function toIdText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}
function buildLocationLabel(sigunguName, legalDongName) {
    return [
        sigunguName,
        legalDongName
    ].filter(Boolean).join(" ").trim();
}
function mapLatestRankBoardRow(row) {
    const complexId = toIdText(row.complex_id);
    const name = toText(row.apt_name_ko);
    const rank = toNumber(row.rank_all);
    const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
    const marketCapKrw = toNumber(row.market_cap_krw, marketCapTrillionKrw !== null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0);
    const rankDelta1d = toNumber(row.rank_delta_1d);
    const sigunguName = toText(row.sigungu_name);
    const legalDongName = toText(row.legal_dong_name);
    const locationLabel = buildLocationLabel(sigunguName, legalDongName);
    return {
        complexId,
        name,
        rank,
        marketCapKrw,
        marketCapTrillionKrw,
        rankDelta1d,
        sigunguName,
        legalDongName,
        locationLabel,
        searchText: [
            name,
            complexId,
            sigunguName,
            legalDongName,
            locationLabel
        ].filter(Boolean).join(" ").toLowerCase()
    };
}
function mapLatestRankBoardRows(rows) {
    return rows.map(mapLatestRankBoardRow).filter((item)=>item.complexId.length > 0 && item.rank > 0 && item.name.length > 0).sort((a, b)=>a.rank - b.rank);
}
function mapComplexDetailRow(row) {
    const complexId = String(row.complex_id ?? "").trim();
    const name = toText(row.apt_name_ko);
    const rank = toOptionalNumber(row.rank_all) ?? 0;
    const marketCapTrillionKrw = toOptionalNumber(row.market_cap_trillion_krw);
    const marketCapKrw = toOptionalNumber(row.market_cap_krw) ?? (marketCapTrillionKrw != null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0);
    const rankDelta1d = toOptionalNumber(row.rank_delta_1d) ?? 0;
    const sigunguName = toText(row.sigungu_name);
    const legalDongName = toText(row.legal_dong_name);
    const locationLabel = buildLocationLabel(sigunguName, legalDongName);
    const householdCount = toOptionalNumber(row.household_count);
    const approvalYear = toOptionalNumber(row.approval_year);
    const buildingCount = toOptionalNumber(row.building_count);
    const parkingCount = toOptionalNumber(row.parking_count);
    const currentYear = new Date().getFullYear();
    const ageYears = approvalYear != null ? Math.max(currentYear - approvalYear, 0) : null;
    return {
        complexId,
        name,
        rank,
        marketCapKrw,
        marketCapTrillionKrw,
        rankDelta1d,
        sigunguName,
        legalDongName,
        locationLabel,
        householdCount,
        approvalYear,
        ageYears,
        buildingCount,
        parkingCount,
        updatedAt: row.updated_at ?? null
    };
}
function mapHomeKpiToKpiCards(row) {
    if (!row) {
        return [
            {
                label: "Market Cap",
                value: "-",
                subValue: "데이터 없음"
            },
            {
                label: "Listed Units",
                value: "-",
                subValue: "데이터 없음"
            }
        ];
    }
    // 1. 총 시가총액 포맷팅 (조 단위)
    const marketCapKrw = Number(row.total_market_cap) || 0;
    const TRILLION = 1_000_000_000_000;
    let formattedMarketCap = "-";
    if (marketCapKrw >= TRILLION) {
        const amount = marketCapKrw / TRILLION;
        formattedMarketCap = `${new Intl.NumberFormat("ko-KR", {
            maximumFractionDigits: 1
        }).format(amount)}조원`;
    } else if (marketCapKrw > 0) {
        formattedMarketCap = `${new Intl.NumberFormat("ko-KR").format(marketCapKrw)}원`;
    }
    // 2. 상장 단지 수 포맷팅
    const listedUnits = Number(row.total_listed_units) || 0;
    const formattedUnits = `${new Intl.NumberFormat("ko-KR").format(listedUnits)}개`;
    // 3. 기준일 포맷팅
    let formattedDate = "-";
    if (row.base_date) {
        const date = new Date(row.base_date);
        if (!Number.isNaN(date.getTime())) {
            formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 기준`;
        }
    }
    return [
        {
            label: "Market Cap",
            value: formattedMarketCap,
            subValue: "코앱틱스 전체 단지"
        },
        {
            label: "Listed Units",
            value: formattedUnits,
            subValue: formattedDate
        }
    ];
}
function mapIndexChartData(rows) {
    if (!rows || rows.length === 0) {
        return {
            valueLabel: "-",
            changePct: 0,
            chartData: []
        };
    }
    // 1. 차트에 들어갈 [날짜, 값] 배열 만들기
    const chartData = rows.map((row)=>{
        const d = row.snapshot_date ? new Date(row.snapshot_date) : new Date();
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        // 💡 시가총액 원 단위를 '조' 단위로 변환해서 차트에 꽂습니다!
        const TRILLION = 1_000_000_000_000;
        const value = row.total_market_cap ? Number(row.total_market_cap) / TRILLION : 0;
        return {
            label,
            value
        };
    });
    // 2. 최신 지수 및 전일 대비 증감률(%) 계산
    const latestValue = chartData[chartData.length - 1].value;
    let changePct = 0;
    if (chartData.length > 1) {
        const prevValue = chartData[chartData.length - 2].value;
        if (prevValue > 0) {
            changePct = (latestValue - prevValue) / prevValue * 100;
        }
    }
    return {
        valueLabel: latestValue.toFixed(2),
        changePct: Number(changePct.toFixed(2)),
        chartData
    };
}
}),
"[project]/src/app/api/complex-detail/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/koaptix/queries.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$mappers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/koaptix/mappers.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const complexId = searchParams.get("complexId");
    if (!complexId) {
        return Response.json({
            error: "complexId is required"
        }, {
            status: 400
        });
    }
    try {
        const row = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getComplexDetailById"])(complexId);
        if (!row) {
            return Response.json({
                error: "해당 단지 상세 정보가 없다."
            }, {
                status: 404
            });
        }
        return Response.json({
            data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$mappers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapComplexDetailRow"])(row)
        }, {
            status: 200
        });
    } catch (error) {
        return Response.json({
            error: error instanceof Error ? error.message : "상세 정보를 불러오지 못했다."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__00t60_x._.js.map