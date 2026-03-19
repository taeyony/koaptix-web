module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/lib/formatters.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatDateLabel",
    ()=>formatDateLabel,
    "formatIndexValue",
    ()=>formatIndexValue,
    "formatKrw",
    ()=>formatKrw,
    "formatKrwCompact",
    ()=>formatKrwCompact,
    "formatMarketCapTrillion",
    ()=>formatMarketCapTrillion,
    "formatMonthLabel",
    ()=>formatMonthLabel,
    "formatPercent",
    ()=>formatPercent,
    "formatRankDelta",
    ()=>formatRankDelta,
    "formatRatio",
    ()=>formatRatio,
    "formatSignedNumber",
    ()=>formatSignedNumber,
    "movementColor",
    ()=>movementColor,
    "tierBadgeColors",
    ()=>tierBadgeColors,
    "toNumber",
    ()=>toNumber
]);
function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
}
function formatIndexValue(value) {
    const num = toNumber(value);
    if (num === null) return "-";
    return num.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
function formatPercent(value, fractionDigits = 2) {
    const num = toNumber(value);
    if (num === null) return "-";
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toLocaleString("ko-KR", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    })}%`;
}
function formatSignedNumber(value, fractionDigits = 2) {
    const num = toNumber(value);
    if (num === null) return "-";
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toLocaleString("ko-KR", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    })}`;
}
function formatKrw(value) {
    const num = toNumber(value);
    if (num === null) return "-";
    return `${Math.round(num).toLocaleString("ko-KR")}원`;
}
function formatKrwCompact(value) {
    const num = toNumber(value);
    if (num === null) return "-";
    if (num >= 1_000_000_000_000) {
        return `${(num / 1_000_000_000_000).toLocaleString("ko-KR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}조원`;
    }
    if (num >= 100_000_000) {
        return `${(num / 100_000_000).toLocaleString("ko-KR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}억원`;
    }
    return formatKrw(num);
}
function formatMarketCapTrillion(value) {
    const num = toNumber(value);
    if (num === null) return "-";
    return `${num.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}조`;
}
function formatRatio(value) {
    const num = toNumber(value);
    if (num === null) return "-";
    return `${(num * 100).toLocaleString("ko-KR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })}%`;
}
function formatMonthLabel(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("ko-KR", {
        year: "2-digit",
        month: "short"
    }).format(date);
}
function formatDateLabel(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}
function movementColor(movement) {
    switch(movement){
        case "up":
            return "#ef4444";
        case "down":
            return "#2563eb";
        case "same":
        case "flat":
            return "#64748b";
        default:
            return "#f59e0b";
    }
}
function formatRankDelta(item) {
    if (item.previous_rank_all === null) return "NEW";
    if (item.rank_delta_1d === null) return "-";
    if (item.rank_delta_1d > 0) return `▲ ${item.rank_delta_1d}`;
    if (item.rank_delta_1d < 0) return `▼ ${Math.abs(item.rank_delta_1d)}`;
    return "―";
}
function tierBadgeColors(tierCode) {
    switch(tierCode){
        case "S":
            return {
                background: "#111827",
                color: "#f8fafc",
                border: "#111827"
            };
        case "A":
            return {
                background: "#dc2626",
                color: "#ffffff",
                border: "#dc2626"
            };
        case "B":
            return {
                background: "#2563eb",
                color: "#ffffff",
                border: "#2563eb"
            };
        case "C":
            return {
                background: "#16a34a",
                color: "#ffffff",
                border: "#16a34a"
            };
        case "D":
            return {
                background: "#e2e8f0",
                color: "#0f172a",
                border: "#cbd5e1"
            };
        default:
            return {
                background: "#f8fafc",
                color: "#334155",
                border: "#cbd5e1"
            };
    }
}
}),
"[project]/src/components/home/HomeHero.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HomeHero",
    ()=>HomeHero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/formatters.ts [app-rsc] (ecmascript)");
