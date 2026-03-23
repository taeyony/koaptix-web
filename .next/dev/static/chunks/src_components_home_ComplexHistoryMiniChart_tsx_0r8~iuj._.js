(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/home/ComplexHistoryMiniChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ComplexHistoryMiniChart",
    ()=>ComplexHistoryMiniChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Line.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/LineChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const DEFAULT_COLORS = [
    "#22d3ee",
    "#e879f9",
    "#34d399",
    "#f59e0b"
];
function formatMarketCapCompact(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)}조`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)}억`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function formatMarketCapFull(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function buildSingleSeries(data) {
    if (!data || data.length === 0) return [];
    const trend = data[data.length - 1].value - data[0].value;
    const color = trend >= 0 ? "#22d3ee" : "#e879f9";
    return [
        {
            key: "series_0",
            name: "Market Cap",
            color,
            points: data
        }
    ];
}
function buildMergedDataset(series) {
    const merged = new Map();
    for (const entry of series){
        for (const point of entry.points){
            const current = merged.get(point.snapshotDate) ?? {
                snapshotDate: point.snapshotDate,
                label: point.label
            };
            current[entry.key] = point.value;
            merged.set(point.snapshotDate, current);
        }
    }
    return Array.from(merged.values()).sort((a, b)=>String(a.snapshotDate).localeCompare(String(b.snapshotDate)));
}
function ComplexHistoryMiniChart({ data, series }) {
    _s();
    const normalizedSeries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ComplexHistoryMiniChart.useMemo[normalizedSeries]": ()=>{
            const base = series && series.length > 0 ? series : buildSingleSeries(data);
            return base.filter({
                "ComplexHistoryMiniChart.useMemo[normalizedSeries]": (entry)=>entry.points.length > 0
            }["ComplexHistoryMiniChart.useMemo[normalizedSeries]"]).map({
                "ComplexHistoryMiniChart.useMemo[normalizedSeries]": (entry, index)=>({
                        ...entry,
                        color: entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                    })
            }["ComplexHistoryMiniChart.useMemo[normalizedSeries]"]);
        }
    }["ComplexHistoryMiniChart.useMemo[normalizedSeries]"], [
        data,
        series
    ]);
    const mergedData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ComplexHistoryMiniChart.useMemo[mergedData]": ()=>buildMergedDataset(normalizedSeries)
    }["ComplexHistoryMiniChart.useMemo[mergedData]"], [
        normalizedSeries
    ]);
    if (normalizedSeries.length === 0 || mergedData.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55",
            children: "차트를 그릴 히스토리 데이터가 아직 충분하지 않다."
        }, void 0, false, {
            fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
            lineNumber: 108,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative w-full overflow-hidden rounded-2xl border border-white/8 bg-black/25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-0 opacity-80",
                style: {
                    background: normalizedSeries.length > 1 ? "radial-gradient(circle at top left, rgba(34,211,238,0.10), transparent 34%), radial-gradient(circle at top right, rgba(232,121,249,0.10), transparent 34%)" : `radial-gradient(circle at top right, ${normalizedSeries[0].color}22, transparent 40%)`
                }
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative border-b border-white/6 px-3 py-2.5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-2",
                    children: normalizedSeries.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "h-2 w-2 rounded-full",
                                    style: {
                                        backgroundColor: entry.color,
                                        boxShadow: `0 0 14px ${entry.color}`
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                    lineNumber: 133,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: entry.name
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                    lineNumber: 140,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, entry.key, true, {
                            fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                            lineNumber: 129,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                    lineNumber: 127,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative h-[220px] w-full px-1 py-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                    width: "100%",
                    height: "100%",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineChart"], {
                        data: mergedData,
                        margin: {
                            top: 12,
                            right: 12,
                            left: 0,
                            bottom: 4
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                vertical: false,
                                stroke: "rgba(255,255,255,0.08)",
                                strokeDasharray: "3 3"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                lineNumber: 149,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                dataKey: "label",
                                axisLine: false,
                                tickLine: false,
                                minTickGap: 18,
                                tickMargin: 10,
                                tick: {
                                    fill: "#94a3b8",
                                    fontSize: 11
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                lineNumber: 155,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                width: 56,
                                axisLine: false,
                                tickLine: false,
                                tickFormatter: (value)=>formatMarketCapCompact(Number(value)),
                                tick: {
                                    fill: "#94a3b8",
                                    fontSize: 11
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                lineNumber: 164,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                cursor: {
                                    stroke: "rgba(255,255,255,0.16)",
                                    strokeWidth: 1
                                },
                                contentStyle: {
                                    background: "#081018",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: 16
                                },
                                labelFormatter: (label, payload)=>{
                                    const point = payload?.[0]?.payload;
                                    return point?.snapshotDate ?? String(label);
                                },
                                formatter: (value, name)=>[
                                        formatMarketCapFull(Number(value)),
                                        String(name)
                                    ]
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                lineNumber: 172,
                                columnNumber: 13
                            }, this),
                            normalizedSeries.map((entry, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                                    type: "monotone",
                                    dataKey: entry.key,
                                    name: entry.name,
                                    stroke: entry.color,
                                    strokeWidth: 2.5,
                                    dot: false,
                                    connectNulls: true,
                                    activeDot: {
                                        r: 4,
                                        fill: entry.color,
                                        strokeWidth: 0
                                    },
                                    style: {
                                        filter: `drop-shadow(0 0 10px ${entry.color}88)`
                                    },
                                    strokeDasharray: index % 2 === 1 ? "5 4" : undefined
                                }, entry.key, false, {
                                    fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                                    lineNumber: 195,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                    lineNumber: 147,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/ComplexHistoryMiniChart.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
_s(ComplexHistoryMiniChart, "u0ogkLR70kSluw75FBdvKSG3qcc=");
_c = ComplexHistoryMiniChart;
var _c;
__turbopack_context__.k.register(_c, "ComplexHistoryMiniChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/ComplexHistoryMiniChart.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/home/ComplexHistoryMiniChart.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_components_home_ComplexHistoryMiniChart_tsx_0r8~iuj._.js.map