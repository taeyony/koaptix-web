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
    "getComplexChartHistory",
    ()=>getComplexChartHistory,
    "getComplexDetailById",
    ()=>getComplexDetailById,
    "getHomeKpi",
    ()=>getHomeKpi,
    "getIndexChartRows",
    ()=>getIndexChartRows,
    "getLatestRankBoard",
    ()=>getLatestRankBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const SEOUL_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;
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
function toNumber(value, fallback = 0) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}
function toSeoulDateString(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: SEOUL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const year = parts.find((part)=>part.type === "year")?.value ?? "1970";
    const month = parts.find((part)=>part.type === "month")?.value ?? "01";
    const day = parts.find((part)=>part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
}
function shiftSeoulDateString(baseDate, diffDays) {
    const seeded = new Date(`${baseDate}T00:00:00+09:00`);
    return toSeoulDateString(new Date(seeded.getTime() + diffDays * DAY_MS));
}
function normalizeComplexId(complexId) {
    if (typeof complexId === "number") return complexId;
    const parsed = Number(complexId);
    return Number.isFinite(parsed) ? parsed : complexId;
}
function extractComplexIds(rows) {
    return rows.map((row)=>{
        if (row.complex_id == null) return null;
        const parsed = Number(row.complex_id);
        return Number.isFinite(parsed) ? parsed : null;
    }).filter((value)=>value !== null);
}
function buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous) {
    if (!previous) {
        return {
            history_snapshot_date: null,
            rank_delta_7d: 0,
            market_cap_delta_7d: 0,
            market_cap_delta_pct_7d: 0
        };
    }
    const previousRank = toNumber(previous.rank_all, currentRank);
    const previousMarketCap = toNumber(previous.market_cap_krw, currentMarketCap);
    const rankDelta7d = previousRank - currentRank;
    const marketCapDelta7d = currentMarketCap - previousMarketCap;
    const marketCapDeltaPct7d = previousMarketCap > 0 ? Number((marketCapDelta7d / previousMarketCap * 100).toFixed(2)) : 0;
    return {
        history_snapshot_date: previous.snapshot_date ?? null,
        rank_delta_7d: rankDelta7d,
        market_cap_delta_7d: marketCapDelta7d,
        market_cap_delta_pct_7d: marketCapDeltaPct7d
    };
}
async function getWeeklyAnchorDate(supabase) {
    try {
        const { data, error } = await supabase.from("complex_rank_history").select("snapshot_date").order("snapshot_date", {
            ascending: false
        }).limit(1).maybeSingle();
        if (error) {
            throw error;
        }
        return data?.snapshot_date ?? toSeoulDateString(new Date());
    } catch  {
        return toSeoulDateString(new Date());
    }
}
async function fetchWeeklyComparisonMap(supabase, complexIds) {
    if (complexIds.length === 0) {
        return new Map();
    }
    const anchorDate = await getWeeklyAnchorDate(supabase);
    const targetDate = shiftSeoulDateString(anchorDate, -7);
    const floorDate = shiftSeoulDateString(targetDate, -14);
    try {
        const { data, error } = await supabase.from("complex_rank_history").select("snapshot_date, complex_id, market_cap_krw, rank_all").in("complex_id", complexIds).gte("snapshot_date", floorDate).lte("snapshot_date", targetDate).order("snapshot_date", {
            ascending: false
        }).limit(Math.min(Math.max(complexIds.length * 14, 50), 1000));
        if (error) {
            throw error;
        }
        const result = new Map();
        for (const row of data ?? []){
            const key = row.complex_id == null ? "" : String(row.complex_id);
            if (!key || result.has(key)) continue;
            result.set(key, row);
        }
        return result;
    } catch (error) {
        console.warn("[KOAPTIX] weekly comparison history lookup failed:", error);
        return new Map();
    }
}
async function fetchWeeklyComparisonByComplexId(supabase, complexId) {
    const anchorDate = await getWeeklyAnchorDate(supabase);
    const targetDate = shiftSeoulDateString(anchorDate, -7);
    const floorDate = shiftSeoulDateString(targetDate, -14);
    try {
        const { data, error } = await supabase.from("complex_rank_history").select("snapshot_date, complex_id, market_cap_krw, rank_all").eq("complex_id", normalizeComplexId(complexId)).gte("snapshot_date", floorDate).lte("snapshot_date", targetDate).order("snapshot_date", {
            ascending: false
        }).limit(1).maybeSingle();
        if (error) {
            throw error;
        }
        return data ?? null;
    } catch (error) {
        console.warn("[KOAPTIX] weekly comparison detail lookup failed:", error);
        return null;
    }
}
async function getLatestRankBoard(limit = 50) {
    const supabase = createServerSupabase();
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const { data, error } = await supabase.from("v_koaptix_latest_rank_board").select(`
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        sigungu_name,
        legal_dong_name
      `).order("rank_all", {
        ascending: true
    }).limit(safeLimit);
    if (error) {
        throw new Error(`Failed to fetch v_koaptix_latest_rank_board: ${error.message}`);
    }
    const liveRows = data ?? [];
    if (liveRows.length === 0) {
        return [];
    }
    const comparisonMap = await fetchWeeklyComparisonMap(supabase, extractComplexIds(liveRows));
    return liveRows.map((row)=>{
        const key = row.complex_id == null ? "" : String(row.complex_id);
        const previous = comparisonMap.get(key) ?? null;
        const currentRank = toNumber(row.rank_all, 0);
        const currentMarketCap = toNumber(row.market_cap_krw, row.market_cap_trillion_krw != null ? Math.round(toNumber(row.market_cap_trillion_krw, 0) * 1_000_000_000_000) : 0);
        return {
            ...row,
            ...buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous)
        };
    });
}
async function getComplexDetailById(complexId) {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("v_koaptix_complex_detail_sheet").select(`
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
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
    const liveRow = data ?? null;
    if (!liveRow) {
        return null;
    }
    const previous = await fetchWeeklyComparisonByComplexId(supabase, complexId);
    const currentRank = toNumber(liveRow.rank_all, 0);
    const currentMarketCap = toNumber(liveRow.market_cap_krw, liveRow.market_cap_trillion_krw != null ? Math.round(toNumber(liveRow.market_cap_trillion_krw, 0) * 1_000_000_000_000) : 0);
    return {
        ...liveRow,
        ...buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous)
    };
}
async function getIndexChartRows(limit = 180) {
    const supabase = createServerSupabase();
    const safeLimit = Math.max(12, Math.min(limit, 365));
    const { data, error } = await supabase.from("v_koaptix_total_market_cap_history").select("snapshot_date, total_market_cap").order("snapshot_date", {
        ascending: false
    }).limit(safeLimit);
    if (error) {
        throw new Error(`Failed to fetch v_koaptix_total_market_cap_history: ${error.message}`);
    }
    return data ?? [];
}
async function getHomeKpi() {
    const supabase = createServerSupabase();
    try {
        const { data, error } = await supabase.from("v_koaptix_home_kpi").select("*").maybeSingle();
        if (error) throw error;
        return data;
    } catch (error) {
        console.warn("[KOAPTIX] Failed to fetch KPI:", error);
        return null;
    }
}
async function getComplexChartHistory(complexId, options = {}) {
    const supabase = createServerSupabase();
    const safeDays = Math.max(90, Math.min(options.days ?? 180, 180));
    const anchorDate = await getWeeklyAnchorDate(supabase);
    const startDate = shiftSeoulDateString(anchorDate, -safeDays);
    const { data, error } = await supabase.from("complex_rank_history").select("snapshot_date, complex_id, market_cap_krw, rank_all").eq("complex_id", normalizeComplexId(complexId)).gte("snapshot_date", startDate).lte("snapshot_date", anchorDate).order("snapshot_date", {
        ascending: true
    }).limit(Math.min(safeDays + 14, 240));
    if (error) {
        throw new Error(`Failed to fetch complex chart history: ${error.message}`);
    }
    return data ?? [];
}
}),
"[project]/src/lib/koaptix/mappers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mapComplexChartHistoryRows",
    ()=>mapComplexChartHistoryRows,
    "mapComplexDetailRow",
    ()=>mapComplexDetailRow,
    "mapHomeKpiToKpiCards",
    ()=>mapHomeKpiToKpiCards,
    "mapIndexChartRows",
    ()=>mapIndexChartRows,
    "mapLatestRankBoardRow",
    ()=>mapLatestRankBoardRow,
    "mapLatestRankBoardRows",
    ()=>mapLatestRankBoardRows
]);
function toNumber(value, fallback = 0) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}
function toNullableNumber(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function toText(value) {
    return value?.trim() ?? "";
}
function toIdText(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}
function buildLocationLabel(sigunguName, legalDongName) {
    return [
        sigunguName,
        legalDongName
    ].filter(Boolean).join(" ").trim();
}
function formatChartLabel(snapshotDate) {
    const [, month = "00", day = "00"] = snapshotDate.split("-");
    return `${month}.${day}`;
}
function getWeekBucket(snapshotDate) {
    const date = new Date(`${snapshotDate}T00:00:00Z`);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
}
function normalizeChartRows(rows) {
    return rows.map((row)=>({
            snapshotDate: row.snapshot_date,
            value: toNumber(row.total_market_cap, 0)
        })).filter((row)=>row.snapshotDate.length > 0).sort((a, b)=>a.snapshotDate.localeCompare(b.snapshotDate));
}
function applyMovingAverage(rows, windowSize = 7) {
    return rows.map((row, index)=>{
        const start = Math.max(0, index - (windowSize - 1));
        const windowRows = rows.slice(start, index + 1);
        const average = windowRows.reduce((sum, current)=>sum + current.value, 0) / windowRows.length;
        return {
            snapshotDate: row.snapshotDate,
            value: Math.round(average)
        };
    });
}
function selectWeeklyRows(rows) {
    const latestByWeek = new Map();
    for (const row of rows){
        latestByWeek.set(getWeekBucket(row.snapshotDate), row);
    }
    return Array.from(latestByWeek.values()).sort((a, b)=>a.snapshotDate.localeCompare(b.snapshotDate));
}
function mapLatestRankBoardRow(row) {
    const complexId = toIdText(row.complex_id);
    const name = toText(row.apt_name_ko);
    const rank = toNumber(row.rank_all, 0);
    const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
    const marketCapKrw = toNumber(row.market_cap_krw, marketCapTrillionKrw !== null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0);
    const rankDelta7d = toNumber(row.rank_delta_7d, 0);
    const marketCapDelta7d = toNumber(row.market_cap_delta_7d, 0);
    const marketCapDeltaPct7d = toNumber(row.market_cap_delta_pct_7d, 0);
    const sigunguName = toText(row.sigungu_name);
    const legalDongName = toText(row.legal_dong_name);
    const locationLabel = buildLocationLabel(sigunguName, legalDongName);
    return {
        complexId,
        name,
        rank,
        marketCapKrw,
        marketCapTrillionKrw,
        sigunguName,
        legalDongName,
        locationLabel,
        searchText: [
            name,
            complexId,
            sigunguName,
            legalDongName,
            locationLabel
        ].filter(Boolean).join(" ").toLowerCase(),
        historySnapshotDate: row.history_snapshot_date ?? null,
        rankDelta7d,
        marketCapDelta7d,
        marketCapDeltaPct7d,
        deltaWindow: "7d",
        // 기존 하위 컴포넌트 호환
        rankDelta1d: rankDelta7d
    };
}
function mapLatestRankBoardRows(rows) {
    return rows.map(mapLatestRankBoardRow).filter((item)=>item.complexId.length > 0 && item.rank > 0 && item.name.length > 0).sort((a, b)=>a.rank - b.rank);
}
function mapComplexDetailRow(row) {
    const complexId = toIdText(row.complex_id);
    const name = toText(row.apt_name_ko);
    const rank = toNumber(row.rank_all, 0);
    const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
    const marketCapKrw = toNumber(row.market_cap_krw, marketCapTrillionKrw !== null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0);
    const sigunguName = toText(row.sigungu_name);
    const legalDongName = toText(row.legal_dong_name);
    const locationLabel = buildLocationLabel(sigunguName, legalDongName);
    const approvalYear = toNullableNumber(row.approval_year);
    const currentYear = new Date().getFullYear();
    const rankDelta7d = toNumber(row.rank_delta_7d, 0);
    const marketCapDelta7d = toNumber(row.market_cap_delta_7d, 0);
    const marketCapDeltaPct7d = toNumber(row.market_cap_delta_pct_7d, 0);
    return {
        complexId,
        name,
        rank,
        marketCapKrw,
        marketCapTrillionKrw,
        sigunguName,
        legalDongName,
        locationLabel,
        householdCount: toNullableNumber(row.household_count),
        approvalYear,
        ageYears: approvalYear != null ? Math.max(currentYear - approvalYear, 0) : null,
        buildingCount: toNullableNumber(row.building_count),
        parkingCount: toNullableNumber(row.parking_count),
        updatedAt: row.updated_at ?? null,
        historySnapshotDate: row.history_snapshot_date ?? null,
        rankDelta7d,
        marketCapDelta7d,
        marketCapDeltaPct7d,
        deltaWindow: "7d",
        // 기존 하위 컴포넌트 호환
        rankDelta1d: rankDelta7d
    };
}
function mapIndexChartRows(rows, options = {}) {
    const mode = options.mode ?? "weekly";
    const maxPoints = options.maxPoints ?? 26;
    const normalized = normalizeChartRows(rows);
    if (normalized.length === 0) {
        return [];
    }
    const series = mode === "ma7" ? applyMovingAverage(normalized, 7) : selectWeeklyRows(normalized);
    return series.slice(-maxPoints).map((row)=>({
            label: formatChartLabel(row.snapshotDate),
            value: row.value
        }));
}
function mapHomeKpiToKpiCards(row) {
    // DB에서 값이 안 넘어오면 기본 화면(Fallback)을 띄워줍니다.
    const totalMarketCap = row?.total_market_cap_krw || row?.market_cap_krw;
    let marketCapDisplay = "468.8조원";
    if (totalMarketCap && totalMarketCap >= 1_000_000_000_000) {
        marketCapDisplay = `${(totalMarketCap / 1_000_000_000_000).toFixed(1)}조원`;
    } else if (totalMarketCap) {
        marketCapDisplay = `${new Intl.NumberFormat("ko-KR").format(totalMarketCap)}원`;
    }
    const complexCount = row?.total_complex_count || row?.listed_units || 501;
    return [
        {
            label: "MARKET CAP",
            value: marketCapDisplay,
            subValue: "코앱틱스 전체 단지"
        },
        {
            label: "LISTED UNITS",
            value: `${new Intl.NumberFormat("ko-KR").format(complexCount)}개`,
            subValue: "2025년 1월 기준"
        }
    ];
}
function normalizeComplexHistoryRows(rows) {
    return rows.map((row)=>({
            snapshotDate: row.snapshot_date,
            value: toNumber(row.market_cap_krw, 0)
        })).filter((row)=>row.snapshotDate.length > 0 && row.value > 0).sort((a, b)=>a.snapshotDate.localeCompare(b.snapshotDate));
}
function mapComplexChartHistoryRows(rows, options = {}) {
    const mode = options.mode ?? "weekly";
    const maxPoints = options.maxPoints ?? (mode === "weekly" ? 26 : 60);
    const normalized = normalizeComplexHistoryRows(rows);
    if (normalized.length === 0) {
        return [];
    }
    const series = mode === "ma7" ? applyMovingAverage(normalized, 7) : selectWeeklyRows(normalized);
    return series.slice(-maxPoints).map((row)=>({
            snapshotDate: row.snapshotDate,
            label: formatChartLabel(row.snapshotDate),
            value: row.value
        }));
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