;
;
function HomeHero({ card }) {
    const movement = card.movement_1m ?? "flat";
    const accent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["movementColor"])(movement);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        style: {
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(17,24,39,1) 38%, rgba(30,41,59,1) 100%)",
            color: "#f8fafc",
            padding: 28,
            display: "grid",
            gap: 20
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: "grid",
                        gap: 10
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: 14,
                                letterSpacing: "0.08em",
                                color: "#cbd5e1",
                                textTransform: "uppercase"
                            },
                            children: "KOAPTIX 서울"
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 34,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: 42,
                                fontWeight: 900,
                                lineHeight: 1
                            },
                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatIndexValue"])(card.index_value)
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 37,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                flexWrap: "wrap"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        display: "inline-flex",
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        background: "rgba(255,255,255,0.12)",
                                        color: accent,
                                        fontWeight: 800,
                                        fontSize: 13
                                    },
                                    children: [
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatSignedNumber"])(card.change_1m),
                                        " (",
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatPercent"])(card.change_pct_1m),
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/HomeHero.tsx",
                                    lineNumber: 39,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        color: "#cbd5e1",
                                        fontSize: 14
                                    },
                                    children: [
                                        "기준일 ",
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatDateLabel"])(card.base_date),
                                        " = ",
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatIndexValue"])(card.base_value)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/HomeHero.tsx",
                                    lineNumber: 52,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/home/HomeHero.tsx",
                    lineNumber: 33,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        minWidth: 280,
                        display: "grid",
                        gap: 8
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricRow, {
                            label: "스냅샷 기준일",
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatDateLabel"])(card.snapshot_date)
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 59,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricRow, {
                            label: "전월 시가총액",
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatKrwCompact"])(card.prev_month_total_market_cap_krw)
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 60,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricRow, {
                            label: "현재 시가총액",
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatKrwCompact"])(card.total_market_cap_krw)
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricRow, {
                            label: "전월 대비 시총",
                            value: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatKrwCompact"])(card.market_cap_change_1m)} / ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatPercent"])(card.market_cap_change_pct_1m)}`
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 62,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricRow, {
                            label: "편입 단지 수",
                            value: `${card.component_complex_count.toLocaleString("ko-KR")}개`
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeHero.tsx",
                            lineNumber: 63,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/home/HomeHero.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/home/HomeHero.tsx",
            lineNumber: 32,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/home/HomeHero.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
function MetricRow({ label, value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 14
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    color: "#94a3b8"
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/home/HomeHero.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                style: {
                    color: "#f8fafc"
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/home/HomeHero.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/HomeHero.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/home/IndexSparkline.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IndexSparkline",
    ()=>IndexSparkline
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/formatters.ts [app-rsc] (ecmascript)");
;
;
function IndexSparkline({ points, width = 920, height = 260 }) {
    if (!points.length) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                background: "#ffffff",
                padding: 24,
                color: "#64748b"
            },
            children: "차트 데이터가 없습니다."
        }, void 0, false, {
            fileName: "[project]/src/components/home/IndexSparkline.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this);
    }
    const numeric = points.map((point)=>({
            ...point,
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toNumber"])(point.index_value)
        })).filter((point)=>point.value !== null);
    if (!numeric.length) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                background: "#ffffff",
                padding: 24,
                color: "#64748b"
            },
            children: "차트 값을 숫자로 읽지 못했습니다."
        }, void 0, false, {
            fileName: "[project]/src/components/home/IndexSparkline.tsx",
            lineNumber: 36,
            columnNumber: 7
        }, this);
    }
    const padding = {
        top: 20,
        right: 24,
        bottom: 38,
        left: 28
    };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const min = Math.min(...numeric.map((p)=>p.value));
    const max = Math.max(...numeric.map((p)=>p.value));
    const range = Math.max(max - min, 1);
    const linePath = numeric.map((point, index)=>{
        const x = padding.left + (numeric.length === 1 ? innerWidth / 2 : index / (numeric.length - 1) * innerWidth);
        const y = padding.top + innerHeight - (point.value - min) / range * innerHeight;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    const latest = numeric[numeric.length - 1];
    const latestChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toNumber"])(latest.change_1m);
    const stroke = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["movementColor"])(latestChange === null ? "flat" : latestChange > 0 ? "up" : latestChange < 0 ? "down" : "flat");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        style: {
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            background: "#ffffff",
            padding: 20,
            display: "grid",
            gap: 12
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "baseline"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 14,
                                    color: "#64748b",
                                    marginBottom: 6
                                },
                                children: "KOAPTIX 서울 추이"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                lineNumber: 85,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 24,
                                    fontWeight: 800,
                                    color: "#0f172a"
                                },
                                children: "KOAPTIX 500 우량주 지수"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: 13,
                            color: "#64748b"
                        },
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatMonthLabel"])(numeric[0].snapshot_date),
                            " ~ ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatMonthLabel"])(latest.snapshot_date)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/IndexSparkline.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                viewBox: `0 0 ${width} ${height}`,
                width: "100%",
                height: "auto",
                role: "img",
                "aria-label": "KOAPTIX line chart",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                            id: "koaptix-fill",
                            x1: "0",
                            x2: "0",
                            y1: "0",
                            y2: "1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0%",
                                    stopColor: stroke,
                                    stopOpacity: "0.18"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 96,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "100%",
                                    stopColor: stroke,
                                    stopOpacity: "0.02"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 97,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/IndexSparkline.tsx",
                            lineNumber: 95,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: padding.left,
                        y1: padding.top,
                        x2: padding.left,
                        y2: padding.top + innerHeight,
                        stroke: "#e2e8f0"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: padding.left,
                        y1: padding.top + innerHeight,
                        x2: padding.left + innerWidth,
                        y2: padding.top + innerHeight,
                        stroke: "#e2e8f0"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this),
                    [
                        0,
                        0.5,
                        1
                    ].map((ratio)=>{
                        const y = padding.top + innerHeight - ratio * innerHeight;
                        const value = min + ratio * range;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: padding.left,
                                    y1: y,
                                    x2: padding.left + innerWidth,
                                    y2: y,
                                    stroke: "#f1f5f9"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 115,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                                    x: 4,
                                    y: y + 4,
                                    fontSize: "11",
                                    fill: "#94a3b8",
                                    children: value.toLocaleString("ko-KR", {
                                        maximumFractionDigits: 0
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 116,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, ratio, true, {
                            fileName: "[project]/src/components/home/IndexSparkline.tsx",
                            lineNumber: 114,
                            columnNumber: 13
                        }, this);
                    }),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: `${linePath} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`,
                        fill: "url(#koaptix-fill)",
                        opacity: "0.8"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: linePath,
                        fill: "none",
                        stroke: stroke,
                        strokeWidth: "3",
                        strokeLinejoin: "round",
                        strokeLinecap: "round"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/IndexSparkline.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    numeric.map((point, index)=>{
                        const x = padding.left + (numeric.length === 1 ? innerWidth / 2 : index / (numeric.length - 1) * innerWidth);
                        const y = padding.top + innerHeight - (point.value - min) / range * innerHeight;
                        const isLast = index === numeric.length - 1;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: x,
                                    cy: y,
                                    r: isLast ? 5 : 3.5,
                                    fill: isLast ? "#ffffff" : stroke,
                                    stroke: stroke,
                                    strokeWidth: "2"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 138,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                                    x: x,
                                    y: height - 10,
                                    textAnchor: "middle",
                                    fontSize: "11",
                                    fill: "#94a3b8",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatMonthLabel"])(point.snapshot_date)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/IndexSparkline.tsx",
                                    lineNumber: 139,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, point.snapshot_date, true, {
                            fileName: "[project]/src/components/home/IndexSparkline.tsx",
                            lineNumber: 137,
                            columnNumber: 13
                        }, this);
                    })
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/IndexSparkline.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/IndexSparkline.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/home/TierBadge.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TierBadge",
    ()=>TierBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/formatters.ts [app-rsc] (ecmascript)");
;
;
function TierBadge({ tierCode }) {
    const style = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tierBadgeColors"])(tierCode);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 28,
            height: 28,
            padding: "0 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            background: style.background,
            color: style.color,
            border: `1px solid ${style.border}`
        },
        children: tierCode
    }, void 0, false, {
        fileName: "[project]/src/components/home/TierBadge.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/home/RankBoard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RankBoard",
    ()=>RankBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/formatters.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$TierBadge$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/TierBadge.tsx [app-rsc] (ecmascript)");
;
;
;
function RankBoard({ items, totalRankedComplexes }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        style: {
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            background: "#ffffff",
            padding: 20,
            display: "grid",
            gap: 16
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "baseline",
                    flexWrap: "wrap"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 14,
                                    color: "#64748b",
                                    marginBottom: 6
                                },
                                children: "서울 최신 랭킹"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 30,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 28,
                                    fontWeight: 900,
                                    color: "#0f172a"
                                },
                                children: "KOAPTIX Top 50"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankBoard.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: 14,
                            color: "#64748b"
                        },
                        children: [
                            "현재 랭크 편입 단지 ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                style: {
                                    color: "#0f172a"
                                },
                                children: [
                                    totalRankedComplexes.toLocaleString("ko-KR"),
                                    "개"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 34,
                                columnNumber: 23
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankBoard.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankBoard.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "grid",
                    gap: 12
                },
                children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        style: {
                            border: "1px solid #e2e8f0",
                            borderRadius: 20,
                            padding: 16,
                            display: "grid",
                            gridTemplateColumns: "92px minmax(0, 1fr) minmax(220px, 280px)",
                            gap: 16,
                            alignItems: "center"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "grid",
                                    gap: 8,
                                    justifyItems: "start"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$TierBadge$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TierBadge"], {
                                        tierCode: item.tier_code
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 53,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 28,
                                            fontWeight: 900,
                                            color: "#0f172a"
                                        },
                                        children: [
                                            "#",
                                            item.rank_all
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 54,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 12,
                                            color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["movementColor"])(item.rank_movement),
                                            fontWeight: 800
                                        },
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRankDelta"])(item)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 55,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 52,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "grid",
                                    gap: 8,
                                    minWidth: 0
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 22,
                                            fontWeight: 900,
                                            color: "#0f172a",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                        },
                                        children: item.apt_name_ko
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 61,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: "#475569",
                                            fontSize: 14
                                        },
                                        children: [
                                            item.sigungu_name ?? "-",
                                            " · ",
                                            item.legal_dong_name ?? "-"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 64,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: "#64748b",
                                            fontSize: 13,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                        },
                                        children: item.address_road ?? item.address_jibun ?? "-"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 60,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "grid",
                                    gap: 6,
                                    justifyItems: "end"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 26,
                                            fontWeight: 900,
                                            color: "#0f172a"
                                        },
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatMarketCapTrillion"])(item.market_cap_trillion_krw)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 73,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: "#475569",
                                            fontSize: 14
                                        },
                                        children: [
                                            "시총 비중 ",
                                            item.market_cap_share_pct ?? "-",
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 76,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: "#64748b",
                                            fontSize: 13
                                        },
                                        children: [
                                            "가치 ",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatKrwCompact"])(item.market_cap_krw)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 77,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: "#64748b",
                                            fontSize: 13
                                        },
                                        children: [
                                            "세대 커버리지 ",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formatters$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRatio"])(item.priced_household_ratio)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/RankBoard.tsx",
                                        lineNumber: 78,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/RankBoard.tsx",
                                lineNumber: 72,
                                columnNumber: 13
                            }, this)
                        ]
                    }, item.complex_id, true, {
                        fileName: "[project]/src/components/home/RankBoard.tsx",
                        lineNumber: 40,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/home/RankBoard.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/RankBoard.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/home/HomeShell.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HomeShell",
    ()=>HomeShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$HomeHero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/HomeHero.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$IndexSparkline$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/IndexSparkline.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$RankBoard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/RankBoard.tsx [app-rsc] (ecmascript)");
;
;
;
;
function HomeShell({ data }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        style: {
            minHeight: "100vh",
            background: "#f8fafc",
            color: "#0f172a"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                maxWidth: 1240,
                margin: "0 auto",
                padding: "32px 20px 64px",
                display: "grid",
                gap: 24
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    style: {
                        display: "grid",
                        gap: 8
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: 13,
                                color: "#64748b",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase"
                            },
                            children: "KOAPTIX · 서울 아파트 시가총액 랭킹 / 지수"
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeShell.tsx",
                            lineNumber: 25,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            style: {
                                margin: 0,
                                fontSize: 42,
                                lineHeight: 1.05,
                                fontWeight: 900
                            },
                            children: "KOAPTIX 500 우량주 지수"
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeShell.tsx",
                            lineNumber: 28,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                margin: 0,
                                fontSize: 16,
                                color: "#475569",
                                maxWidth: 820
                            },
                            children: "메인 화면은 랭킹이 주인공이고, KOAPTIX 지수는 시장 온도계입니다. 톤은 약간 B급 증권소, 계산은 진지한 원칙을 그대로 유지합니다."
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/HomeShell.tsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/home/HomeShell.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$HomeHero$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HomeHero"], {
                    card: data.indexCard
                }, void 0, false, {
                    fileName: "[project]/src/components/home/HomeShell.tsx",
                    lineNumber: 36,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$IndexSparkline$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IndexSparkline"], {
                    points: data.chart
                }, void 0, false, {
                    fileName: "[project]/src/components/home/HomeShell.tsx",
                    lineNumber: 37,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$RankBoard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RankBoard"], {
                    items: data.topRanks,
                    totalRankedComplexes: data.totalRankedComplexes
                }, void 0, false, {
                    fileName: "[project]/src/components/home/HomeShell.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/home/HomeShell.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/home/HomeShell.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/lib/supabase/admin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSupabaseAdminClient",
    ()=>getSupabaseAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
;
let cachedClient = null;
function getSupabaseAdminClient() {
    if (cachedClient) return cachedClient;
    const url = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) {
        throw new Error("SUPABASE_URL is missing");
    }
    if (!serviceRole) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    }
    cachedClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, serviceRole, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        db: {
            schema: "public"
        },
        global: {
            headers: {
                "X-Client-Info": "koaptix-home-frontend-starter"
            }
        }
    });
    return cachedClient;
}
}),
"[project]/src/lib/koaptix/home.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getKoaptixHomePayload",
    ()=>getKoaptixHomePayload
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/admin.ts [app-rsc] (ecmascript)");
;
function clampInt(value, min, max, fallback) {
    if (value === undefined || Number.isNaN(value)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(value)));
}
async function getKoaptixHomePayload(options = {}) {
    const topN = clampInt(options.topN, 1, 50, 50);
    const chartPoints = clampInt(options.chartPoints, 3, 36, 12);
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSupabaseAdminClient"])();
    const { data, error } = await supabase.from("v_koaptix_home_seoul_latest_payload").select("*").single();
    if (error) {
        throw new Error(`Failed to load KOAPTIX home payload: ${error.message}`);
    }
    if (!data) {
        throw new Error("KOAPTIX home payload view returned no rows");
    }
    const row = data;
    return {
        indexCard: row.index_card,
        chart: (row.index_chart ?? []).slice(-chartPoints),
        topRanks: (row.top50 ?? []).slice(0, topN),
        topN,
        chartPoints,
        top50Count: row.top50_count,
        totalRankedComplexes: row.total_ranked_complexes,
        fetchedAt: new Date().toISOString()
    };
}
}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$HomeShell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/HomeShell.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$home$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/koaptix/home.ts [app-rsc] (ecmascript)");
;
;
;
const dynamic = "force-dynamic";
async function Page() {
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$koaptix$2f$home$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getKoaptixHomePayload"])({
        topN: 50,
        chartPoints: 12
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$HomeShell$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HomeShell"], {
        data: data
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 12,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__02oy-0o._.js.map