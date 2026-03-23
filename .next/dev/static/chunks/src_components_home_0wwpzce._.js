(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/home/HapiPhilosophyTrigger.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HapiPhilosophyTrigger",
    ()=>HapiPhilosophyTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function HapiPhilosophyTrigger() {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // 💡 잼이사 마법: 화면이 완전히 켜진 뒤에만 포탈을 열기 위한 장치
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HapiPhilosophyTrigger.useEffect": ()=>{
            setMounted(true);
        }
    }["HapiPhilosophyTrigger.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HapiPhilosophyTrigger.useEffect": ()=>{
            if (!open) return;
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            const onKeyDown = {
                "HapiPhilosophyTrigger.useEffect.onKeyDown": (e)=>{
                    if (e.key === "Escape") setOpen(false);
                }
            }["HapiPhilosophyTrigger.useEffect.onKeyDown"];
            window.addEventListener("keydown", onKeyDown);
            return ({
                "HapiPhilosophyTrigger.useEffect": ()=>{
                    document.body.style.overflow = prevOverflow;
                    window.removeEventListener("keydown", onKeyDown);
                }
            })["HapiPhilosophyTrigger.useEffect"];
        }
    }["HapiPhilosophyTrigger.useEffect"], [
        open
    ]);
    // 💡 잼이사 조립: 짤리지 않는 무적의 인라인 스타일 팝업창
    const modalContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999999,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                },
                onClick: ()=>setOpen(false)
            }, void 0, false, {
                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                style: {
                    position: 'relative',
                    width: '100%',
                    maxWidth: '760px',
                    backgroundColor: '#0b1118',
                    border: '1px solid rgba(34,211,238,0.2)',
                    borderRadius: '24px',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'absolute',
                            inset: 0,
                            opacity: 0.7,
                            pointerEvents: 'none',
                            backgroundImage: 'radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(217,70,239,0.12), transparent 28%)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'relative',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            padding: '24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            margin: '0 0 12px 0',
                                            fontSize: '12px',
                                            color: 'rgba(103,232,249,0.7)',
                                            letterSpacing: '2px',
                                            fontWeight: 'bold'
                                        },
                                        children: "HAPI OPERATING PHILOSOPHY"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 40,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            margin: 0,
                                            fontSize: '36px',
                                            fontWeight: 900,
                                            color: 'white',
                                            textShadow: '0 0 22px rgba(34,211,238,0.3)',
                                            letterSpacing: '2px'
                                        },
                                        children: "ELASTIC SACRIFICE"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 41,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                lineNumber: 39,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setOpen(false),
                                style: {
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    transition: 'all 0.2s'
                                },
                                children: "닫기"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'relative',
                            padding: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(103,232,249,0.15)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    marginBottom: '20px'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        margin: 0,
                                        color: 'rgba(255,255,255,0.85)',
                                        fontSize: '15px',
                                        lineHeight: '1.8'
                                    },
                                    children: [
                                        "HAPI는 맹목적인 투기를 권하지 않는다. 우리는 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#cffafe',
                                                fontWeight: 'bold'
                                            },
                                            children: "버틸 것"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                            lineNumber: 50,
                                            columnNumber: 43
                                        }, this),
                                        "과 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#f5d0fe',
                                                fontWeight: 'bold'
                                            },
                                            children: "비울 것"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                            lineNumber: 50,
                                            columnNumber: 111
                                        }, this),
                                        "을 계산하고, 현재의 자산을 다음 포지션으로 이동시키는 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#6ee7b7',
                                                fontWeight: 'bold'
                                            },
                                            children: "합리적 갈아타기"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                            lineNumber: 50,
                                            columnNumber: 208
                                        }, this),
                                        "를 설계한다. KOAPTIX는 그 순간을 읽는 콘솔이다."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                    lineNumber: 49,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                lineNumber: 48,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px',
                                    marginBottom: '20px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '16px',
                                            padding: '20px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'rgba(103,232,249,0.7)',
                                                    fontSize: '12px',
                                                    letterSpacing: '2px',
                                                    fontWeight: 'bold'
                                                },
                                                children: "HOLD"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 56,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '15px'
                                                },
                                                children: "버틸 가치를 식별한다"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 57,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: 0,
                                                    color: 'rgba(255,255,255,0.5)',
                                                    fontSize: '13px',
                                                    lineHeight: '1.6'
                                                },
                                                children: "단지의 체급, 위치, 시총 내구성을 먼저 본다."
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 58,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 55,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '16px',
                                            padding: '20px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'rgba(240,171,252,0.7)',
                                                    fontSize: '12px',
                                                    letterSpacing: '2px',
                                                    fontWeight: 'bold'
                                                },
                                                children: "RELEASE"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 61,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '15px'
                                                },
                                                children: "과잉 집착을 비운다"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 62,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: 0,
                                                    color: 'rgba(255,255,255,0.5)',
                                                    fontSize: '13px',
                                                    lineHeight: '1.6'
                                                },
                                                children: "감정이 아니라 데이터로 희생의 강도를 조절한다."
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 63,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 60,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '16px',
                                            padding: '20px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'rgba(110,231,183,0.7)',
                                                    fontSize: '12px',
                                                    letterSpacing: '2px',
                                                    fontWeight: 'bold'
                                                },
                                                children: "ROTATE"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 66,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '15px'
                                                },
                                                children: "더 강한 흐름으로 탄다"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 67,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    margin: 0,
                                                    color: 'rgba(255,255,255,0.5)',
                                                    fontSize: '13px',
                                                    lineHeight: '1.6'
                                                },
                                                children: "KOAPTIX는 그 방향성과 타이밍을 시각화한다."
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 68,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 65,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    backgroundColor: 'rgba(103,232,249,0.05)',
                                    border: '1px dashed rgba(103,232,249,0.2)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            margin: '0 0 8px 0',
                                            color: 'rgba(103,232,249,0.7)',
                                            fontSize: '12px',
                                            letterSpacing: '2px',
                                            fontWeight: 'bold'
                                        },
                                        children: "HAPI SIGNAL"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 73,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            margin: 0,
                                            color: 'rgba(255,255,255,0.75)',
                                            fontSize: '14px',
                                            lineHeight: '1.8'
                                        },
                                        children: [
                                            "“좋은 투자”가 아니라, ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#cffafe',
                                                    fontWeight: 'bold'
                                                },
                                                children: "더 높은 확률의 이동"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                                lineNumber: 75,
                                                columnNumber: 29
                                            }, this),
                                            "을 선택한다. 지금의 집을 지키는 것조차 하나의 포지션이고, 갈아타는 결단 역시 하나의 전략이다."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                        lineNumber: 74,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>setOpen(true),
                className: "inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex h-5 w-5 items-center justify-center rounded-full border border-cyan-300/25 bg-black/30 text-[11px] font-semibold text-cyan-100",
                        children: "?"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    "ABOUT HAPI"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/HapiPhilosophyTrigger.tsx",
                lineNumber: 85,
                columnNumber: 7
            }, this),
            open && mounted ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(modalContent, document.body) : null
        ]
    }, void 0, true);
}
_s(HapiPhilosophyTrigger, "VlaysusojikZx3po79dU20nMR2o=");
_c = HapiPhilosophyTrigger;
var _c;
__turbopack_context__.k.register(_c, "HapiPhilosophyTrigger");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/MarketChartCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketChartCard",
    ()=>MarketChartCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Area.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/AreaChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
"use client";
;
;
const formatNumber = (value)=>new Intl.NumberFormat("ko-KR").format(value);
function MarketChartCard({ title, valueLabel, changePct, data }) {
    const isUp = changePct >= 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "min-w-0 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 lg:px-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "min-w-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs",
                                    children: "INDEX CHART"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 40,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl",
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 43,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/MarketChartCard.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-end gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xl font-semibold tabular-nums sm:text-2xl lg:text-3xl",
                                    children: valueLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 49,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: `pb-1 text-sm font-medium tabular-nums sm:text-base ${isUp ? "text-emerald-400" : "text-rose-400"}`,
                                    children: [
                                        isUp ? "+" : "",
                                        changePct.toFixed(2),
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 52,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/MarketChartCard.tsx",
                            lineNumber: 48,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/MarketChartCard.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-2 pb-2 pt-3 sm:px-3 sm:pb-3 lg:px-4 lg:pb-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        width: '100%',
                        height: '300px',
                        minHeight: '300px',
                        position: 'relative'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                        width: "100%",
                        height: "100%",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AreaChart"], {
                            data: data,
                            margin: {
                                top: 8,
                                right: 8,
                                left: -20,
                                bottom: 0
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                        id: "koaptixArea",
                                        x1: "0",
                                        y1: "0",
                                        x2: "0",
                                        y2: "1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                offset: "5%",
                                                stopColor: "#22d3ee",
                                                stopOpacity: 0.35
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                                lineNumber: 71,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                offset: "95%",
                                                stopColor: "#22d3ee",
                                                stopOpacity: 0
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                                lineNumber: 72,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                        lineNumber: 70,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 69,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                    vertical: false,
                                    stroke: "rgba(255,255,255,0.08)",
                                    strokeDasharray: "3 3"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 76,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                    dataKey: "label",
                                    axisLine: false,
                                    tickLine: false,
                                    tickMargin: 10,
                                    minTickGap: 24,
                                    interval: "preserveStartEnd",
                                    tick: {
                                        fill: "#94a3b8",
                                        fontSize: 11
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 82,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    width: 48,
                                    axisLine: false,
                                    tickLine: false,
                                    tick: {
                                        fill: "#94a3b8",
                                        fontSize: 11
                                    },
                                    tickFormatter: (value)=>formatNumber(Number(value))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 92,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                    cursor: {
                                        stroke: "rgba(34,211,238,0.25)",
                                        strokeWidth: 1
                                    },
                                    contentStyle: {
                                        background: "#081018",
                                        border: "1px solid rgba(34,211,238,0.15)",
                                        borderRadius: 16
                                    },
                                    labelStyle: {
                                        color: "#cbd5e1"
                                    },
                                    formatter: (value)=>formatNumber(Number(value))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 100,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Area"], {
                                    type: "monotone",
                                    dataKey: "value",
                                    stroke: "#22d3ee",
                                    strokeWidth: 2,
                                    fill: "url(#koaptixArea)",
                                    activeDot: {
                                        r: 4
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                                    lineNumber: 111,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/MarketChartCard.tsx",
                            lineNumber: 68,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/MarketChartCard.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/home/MarketChartCard.tsx",
                    lineNumber: 66,
                    columnNumber: 8
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/MarketChartCard.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/MarketChartCard.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c = MarketChartCard;
var _c;
__turbopack_context__.k.register(_c, "MarketChartCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/MarketHeatmap.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketHeatmap",
    ()=>MarketHeatmap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function formatMarketCapKrw(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}조원`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}억원`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function formatSignedDelta(value) {
    const abs = Math.abs(value);
    const display = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);
    if (value > 0) return `▲ +${display}`;
    if (value < 0) return `▼ -${display}`;
    return "— 0";
}
function getSpanClass(sharePct) {
    if (sharePct >= 24) return "lg:col-span-6";
    if (sharePct >= 17) return "lg:col-span-5";
    if (sharePct >= 9) return "lg:col-span-4";
    return "lg:col-span-3";
}
function getTone(delta) {
    if (delta >= 1) {
        return {
            card: "border-cyan-300/25 bg-cyan-300/[0.10]",
            pill: "border-cyan-300/25 bg-cyan-300/12 text-cyan-100",
            delta: "text-cyan-100",
            bar: "bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.45)]",
            hover: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_28px_rgba(34,211,238,0.18)] hover:border-cyan-300/40"
        };
    }
    if (delta > 0) {
        return {
            card: "border-emerald-300/18 bg-emerald-300/[0.09]",
            pill: "border-emerald-300/20 bg-emerald-300/12 text-emerald-100",
            delta: "text-emerald-100",
            bar: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.35)]",
            hover: "hover:shadow-[0_0_0_1px_rgba(110,231,183,0.18),0_0_24px_rgba(110,231,183,0.14)] hover:border-emerald-300/30"
        };
    }
    if (delta <= -1) {
        return {
            card: "border-fuchsia-400/22 bg-fuchsia-400/[0.10]",
            pill: "border-fuchsia-400/22 bg-fuchsia-400/12 text-fuchsia-100",
            delta: "text-fuchsia-100",
            bar: "bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.35)]",
            hover: "hover:shadow-[0_0_0_1px_rgba(232,121,249,0.22),0_0_28px_rgba(232,121,249,0.18)] hover:border-fuchsia-400/38"
        };
    }
    if (delta < 0) {
        return {
            card: "border-rose-400/18 bg-rose-400/[0.09]",
            pill: "border-rose-400/18 bg-rose-400/12 text-rose-100",
            delta: "text-rose-100",
            bar: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.35)]",
            hover: "hover:shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_24px_rgba(251,113,133,0.14)] hover:border-rose-400/30"
        };
    }
    return {
        card: "border-white/8 bg-white/[0.03]",
        pill: "border-white/10 bg-white/[0.04] text-white/65",
        delta: "text-white/75",
        bar: "bg-white/25",
        hover: "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_22px_rgba(103,232,249,0.08)] hover:border-cyan-300/16"
    };
}
function buildDistrictBuckets(items) {
    const grouped = new Map();
    for (const item of items){
        const districtName = item.sigunguName?.trim() || "기타";
        const current = grouped.get(districtName) ?? {
            name: districtName,
            totalMarketCap: 0,
            totalDelta: 0,
            itemCount: 0,
            leadItemName: item.name,
            leadItemDelta: item.rankDelta7d
        };
        current.totalMarketCap += item.marketCapKrw;
        current.totalDelta += item.rankDelta7d;
        current.itemCount += 1;
        if (Math.abs(item.rankDelta7d) > Math.abs(current.leadItemDelta)) {
            current.leadItemName = item.name;
            current.leadItemDelta = item.rankDelta7d;
        }
        grouped.set(districtName, current);
    }
    const totalMarketCap = Array.from(grouped.values()).reduce((sum, bucket)=>sum + bucket.totalMarketCap, 0);
    return Array.from(grouped.values()).map((bucket)=>{
        const averageDelta = bucket.itemCount > 0 ? bucket.totalDelta / bucket.itemCount : 0;
        const sharePct = totalMarketCap > 0 ? bucket.totalMarketCap / totalMarketCap * 100 : 0;
        return {
            name: bucket.name,
            totalMarketCap: bucket.totalMarketCap,
            averageDelta,
            totalDelta: bucket.totalDelta,
            itemCount: bucket.itemCount,
            sharePct,
            leadSignal: `${bucket.leadItemName} ${formatSignedDelta(bucket.leadItemDelta)}`,
            spanClass: getSpanClass(sharePct)
        };
    }).sort((a, b)=>b.totalMarketCap - a.totalMarketCap);
}
function buildUrlWithDistrict(districtName) {
    const params = new URLSearchParams(window.location.search);
    params.set("district", districtName);
    const queryString = params.toString();
    return `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
}
function pushDistrictToUrl(districtName) {
    const nextUrl = buildUrlWithDistrict(districtName);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
        window.history.pushState(null, "", nextUrl);
    }
}
function handleDistrictKeyDown(event, districtName) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pushDistrictToUrl(districtName);
    }
}
function MarketHeatmap({ items }) {
    const buckets = buildDistrictBuckets(items);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "min-w-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs",
                                    children: "DISTRICT HEATMAP"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 206,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl",
                                    children: "서울 자본 흐름 온도"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 209,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-xs text-white/45 sm:text-sm",
                                    children: "구별 시가총액 체급과 최근 7일 기준 순위 압력을 동시에 본다"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 212,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                            lineNumber: 205,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] sm:text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100",
                                    children: "Cyan = 주간 상승 우위"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 218,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-100",
                                    children: "Fuchsia = 주간 하락 압력"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 221,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/65",
                                    children: "Gray = 보합"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 224,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                            lineNumber: 217,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                    lineNumber: 204,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                lineNumber: 203,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-2 sm:p-3",
                children: buckets.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12",
                    children: buckets.map((bucket)=>{
                        const tone = getTone(bucket.averageDelta);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                            role: "button",
                            tabIndex: 0,
                            "aria-label": `${bucket.name} 필터 적용`,
                            onClick: ()=>pushDistrictToUrl(bucket.name),
                            onKeyDown: (event)=>handleDistrictKeyDown(event, bucket.name),
                            className: `col-span-1 cursor-pointer rounded-2xl border p-4 transition duration-200 outline-none ${bucket.spanClass} ${tone.card} ${tone.hover} hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-300/50`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start justify-between gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[11px] uppercase tracking-[0.22em] text-white/48",
                                                    children: bucket.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "mt-2 truncate text-lg font-semibold tracking-tight text-white sm:text-xl",
                                                    children: formatMarketCapKrw(bucket.totalMarketCap)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 252,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 248,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${tone.pill}`,
                                            children: [
                                                bucket.sharePct.toFixed(1),
                                                "%"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 257,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 247,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4 grid grid-cols-2 gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-xl border border-black/20 bg-black/20 px-3 py-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] uppercase tracking-[0.16em] text-white/40",
                                                    children: "Momentum (W)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 266,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: `mt-1 text-sm font-semibold ${tone.delta}`,
                                                    children: formatSignedDelta(bucket.averageDelta)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 269,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 265,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-xl border border-black/20 bg-black/20 px-3 py-2 text-right",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] uppercase tracking-[0.16em] text-white/40",
                                                    children: "Listings"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 275,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1 text-sm font-semibold text-white",
                                                    children: [
                                                        bucket.itemCount,
                                                        "개"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 274,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 264,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4 h-1.5 overflow-hidden rounded-full bg-black/30",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `h-full rounded-full ${tone.bar}`,
                                        style: {
                                            width: `${Math.max(10, bucket.sharePct)}%`
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                        lineNumber: 285,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 284,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex items-center justify-between gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "min-w-0 truncate text-xs text-white/55",
                                            children: [
                                                "SIGNAL // ",
                                                bucket.leadSignal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 292,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "shrink-0 text-[10px] uppercase tracking-[0.18em] text-cyan-300/70",
                                            children: "Click to filter"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                            lineNumber: 295,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                                    lineNumber: 291,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, bucket.name, true, {
                            fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                            lineNumber: 238,
                            columnNumber: 17
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                    lineNumber: 233,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55",
                    children: "현재 히트맵을 그릴 랭킹 데이터가 없다."
                }, void 0, false, {
                    fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                    lineNumber: 304,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/home/MarketHeatmap.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/MarketHeatmap.tsx",
        lineNumber: 202,
        columnNumber: 5
    }, this);
}
_c = MarketHeatmap;
var _c;
__turbopack_context__.k.register(_c, "MarketHeatmap");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/RankingCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RankingCard",
    ()=>RankingCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function formatMarketCapKrw(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return "-";
    }
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}조원`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}억원`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function formatPercent(value) {
    if (value > 0) return `+${value.toFixed(2)}%`;
    if (value < 0) return `${value.toFixed(2)}%`;
    return "0.00%";
}
function getRankDeltaTone(delta) {
    if (delta > 0) return "text-emerald-400";
    if (delta < 0) return "text-rose-400";
    return "text-white/45";
}
function getMomentumTone(value) {
    if (value > 0) return "text-cyan-200";
    if (value < 0) return "text-fuchsia-200";
    return "text-white/45";
}
function formatRankDelta(delta) {
    if (delta > 0) return `▲ +${delta}`;
    if (delta < 0) return `▼ ${delta}`;
    return "— 0";
}
function RankingCard({ item }) {
    const locationLabel = item.locationLabel || "위치 정보 없음";
    const rankDeltaTone = getRankDeltaTone(item.rankDelta7d);
    const momentumTone = getMomentumTone(item.marketCapDeltaPct7d);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/6 bg-white/[0.03] p-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-semibold text-cyan-200 tabular-nums sm:h-12 sm:w-12 sm:text-base",
                children: [
                    "#",
                    item.rank
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankingCard.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "truncate text-[15px] font-semibold tracking-tight sm:text-base",
                        children: item.name
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 truncate text-xs leading-5 text-white/45 sm:text-sm",
                        children: locationLabel
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankingCard.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-right tabular-nums",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-[11px]",
                        children: "Market Cap"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 73,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-[15px] font-semibold sm:text-base",
                        children: formatMarketCapKrw(item.marketCapKrw)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 76,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `mt-1 text-xs font-medium sm:text-sm ${rankDeltaTone}`,
                        children: [
                            "주간 순위 변동 ",
                            formatRankDelta(item.rankDelta7d)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `mt-1 text-[11px] font-medium sm:text-xs ${momentumTone}`,
                        children: [
                            "Momentum (W) ",
                            formatPercent(item.marketCapDeltaPct7d)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankingCard.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankingCard.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/RankingCard.tsx",
        lineNumber: 58,
        columnNumber: 5
    }, this);
}
_c = RankingCard;
var _c;
__turbopack_context__.k.register(_c, "RankingCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/ComplexDetailSheet.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ComplexDetailSheet",
    ()=>ComplexDetailSheet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function formatMarketCapKrw(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}조원`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}억원`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function formatSignedNumber(value) {
    if (value > 0) return `+${new Intl.NumberFormat("ko-KR").format(value)}`;
    if (value < 0) return new Intl.NumberFormat("ko-KR").format(value);
    return "0";
}
function formatPercent(value) {
    if (value > 0) return `+${value.toFixed(2)}%`;
    if (value < 0) return `${value.toFixed(2)}%`;
    return "0.00%";
}
function formatRankDelta(delta) {
    if (delta > 0) return `▲ +${delta}`;
    if (delta < 0) return `▼ ${delta}`;
    return "— 0";
}
function rankDeltaTone(delta) {
    if (delta > 0) return "text-emerald-400";
    if (delta < 0) return "text-rose-400";
    return "text-white/45";
}
function momentumTone(value) {
    if (value > 0) return "text-cyan-200";
    if (value < 0) return "text-fuchsia-200";
    return "text-white/45";
}
function formatCount(value) {
    if (value == null) return "-";
    return `${new Intl.NumberFormat("ko-KR").format(value)}개`;
}
function formatPlainNumber(value) {
    if (value == null) return "-";
    return new Intl.NumberFormat("ko-KR").format(value);
}
function formatYear(value) {
    if (value == null) return "-";
    return `${value}년`;
}
function formatUpdatedAt(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}
function Metric({ label, value, tone }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[11px] uppercase tracking-[0.18em] text-white/40 sm:text-xs",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `mt-1 text-base font-semibold tabular-nums sm:text-lg ${tone ?? ""}`,
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
_c = Metric;
function DetailRow({ label, value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-sm text-white/45",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-right text-sm font-medium text-white",
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 130,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
        lineNumber: 128,
        columnNumber: 5
    }, this);
}
_c1 = DetailRow;
function ShareIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        viewBox: "0 0 24 24",
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7"
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 147,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12 3v12"
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 148,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "m8 7 4-4 4 4"
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 149,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
        lineNumber: 137,
        columnNumber: 5
    }, this);
}
_c2 = ShareIcon;
function ComplexDetailSheet({ open, item, detail, loading, error, onClose }) {
    _s();
    const [sharePending, setSharePending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const toastTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ComplexDetailSheet.useEffect": ()=>{
            if (!open) return;
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            const onKeyDown = {
                "ComplexDetailSheet.useEffect.onKeyDown": (event)=>{
                    if (event.key === "Escape") {
                        onClose();
                    }
                }
            }["ComplexDetailSheet.useEffect.onKeyDown"];
            window.addEventListener("keydown", onKeyDown);
            return ({
                "ComplexDetailSheet.useEffect": ()=>{
                    document.body.style.overflow = prevOverflow;
                    window.removeEventListener("keydown", onKeyDown);
                }
            })["ComplexDetailSheet.useEffect"];
        }
    }["ComplexDetailSheet.useEffect"], [
        open,
        onClose
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ComplexDetailSheet.useEffect": ()=>{
            return ({
                "ComplexDetailSheet.useEffect": ()=>{
                    if (toastTimerRef.current) {
                        clearTimeout(toastTimerRef.current);
                    }
                }
            })["ComplexDetailSheet.useEffect"];
        }
    }["ComplexDetailSheet.useEffect"], []);
    function showToast(message, tone) {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({
            message,
            tone
        });
        toastTimerRef.current = setTimeout(()=>{
            setToast(null);
        }, 2200);
    }
    async function handleShare() {
        if (!item || ("TURBOPACK compile-time value", "object") === "undefined") return;
        const shareTitle = detail?.name ?? item.name;
        const shareUrl = window.location.href;
        if (!shareUrl) {
            showToast("공유 링크를 만들지 못했다.", "error");
            return;
        }
        setSharePending(true);
        try {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                try {
                    await navigator.share({
                        title: shareTitle,
                        url: shareUrl
                    });
                    return;
                } catch (shareError) {
                    if (shareError instanceof DOMException && shareError.name === "AbortError") {
                        return;
                    }
                }
            }
            if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                await navigator.clipboard.writeText(shareUrl);
                showToast("링크가 복사되었습니다!", "success");
                return;
            }
            showToast("이 브라우저에서는 링크 공유를 지원하지 않는다.", "error");
        } catch  {
            showToast("링크를 복사하지 못했다. 다시 시도해라.", "error");
        } finally{
            setSharePending(false);
        }
    }
    if (!open || !item) return null;
    const title = detail?.name ?? item.name;
    const location = (detail?.locationLabel ?? item.locationLabel) || "위치 정보 없음";
    const rank = detail?.rank ?? item.rank;
    const marketCap = detail?.marketCapKrw ?? item.marketCapKrw;
    const rankDelta7d = detail?.rankDelta7d ?? item.rankDelta7d;
    const marketCapDelta7d = detail?.marketCapDelta7d ?? item.marketCapDelta7d;
    const marketCapDeltaPct7d = detail?.marketCapDeltaPct7d ?? item.marketCapDeltaPct7d;
    const historySnapshotDate = detail?.historySnapshotDate ?? item.historySnapshotDate;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
                        onClick: onClose
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                        lineNumber: 267,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-labelledby": "complex-detail-title",
                        className: "absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-3xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_-10px_50px_rgba(0,0,0,0.45)] md:left-1/2 md:top-1/2 md:bottom-auto md:w-[640px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-b border-white/5 bg-[#0b1118]/95 px-4 pb-4 pt-3 backdrop-blur md:px-5 md:pt-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 md:hidden"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                        lineNumber: 279,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-start justify-between gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "min-w-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs",
                                                        children: "COMPLEX DETAIL"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        id: "complex-detail-title",
                                                        className: "mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl",
                                                        children: title
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                        lineNumber: 286,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mt-1 truncate text-sm text-white/50 sm:text-[15px]",
                                                        children: location
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                        lineNumber: 292,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 282,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex shrink-0 items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>void handleShare(),
                                                        disabled: sharePending,
                                                        className: "inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60",
                                                        "aria-label": "공유하기",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ShareIcon, {}, void 0, false, {
                                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                                lineNumber: 305,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: sharePending ? "공유 중..." : "공유하기"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                                lineNumber: 306,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                        lineNumber: 298,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: onClose,
                                                        className: "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]",
                                                        children: "닫기"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                        lineNumber: 309,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 297,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                        lineNumber: 281,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                lineNumber: 278,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "max-h-[calc(85vh-100px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5",
                                children: [
                                    error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200",
                                        children: error
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                        lineNumber: 322,
                                        columnNumber: 15
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-2 sm:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Metric, {
                                                label: "현재 순위",
                                                value: `#${formatPlainNumber(rank)}`
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 328,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Metric, {
                                                label: "시가총액",
                                                value: formatMarketCapKrw(marketCap)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 329,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Metric, {
                                                label: "주간 순위 변동",
                                                value: formatRankDelta(rankDelta7d),
                                                tone: rankDeltaTone(rankDelta7d)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 330,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Metric, {
                                                label: "Momentum (W)",
                                                value: formatPercent(marketCapDeltaPct7d),
                                                tone: momentumTone(marketCapDeltaPct7d)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                lineNumber: 335,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                        lineNumber: 327,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2",
                                        children: loading && !detail ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3 py-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-4 w-24 animate-pulse rounded bg-white/10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 345,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-4 w-full animate-pulse rounded bg-white/10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 346,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-4 w-4/5 animate-pulse rounded bg-white/10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 347,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-4 w-3/5 animate-pulse rounded bg-white/10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 348,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                            lineNumber: 344,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "최근 7일 시총 변동",
                                                    value: `${formatSignedNumber(marketCapDelta7d)}원`
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 352,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "비교 기준 스냅샷",
                                                    value: historySnapshotDate ?? "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 356,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "세대수",
                                                    value: formatCount(detail?.householdCount)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 360,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "준공연도",
                                                    value: formatYear(detail?.approvalYear)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 364,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "연식",
                                                    value: detail?.ageYears != null ? `${detail.ageYears}년차` : "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 368,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "동 수",
                                                    value: formatCount(detail?.buildingCount)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 374,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "주차대수",
                                                    value: formatCount(detail?.parkingCount)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 378,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DetailRow, {
                                                    label: "데이터 기준일",
                                                    value: formatUpdatedAt(detail?.updatedAt)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                                    lineNumber: 382,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                        lineNumber: 342,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                                lineNumber: 320,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                        lineNumber: 272,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 266,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-live": "polite",
                "aria-atomic": "true",
                className: "pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4",
                children: toast ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: `rounded-full border px-4 py-2 text-sm font-medium shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur ${toast.tone === "success" ? "border-emerald-400/20 bg-emerald-400/12 text-emerald-100" : "border-rose-400/20 bg-rose-400/12 text-rose-100"}`,
                    children: toast.message
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                    lineNumber: 399,
                    columnNumber: 11
                }, this) : null
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComplexDetailSheet.tsx",
                lineNumber: 393,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(ComplexDetailSheet, "RLm/2gs3QCxt2Gr+G+O5lc03azM=");
_c3 = ComplexDetailSheet;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "Metric");
__turbopack_context__.k.register(_c1, "DetailRow");
__turbopack_context__.k.register(_c2, "ShareIcon");
__turbopack_context__.k.register(_c3, "ComplexDetailSheet");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/ComparisonSheet.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ComparisonSheet",
    ()=>ComparisonSheet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function ComparisonSheet({ open, items, onClose, onClear }) {
    _s();
    const [details, setDetails] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const abortRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ComparisonSheet.useEffect": ()=>{
            if (!open || items.length !== 2) return;
            // 배경 스크롤 방지
            document.body.style.overflow = "hidden";
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            Promise.all(items.map({
                "ComparisonSheet.useEffect": (item)=>fetch(`/api/complex-detail?complexId=${item.complexId}`, {
                        signal: controller.signal
                    }).then({
                        "ComparisonSheet.useEffect": (res)=>res.json()
                    }["ComparisonSheet.useEffect"]).then({
                        "ComparisonSheet.useEffect": (data)=>({
                                id: item.complexId,
                                detail: data.data
                            })
                    }["ComparisonSheet.useEffect"])
            }["ComparisonSheet.useEffect"])).then({
                "ComparisonSheet.useEffect": (results)=>{
                    const newDetails = {};
                    results.forEach({
                        "ComparisonSheet.useEffect": (r)=>{
                            if (r.detail) newDetails[r.id] = r.detail;
                        }
                    }["ComparisonSheet.useEffect"]);
                    setDetails(newDetails);
                    setLoading(false);
                }
            }["ComparisonSheet.useEffect"]).catch({
                "ComparisonSheet.useEffect": (e)=>{
                    if (e.name !== 'AbortError') setLoading(false);
                }
            }["ComparisonSheet.useEffect"]);
            return ({
                "ComparisonSheet.useEffect": ()=>{
                    document.body.style.overflow = "";
                    controller.abort();
                }
            })["ComparisonSheet.useEffect"];
        }
    }["ComparisonSheet.useEffect"], [
        open,
        items
    ]);
    if (!open) return null;
    const leftItem = items[0];
    const rightItem = items[1];
    const leftDetail = leftItem ? details[leftItem.complexId] : null;
    const rightDetail = rightItem ? details[rightItem.complexId] : null;
    const getVal = (item, detail, key)=>detail?.[key] ?? item?.[key] ?? null;
    const leftRank = getVal(leftItem, leftDetail, 'rank');
    const rightRank = getVal(rightItem, rightDetail, 'rank');
    const leftCap = getVal(leftItem, leftDetail, 'marketCapKrw');
    const rightCap = getVal(rightItem, rightDetail, 'marketCapKrw');
    const leftHouse = getVal(leftItem, leftDetail, 'householdCount');
    const rightHouse = getVal(rightItem, rightDetail, 'householdCount');
    const leftYear = getVal(leftItem, leftDetail, 'approvalYear');
    const rightYear = getVal(rightItem, rightDetail, 'approvalYear');
    const leftPark = getVal(leftItem, leftDetail, 'parkingCount');
    const rightPark = getVal(rightItem, rightDetail, 'parkingCount');
    const formatNum = (val, suffix = '')=>val ? `${new Intl.NumberFormat('ko-KR').format(val)}${suffix}` : '-';
    const formatCap = (val)=>{
        if (!val) return '-';
        if (val >= 1000000000000) return `${(val / 1000000000000).toFixed(1)}조원`;
        return `${(val / 100000000).toFixed(0)}억원`;
    };
    // 💡 대결 표(Row) 렌더링 함수
    const Row = ({ label, lVal, rVal, lWin, rWin })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '12px 0'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        flex: 1,
                        textAlign: 'center',
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: lWin ? 'rgba(34,211,238,0.1)' : 'transparent',
                        color: lWin ? '#67e8f9' : 'white',
                        fontWeight: 'bold',
                        border: lWin ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent'
                    },
                    children: lVal
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                    lineNumber: 73,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        width: '80px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#94a3b8'
                    },
                    children: label
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                    lineNumber: 76,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        flex: 1,
                        textAlign: 'center',
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: rWin ? 'rgba(34,211,238,0.1)' : 'transparent',
                        color: rWin ? '#67e8f9' : 'white',
                        fontWeight: 'bold',
                        border: rWin ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent'
                    },
                    children: rVal
                }, void 0, false, {
                    fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                    lineNumber: 77,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/home/ComparisonSheet.tsx",
            lineNumber: 72,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                },
                onClick: onClose
            }, void 0, false, {
                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                lineNumber: 85,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                style: {
                    position: 'relative',
                    width: '100%',
                    maxWidth: '800px',
                    backgroundColor: '#0b1118',
                    borderRadius: '24px',
                    border: '1px solid #22d3ee',
                    padding: '24px',
                    color: 'white',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '16px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            color: '#67e8f9',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            letterSpacing: '1px',
                                            margin: '0 0 8px 0'
                                        },
                                        children: "VS COMPARISON"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 90,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            margin: 0
                                        },
                                        children: "단지 스펙 비교"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 91,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    gap: '8px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: onClear,
                                        style: {
                                            padding: '8px 16px',
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer'
                                        },
                                        children: "초기화"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 94,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: onClose,
                                        style: {
                                            padding: '8px 16px',
                                            backgroundColor: 'rgba(34,211,238,0.2)',
                                            borderRadius: '8px',
                                            color: '#cffafe',
                                            border: 'none',
                                            cursor: 'pointer'
                                        },
                                        children: "닫기"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 95,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 93,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            padding: '40px',
                            color: '#22d3ee',
                            fontWeight: 'bold'
                        },
                        children: "데이터를 불러오는 중입니다..."
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                        lineNumber: 100,
                        columnNumber: 11
                    }, this) : items.length === 2 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    paddingBottom: '16px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            textAlign: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    marginBottom: '8px'
                                                },
                                                children: "A 단지"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 107,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '20px',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                },
                                                children: leftItem.name
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 108,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '13px',
                                                    color: '#94a3b8',
                                                    marginTop: '4px'
                                                },
                                                children: leftItem.locationLabel
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 109,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 106,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            width: '80px',
                                            textAlign: 'center',
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            color: '#475569',
                                            fontStyle: 'italic'
                                        },
                                        children: "VS"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 111,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            textAlign: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    marginBottom: '8px'
                                                },
                                                children: "B 단지"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 113,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '20px',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                },
                                                children: rightItem.name
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 114,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '13px',
                                                    color: '#94a3b8',
                                                    marginTop: '4px'
                                                },
                                                children: rightItem.locationLabel
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                                lineNumber: 115,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                        lineNumber: 112,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 105,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                label: "현재 순위",
                                lVal: formatNum(leftRank, '위'),
                                rVal: formatNum(rightRank, '위'),
                                lWin: leftRank && rightRank && leftRank < rightRank,
                                rWin: leftRank && rightRank && rightRank < leftRank
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 120,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                label: "시가총액",
                                lVal: formatCap(leftCap),
                                rVal: formatCap(rightCap),
                                lWin: leftCap && rightCap && leftCap > rightCap,
                                rWin: leftCap && rightCap && rightCap > leftCap
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 121,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                label: "세대수",
                                lVal: formatNum(leftHouse, '세대'),
                                rVal: formatNum(rightHouse, '세대'),
                                lWin: leftHouse && rightHouse && leftHouse > rightHouse,
                                rWin: leftHouse && rightHouse && rightHouse > leftHouse
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 122,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                label: "준공연도",
                                lVal: formatNum(leftYear, '년'),
                                rVal: formatNum(rightYear, '년'),
                                lWin: leftYear && rightYear && leftYear > rightYear,
                                rWin: leftYear && rightYear && rightYear > leftYear
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 123,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                label: "주차대수",
                                lVal: formatNum(leftPark, '대'),
                                rVal: formatNum(rightPark, '대'),
                                lWin: leftPark && rightPark && leftPark > rightPark,
                                rWin: leftPark && rightPark && rightPark > leftPark
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                                lineNumber: 124,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                        lineNumber: 102,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/ComparisonSheet.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/ComparisonSheet.tsx",
        lineNumber: 84,
        columnNumber: 5
    }, this);
}
_s(ComparisonSheet, "K1UprigyXkMltGzHbc5F4iFqCOc=");
_c = ComparisonSheet;
var _c;
__turbopack_context__.k.register(_c, "ComparisonSheet");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/RankingBoardClient.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RankingBoardClient",
    ()=>RankingBoardClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$RankingCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/RankingCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$ComplexDetailSheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/ComplexDetailSheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$ComparisonSheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/home/ComparisonSheet.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const SORT_OPTIONS = [
    {
        value: "rank_asc",
        label: "순위순"
    },
    {
        value: "market_cap_desc",
        label: "시총순"
    },
    {
        value: "delta_desc",
        label: "상승폭순"
    },
    {
        value: "name_asc",
        label: "이름순"
    }
];
function createFallbackItem(complexId) {
    return {
        complexId,
        name: "단지 정보 불러오는 중",
        rank: 0,
        marketCapKrw: 0,
        marketCapTrillionKrw: null,
        rankDelta1d: 0,
        sigunguName: "",
        legalDongName: "",
        locationLabel: "",
        searchText: complexId.toLowerCase()
    };
}
function RankingBoardClient({ items: initialItems, boardError = null }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const searchParamsKey = searchParams.toString();
    const complexIdFromUrl = searchParams.get("complexId");
    // 🚨 잼이사가 복구한 1번: 무한 스크롤을 위한 State 부활!
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialItems);
    const [loadingMore, setLoadingMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hasMore, setHasMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialItems.length >= 50);
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [sortKey, setSortKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("rank_asc");
    const [districtFilter, setDistrictFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("전체");
    const [sheetOpen, setSheetOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedItem, setSelectedItem] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [detail, setDetail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [detailLoading, setDetailLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [detailError, setDetailError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // 비교 기능 State
    const [selectedCompareIds, setSelectedCompareIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [comparisonSheetOpen, setComparisonSheetOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [compareToast, setCompareToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const compareToastTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const abortRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RankingBoardClient.useEffect": ()=>{
            return ({
                "RankingBoardClient.useEffect": ()=>{
                    abortRef.current?.abort();
                    if (compareToastTimerRef.current) clearTimeout(compareToastTimerRef.current);
                }
            })["RankingBoardClient.useEffect"];
        }
    }["RankingBoardClient.useEffect"], []);
    const uniqueDistricts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RankingBoardClient.useMemo[uniqueDistricts]": ()=>{
            const districts = new Set();
            items.forEach({
                "RankingBoardClient.useMemo[uniqueDistricts]": (item)=>{
                    const gu = item.locationLabel?.split(' ')[0];
                    if (gu && gu.endsWith('구')) districts.add(gu);
                }
            }["RankingBoardClient.useMemo[uniqueDistricts]"]);
            return [
                "전체",
                ...Array.from(districts).sort()
            ];
        }
    }["RankingBoardClient.useMemo[uniqueDistricts]"], [
        items
    ]);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RankingBoardClient.useMemo[filteredItems]": ()=>{
            const searched = items.filter({
                "RankingBoardClient.useMemo[filteredItems].searched": (item)=>{
                    if (normalizedQuery && !item.searchText.includes(normalizedQuery)) return false;
                    if (districtFilter !== "전체" && !item.locationLabel.startsWith(districtFilter)) return false;
                    return true;
                }
            }["RankingBoardClient.useMemo[filteredItems].searched"]);
            return [
                ...searched
            ].sort({
                "RankingBoardClient.useMemo[filteredItems]": (a, b)=>{
                    switch(sortKey){
                        case "market_cap_desc":
                            return b.marketCapKrw - a.marketCapKrw;
                        case "delta_desc":
                            return b.rankDelta1d - a.rankDelta1d;
                        case "name_asc":
                            return a.name.localeCompare(b.name, "ko");
                        case "rank_asc":
                        default:
                            return a.rank - b.rank;
                    }
                }
            }["RankingBoardClient.useMemo[filteredItems]"]);
        }
    }["RankingBoardClient.useMemo[filteredItems]"], [
        items,
        normalizedQuery,
        districtFilter,
        sortKey
    ]);
    const selectedCompareItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RankingBoardClient.useMemo[selectedCompareItems]": ()=>selectedCompareIds.map({
                "RankingBoardClient.useMemo[selectedCompareItems]": (id)=>items.find({
                        "RankingBoardClient.useMemo[selectedCompareItems]": (item)=>item.complexId === id
                    }["RankingBoardClient.useMemo[selectedCompareItems]"])
            }["RankingBoardClient.useMemo[selectedCompareItems]"]).filter({
                "RankingBoardClient.useMemo[selectedCompareItems]": (item)=>Boolean(item)
            }["RankingBoardClient.useMemo[selectedCompareItems]"])
    }["RankingBoardClient.useMemo[selectedCompareItems]"], [
        items,
        selectedCompareIds
    ]);
    // 🚨 잼이사가 복구한 2번: 더보기(Load More) 데이터 요청 함수 부활!
    async function loadMore() {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const response = await fetch(`/api/rankings?offset=${items.length}&limit=50`);
            const payload = await response.json();
            if (payload.data && payload.data.length > 0) {
                setItems((prev)=>[
                        ...prev,
                        ...payload.data
                    ]);
                if (payload.data.length < 50) setHasMore(false);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("더보기 로딩 실패:", error);
        } finally{
            setLoadingMore(false);
        }
    }
    const buildUrlWithComplexId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[buildUrlWithComplexId]": (complexId)=>{
            const nextParams = new URLSearchParams(searchParamsKey);
            nextParams.set("complexId", complexId);
            return nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        }
    }["RankingBoardClient.useCallback[buildUrlWithComplexId]"], [
        pathname,
        searchParamsKey
    ]);
    const buildUrlWithoutComplexId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[buildUrlWithoutComplexId]": ()=>{
            const nextParams = new URLSearchParams(searchParamsKey);
            nextParams.delete("complexId");
            return nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        }
    }["RankingBoardClient.useCallback[buildUrlWithoutComplexId]"], [
        pathname,
        searchParamsKey
    ]);
    const requestDetail = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[requestDetail]": async (complexId)=>{
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            const response = await fetch(`/api/complex-detail?complexId=${encodeURIComponent(complexId)}`, {
                method: "GET",
                signal: controller.signal,
                cache: "no-store"
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error ?? "상세 정보를 불러오지 못했다.");
            return payload.data;
        }
    }["RankingBoardClient.useCallback[requestDetail]"], []);
    const openDetailByItem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[openDetailByItem]": async (item, options = {})=>{
            const { syncUrl = true } = options;
            if (sheetOpen && selectedItem?.complexId === item.complexId) return;
            setSelectedItem(item);
            setDetail(null);
            setDetailError(null);
            setDetailLoading(true);
            setSheetOpen(true);
            if (syncUrl) {
                const nextUrl = buildUrlWithComplexId(item.complexId);
                const currentUrl = `${window.location.pathname}${window.location.search}`;
                if (currentUrl !== nextUrl) window.history.pushState(null, "", nextUrl);
            }
            try {
                const nextDetail = await requestDetail(item.complexId);
                setDetail(nextDetail);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
                setDetailError(error instanceof Error ? error.message : "상세 정보를 불러오지 못했다.");
            } finally{
                setDetailLoading(false);
            }
        }
    }["RankingBoardClient.useCallback[openDetailByItem]"], [
        buildUrlWithComplexId,
        requestDetail,
        selectedItem?.complexId,
        sheetOpen
    ]);
    const openDetailByComplexId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[openDetailByComplexId]": async (complexId, options = {})=>{
            const targetItem = items.find({
                "RankingBoardClient.useCallback[openDetailByComplexId]": (item)=>item.complexId === complexId
            }["RankingBoardClient.useCallback[openDetailByComplexId]"]) ?? createFallbackItem(complexId);
            await openDetailByItem(targetItem, options);
        }
    }["RankingBoardClient.useCallback[openDetailByComplexId]"], [
        items,
        openDetailByItem
    ]);
    const closeDetail = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RankingBoardClient.useCallback[closeDetail]": (options = {})=>{
            const { syncUrl = true } = options;
            abortRef.current?.abort();
            setSheetOpen(false);
            setSelectedItem(null);
            setDetail(null);
            setDetailError(null);
            setDetailLoading(false);
            if (syncUrl) {
                const nextUrl = buildUrlWithoutComplexId();
                const currentUrl = `${window.location.pathname}${window.location.search}`;
                if (currentUrl !== nextUrl) window.history.replaceState(null, "", nextUrl);
            }
        }
    }["RankingBoardClient.useCallback[closeDetail]"], [
        buildUrlWithoutComplexId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RankingBoardClient.useEffect": ()=>{
            if (!complexIdFromUrl) {
                if (sheetOpen || selectedItem) closeDetail({
                    syncUrl: false
                });
                return;
            }
            if (sheetOpen && selectedItem?.complexId === complexIdFromUrl) return;
            void openDetailByComplexId(complexIdFromUrl, {
                syncUrl: false
            });
        }
    }["RankingBoardClient.useEffect"], [
        closeDetail,
        complexIdFromUrl,
        openDetailByComplexId,
        selectedItem,
        sheetOpen
    ]);
    function showCompareToast(message) {
        if (compareToastTimerRef.current) clearTimeout(compareToastTimerRef.current);
        setCompareToast(message);
        compareToastTimerRef.current = setTimeout(()=>setCompareToast(null), 2200);
    }
    function toggleCompareSelection(item) {
        const isSelected = selectedCompareIds.includes(item.complexId);
        if (isSelected) {
            setSelectedCompareIds((prev)=>prev.filter((id)=>id !== item.complexId));
            return;
        }
        if (selectedCompareIds.length >= 2) {
            showCompareToast("비교는 최대 2개까지만 가능합니다");
            return;
        }
        setSelectedCompareIds((prev)=>[
                ...prev,
                item.complexId
            ]);
    }
    function clearCompareSelection() {
        setSelectedCompareIds([]);
        setComparisonSheetOpen(false);
    }
    function openComparisonSheet() {
        if (selectedCompareItems.length < 2) {
            showCompareToast("비교할 단지를 2개 선택해라");
            return;
        }
        if (sheetOpen) closeDetail({
            syncUrl: true
        });
        setComparisonSheetOpen(true);
    }
    const showFloatingBar = selectedCompareItems.length > 0 && !comparisonSheetOpen;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl",
                                            children: "KOAPTIX 500 Rankings"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 232,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-xs text-white/45 sm:text-sm",
                                            children: "단지명·구·동 검색 / 클릭 시 URL 동기화 / VS 클릭 시 비교 담기"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 233,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                    lineNumber: 231,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            "data-koaptix-command-trigger": "true",
                                            value: query,
                                            onChange: (e)=>setQuery(e.target.value),
                                            placeholder: "단지명, 구, 동 검색",
                                            className: "w-full bg-transparent py-2.5 pl-3 pr-3 text-sm text-white outline-none placeholder:text-white/28"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 237,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: districtFilter,
                                            onChange: (e)=>setDistrictFilter(e.target.value),
                                            className: "h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40",
                                            children: uniqueDistricts.map((gu)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: gu,
                                                    style: {
                                                        backgroundColor: "#0b1118",
                                                        color: "#ffffff"
                                                    },
                                                    children: gu
                                                }, gu, false, {
                                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                                    lineNumber: 247,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 245,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: sortKey,
                                            onChange: (e)=>setSortKey(e.target.value),
                                            className: "h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40",
                                            children: SORT_OPTIONS.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: option.value,
                                                    style: {
                                                        backgroundColor: "#0b1118",
                                                        color: "#ffffff"
                                                    },
                                                    children: option.label
                                                }, option.value, false, {
                                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 251,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                    lineNumber: 236,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between text-xs text-white/45 sm:text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "표시 ",
                                                filteredItems.length,
                                                "개"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 259,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "전체 ",
                                                items.length,
                                                "개"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 260,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                    lineNumber: 258,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                            lineNumber: 230,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                        lineNumber: 229,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 lg:max-h-[600px]",
                        children: [
                            filteredItems.length > 0 ? filteredItems.map((item)=>{
                                const isActive = sheetOpen && selectedItem?.complexId === item.complexId;
                                const isCompared = selectedCompareIds.includes(item.complexId);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-[minmax(0,1fr)_50px] gap-2 sm:grid-cols-[minmax(0,1fr)_56px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            role: "button",
                                            tabIndex: 0,
                                            onClick: ()=>void openDetailByItem(item, {
                                                    syncUrl: true
                                                }),
                                            className: `rounded-xl outline-none transition cursor-pointer ${isActive ? "ring-2 ring-cyan-300/50" : "hover:ring-1 hover:ring-white/10"}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$RankingCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RankingCard"], {
                                                item: item
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                                lineNumber: 274,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 273,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: (e)=>{
                                                e.stopPropagation();
                                                toggleCompareSelection(item);
                                            },
                                            className: `flex h-full min-h-[108px] flex-col items-center justify-center rounded-xl border text-[10px] font-semibold tracking-[0.18em] transition sm:min-h-[116px] ${isCompared ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.05)]" : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]"}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-sm leading-none sm:text-base",
                                                    children: isCompared ? "✓" : "VS"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mt-1",
                                                    children: isCompared ? "담김" : "추가"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                            lineNumber: 277,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, item.complexId, true, {
                                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                    lineNumber: 272,
                                    columnNumber: 17
                                }, this);
                            }) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55 text-center",
                                children: "검색 결과가 없습니다."
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 285,
                                columnNumber: 13
                            }, this),
                            hasMore && !query && districtFilter === "전체" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: loadMore,
                                disabled: loadingMore,
                                className: "w-full mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50",
                                children: loadingMore ? "데이터를 불러오는 중입니다..." : "더보기 (Load More)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 290,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                lineNumber: 228,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$ComplexDetailSheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ComplexDetailSheet"], {
                open: sheetOpen,
                item: selectedItem,
                detail: detail,
                loading: detailLoading,
                error: detailError,
                onClose: ()=>closeDetail({
                        syncUrl: true
                    })
            }, void 0, false, {
                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                lineNumber: 301,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: selectedCompareItems.length > 0 && !comparisonSheetOpen ? '24px' : '-100px',
                    opacity: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 1 : 0,
                    visibility: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 'visible' : 'hidden',
                    zIndex: 99999,
                    transition: 'all 0.3s ease',
                    width: '90%',
                    maxWidth: '600px',
                    backgroundColor: 'rgba(11, 17, 24, 0.95)',
                    border: '1px solid rgba(103, 232, 249, 0.3)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    boxShadow: '0 18px 50px rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pointerEvents: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 'auto' : 'none'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    margin: 0,
                                    fontSize: '11px',
                                    color: '#67e8f9',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px'
                                },
                                children: "COMPARISON CART"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 329,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    margin: '4px 0 0 0',
                                    fontSize: '16px',
                                    color: 'white',
                                    fontWeight: 'bold'
                                },
                                children: [
                                    selectedCompareItems.length,
                                    "개 단지 선택됨"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 330,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                        lineNumber: 328,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '8px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: clearCompareSelection,
                                style: {
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                },
                                children: "초기화"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 333,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: openComparisonSheet,
                                disabled: selectedCompareItems.length < 2,
                                style: {
                                    padding: '8px 16px',
                                    backgroundColor: selectedCompareItems.length < 2 ? 'rgba(103,232,249,0.1)' : 'rgba(103,232,249,0.2)',
                                    color: selectedCompareItems.length < 2 ? 'rgba(255,255,255,0.3)' : '#cffafe',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: selectedCompareItems.length < 2 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                },
                                children: "비교하기"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                                lineNumber: 334,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                        lineNumber: 332,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-live": "polite",
                "aria-atomic": "true",
                className: "pointer-events-none fixed inset-x-0 z-[99999] flex justify-center px-4 transition-all",
                style: {
                    bottom: selectedCompareItems.length > 0 ? "100px" : "24px"
                },
                children: compareToast ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '8px 24px',
                        borderRadius: '30px',
                        border: '1px solid rgba(103, 232, 249, 0.2)',
                        backgroundColor: 'rgba(11, 17, 24, 0.95)',
                        color: '#cffafe',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
                    },
                    children: compareToast
                }, void 0, false, {
                    fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                    lineNumber: 339,
                    columnNumber: 25
                }, this) : null
            }, void 0, false, {
                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                lineNumber: 338,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$home$2f$ComparisonSheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ComparisonSheet"], {
                open: comparisonSheetOpen,
                items: selectedCompareItems,
                onClose: ()=>setComparisonSheetOpen(false),
                onClear: clearCompareSelection
            }, void 0, false, {
                fileName: "[project]/src/components/home/RankingBoardClient.tsx",
                lineNumber: 342,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(RankingBoardClient, "YwAIYYV/RbV9GgfmGgPHksWwvYw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c = RankingBoardClient;
var _c;
__turbopack_context__.k.register(_c, "RankingBoardClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/TickerTape.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TickerTape",
    ()=>TickerTape
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
const DEFAULT_ITEMS = [
    "KOAPTIX 500 LIVE",
    "자본의 흐름을 읽는 자만이 살아남는다",
    "오늘의 급등 단지: 반포자이 ▲",
    "HAPI 그룹 제공"
];
function TickerTape({ items = DEFAULT_ITEMS, className = "" }) {
    const feed = items.length > 0 ? items : DEFAULT_ITEMS;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: `relative overflow-hidden border-y border-cyan-400/10 bg-black/90 ${className}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: `
        @keyframes tickerTapeAnim {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerTapeAnim 38s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        .ticker-group {
          display: flex;
          flex-shrink: 0;
          align-items: center;
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-right: 1.75rem;
          margin-right: 1.75rem;
          border-right: 1px solid rgba(103, 232, 249, 0.14);
          white-space: nowrap;
        }
        .ticker-dot {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 9999px;
          background: #6ee7b7;
          box-shadow: 0 0 14px rgba(110, 231, 183, 0.95);
          flex-shrink: 0;
        }
      `
            }, void 0, false, {
                fileName: "[project]/src/components/home/TickerTape.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#05070b] to-transparent sm:w-16"
            }, void 0, false, {
                fileName: "[project]/src/components/home/TickerTape.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#05070b] to-transparent sm:w-16"
            }, void 0, false, {
                fileName: "[project]/src/components/home/TickerTape.tsx",
                lineNumber: 65,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto flex w-full max-w-[1440px] items-center gap-3 px-3 py-2 sm:px-4 lg:px-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 sm:text-[11px]",
                        children: "LIVE FEED"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TickerTape.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex-1 overflow-hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "ticker-track",
                            children: [
                                0,
                                1
                            ].map((copy)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "ticker-group",
                                    "aria-hidden": copy === 1,
                                    children: feed.map((message, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "ticker-item",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ticker-dot"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/TickerTape.tsx",
                                                    lineNumber: 85,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100 sm:text-xs md:text-sm [text-shadow:0_0_12px_rgba(34,211,238,0.35)]",
                                                    children: message
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/TickerTape.tsx",
                                                    lineNumber: 86,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, `${copy}-${index}-${message}`, true, {
                                            fileName: "[project]/src/components/home/TickerTape.tsx",
                                            lineNumber: 81,
                                            columnNumber: 19
                                        }, this))
                                }, copy, false, {
                                    fileName: "[project]/src/components/home/TickerTape.tsx",
                                    lineNumber: 75,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/home/TickerTape.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TickerTape.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TickerTape.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/TickerTape.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = TickerTape;
var _c;
__turbopack_context__.k.register(_c, "TickerTape");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/TopMovers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TopMovers",
    ()=>TopMovers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function formatMarketCapKrw(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}조원`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}억원`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function formatRankDelta(value) {
    if (value > 0) return `▲ +${value}`;
    if (value < 0) return `▼ ${value}`;
    return "— 0";
}
function buildHotMovers(items) {
    return [
        ...items
    ].filter((item)=>item.rankDelta7d > 0).sort((a, b)=>{
        if (b.rankDelta7d !== a.rankDelta7d) return b.rankDelta7d - a.rankDelta7d;
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.marketCapKrw - a.marketCapKrw;
    }).slice(0, 3);
}
function buildColdDrops(items) {
    return [
        ...items
    ].filter((item)=>item.rankDelta7d < 0).sort((a, b)=>{
        if (a.rankDelta7d !== b.rankDelta7d) return a.rankDelta7d - b.rankDelta7d;
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.marketCapKrw - a.marketCapKrw;
    }).slice(0, 3);
}
function buildUrlWithComplexId(complexId) {
    const params = new URLSearchParams(window.location.search);
    params.set("complexId", complexId);
    const queryString = params.toString();
    return `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
}
function pushComplexIdToUrl(complexId) {
    const nextUrl = buildUrlWithComplexId(complexId);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
        window.history.pushState(null, "", nextUrl);
    }
}
function handleMoverKeyDown(event, complexId) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pushComplexIdToUrl(complexId);
    }
}
function MoverRow({ item, tone, index }) {
    const isHot = tone === "hot";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        role: "button",
        tabIndex: 0,
        "aria-label": `${item.name} 상세 보기`,
        onClick: ()=>pushComplexIdToUrl(item.complexId),
        onKeyDown: (event)=>handleMoverKeyDown(event, item.complexId),
        className: `cursor-pointer rounded-2xl border p-3 transition duration-200 outline-none sm:p-4 ${isHot ? "border-cyan-300/18 bg-cyan-300/[0.08] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_24px_rgba(34,211,238,0.16)] hover:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/50" : "border-fuchsia-400/18 bg-fuchsia-400/[0.08] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(232,121,249,0.18),0_0_24px_rgba(232,121,249,0.16)] hover:border-fuchsia-400/35 focus-visible:ring-2 focus-visible:ring-fuchsia-300/50"}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${isHot ? "border border-cyan-300/20 bg-cyan-300/12 text-cyan-100" : "border border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100"}`,
                                        children: index + 1
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 109,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "truncate text-sm font-semibold text-white sm:text-base",
                                        children: item.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 119,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-2 truncate text-xs text-white/45 sm:text-sm",
                                children: item.locationLabel || "위치 정보 없음"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 124,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 107,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isHot ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100" : "border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100"}`,
                        children: formatRankDelta(item.rankDelta7d)
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TopMovers.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl border border-black/20 bg-black/20 px-3 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-[0.16em] text-white/40",
                                children: "현재 순위"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 142,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 font-semibold text-white",
                                children: [
                                    "#",
                                    item.rank
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 145,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl border border-black/20 bg-black/20 px-3 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] uppercase tracking-[0.16em] text-white/40",
                                children: "시가총액"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 149,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 truncate font-semibold text-white",
                                children: formatMarketCapKrw(item.marketCapKrw)
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 152,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TopMovers.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 flex items-center justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "truncate text-[11px] uppercase tracking-[0.16em] text-white/45",
                        children: item.complexId
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 159,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `shrink-0 text-[10px] uppercase tracking-[0.18em] ${isHot ? "text-cyan-300/80" : "text-fuchsia-300/80"}`,
                        children: "Open detail"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TopMovers.tsx",
                lineNumber: 158,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/TopMovers.tsx",
        lineNumber: 94,
        columnNumber: 5
    }, this);
}
_c = MoverRow;
function TopMovers({ items }) {
    const hotMovers = buildHotMovers(items);
    const coldDrops = buildColdDrops(items);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs",
                        children: "MOMENTUM FEED"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 181,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl",
                        children: "Weekly Hot"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 184,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-xs text-white/45 sm:text-sm",
                        children: "최근 7일 기준 순위 모멘텀과 압력을 즉시 스캔한다"
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 187,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TopMovers.tsx",
                lineNumber: 180,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-3 p-2 sm:gap-4 sm:p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-cyan-300/15 bg-black/20 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3 flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100 sm:text-base",
                                        children: "📈 MOMENTUM (W)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 195,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "rounded-full border border-cyan-300/20 bg-cyan-300/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100",
                                        children: "Weekly Updraft"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 198,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 194,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-2 sm:gap-3",
                                children: hotMovers.length > 0 ? hotMovers.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MoverRow, {
                                        item: item,
                                        tone: "hot",
                                        index: index
                                    }, item.complexId, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 206,
                                        columnNumber: 17
                                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/50",
                                    children: "최근 7일 기준 뚜렷한 상승 모멘텀이 감지되지 않았다."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/TopMovers.tsx",
                                    lineNumber: 214,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 203,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-fuchsia-400/15 bg-black/20 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3 flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-semibold uppercase tracking-[0.18em] text-fuchsia-100 sm:text-base",
                                        children: "📉 PRESSURE (W)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 223,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "rounded-full border border-fuchsia-400/20 bg-fuchsia-400/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-fuchsia-100",
                                        children: "Weekly Drag"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 226,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-2 sm:gap-3",
                                children: coldDrops.length > 0 ? coldDrops.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MoverRow, {
                                        item: item,
                                        tone: "cold",
                                        index: index
                                    }, item.complexId, false, {
                                        fileName: "[project]/src/components/home/TopMovers.tsx",
                                        lineNumber: 234,
                                        columnNumber: 17
                                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/50",
                                    children: "최근 7일 기준 뚜렷한 하락 압력이 감지되지 않았다."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/home/TopMovers.tsx",
                                    lineNumber: 242,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/TopMovers.tsx",
                                lineNumber: 231,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/TopMovers.tsx",
                        lineNumber: 221,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/TopMovers.tsx",
                lineNumber: 192,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/TopMovers.tsx",
        lineNumber: 179,
        columnNumber: 5
    }, this);
}
_c1 = TopMovers;
var _c, _c1;
__turbopack_context__.k.register(_c, "MoverRow");
__turbopack_context__.k.register(_c1, "TopMovers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/home/CommandPalette.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CommandPalette",
    ()=>CommandPalette
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const DEFAULT_RESULT_LIMIT = 8;
const TRIGGER_SELECTOR = [
    '[data-koaptix-command-trigger="true"]',
    'input[placeholder*="검색"]',
    'textarea[placeholder*="검색"]',
    'input[placeholder*="search" i]',
    'input[type="search"]'
].join(", ");
function normalize(value) {
    return value.trim().toLowerCase();
}
function formatMarketCapKrw(value) {
    if (!Number.isFinite(value) || value <= 0) return "-";
    const TRILLION = 1_000_000_000_000;
    const HUNDRED_MILLION = 100_000_000;
    if (value >= TRILLION) {
        const amount = value / TRILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}조원`;
    }
    if (value >= HUNDRED_MILLION) {
        const amount = value / HUNDRED_MILLION;
        const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
        return `${amount.toFixed(digits)}억원`;
    }
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function buildSearchText(item) {
    return item.searchText || [
        item.name,
        item.locationLabel,
        item.sigunguName,
        item.legalDongName,
        item.complexId
    ].filter(Boolean).join(" ").toLowerCase();
}
function scoreItem(item, query) {
    const q = normalize(query);
    if (!q) return 0;
    const name = item.name.toLowerCase();
    const district = (item.sigunguName || "").toLowerCase();
    const dong = (item.legalDongName || "").toLowerCase();
    const location = (item.locationLabel || "").toLowerCase();
    const code = String(item.complexId).toLowerCase();
    const searchText = buildSearchText(item);
    let score = 0;
    if (name === q) score += 200;
    if (name.startsWith(q)) score += 120;
    if (name.includes(q)) score += 70;
    if (district === q) score += 90;
    if (district.startsWith(q)) score += 70;
    if (district.includes(q)) score += 45;
    if (dong === q) score += 65;
    if (dong.startsWith(q)) score += 55;
    if (dong.includes(q)) score += 35;
    if (location.includes(q)) score += 25;
    if (code === q) score += 110;
    if (code.includes(q)) score += 40;
    if (searchText.includes(q)) score += 15;
    score += Math.max(0, 30 - item.rank);
    return score;
}
function buildTargetUrl(complexId) {
    const url = new URL(window.location.href);
    url.searchParams.set("complexId", complexId);
    url.searchParams.set("id", complexId);
    const query = url.searchParams.toString();
    return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}
function SearchIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        viewBox: "0 0 24 24",
        className: "h-5 w-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "11",
                cy: "11",
                r: "7"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "m20 20-3.5-3.5"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 125,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/CommandPalette.tsx",
        lineNumber: 114,
        columnNumber: 5
    }, this);
}
_c = SearchIcon;
function CommandIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        viewBox: "0 0 24 24",
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M6 6h2a3 3 0 1 1 0 6H6a3 3 0 1 1 0-6Z"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 142,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16 6h2a3 3 0 1 1 0 6h-2a3 3 0 1 1 0-6Z"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 143,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M6 16h2a3 3 0 1 1 0 6H6a3 3 0 1 1 0-6Z"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 144,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16 16h2a3 3 0 1 1 0 6h-2a3 3 0 1 1 0-6Z"
            }, void 0, false, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 145,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/home/CommandPalette.tsx",
        lineNumber: 132,
        columnNumber: 5
    }, this);
}
_c1 = CommandIcon;
function CommandPalette({ items, resultLimit = DEFAULT_RESULT_LIMIT }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [activeIndex, setActiveIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const resultRefs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    const results = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CommandPalette.useMemo[results]": ()=>{
            const q = normalize(query);
            if (!q) {
                return [
                    ...items
                ].sort({
                    "CommandPalette.useMemo[results]": (a, b)=>a.rank - b.rank
                }["CommandPalette.useMemo[results]"]).slice(0, resultLimit);
            }
            return items.map({
                "CommandPalette.useMemo[results]": (item)=>({
                        item,
                        score: scoreItem(item, q)
                    })
            }["CommandPalette.useMemo[results]"]).filter({
                "CommandPalette.useMemo[results]": (entry)=>entry.score > 0
            }["CommandPalette.useMemo[results]"]).sort({
                "CommandPalette.useMemo[results]": (a, b)=>{
                    if (b.score !== a.score) return b.score - a.score;
                    if (a.item.rank !== b.item.rank) return a.item.rank - b.item.rank;
                    return b.item.marketCapKrw - a.item.marketCapKrw;
                }
            }["CommandPalette.useMemo[results]"]).slice(0, resultLimit).map({
                "CommandPalette.useMemo[results]": (entry)=>entry.item
            }["CommandPalette.useMemo[results]"]);
        }
    }["CommandPalette.useMemo[results]"], [
        items,
        query,
        resultLimit
    ]);
    function openPalette(initialQuery = "") {
        setQuery(initialQuery);
        setActiveIndex(0);
        setOpen(true);
    }
    function closePalette() {
        setOpen(false);
        setQuery("");
        setActiveIndex(0);
    }
    function selectItem(item) {
        const nextUrl = buildTargetUrl(item.complexId);
        closePalette();
        router.push(nextUrl, {
            scroll: false
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommandPalette.useEffect": ()=>{
            if (!open) return;
            const frame = window.requestAnimationFrame({
                "CommandPalette.useEffect.frame": ()=>{
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }
            }["CommandPalette.useEffect.frame"]);
            return ({
                "CommandPalette.useEffect": ()=>window.cancelAnimationFrame(frame)
            })["CommandPalette.useEffect"];
        }
    }["CommandPalette.useEffect"], [
        open
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommandPalette.useEffect": ()=>{
            if (!open) return;
            if (results.length === 0) {
                setActiveIndex(-1);
                return;
            }
            setActiveIndex({
                "CommandPalette.useEffect": (prev)=>{
                    if (prev < 0) return 0;
                    if (prev >= results.length) return results.length - 1;
                    return prev;
                }
            }["CommandPalette.useEffect"]);
        }
    }["CommandPalette.useEffect"], [
        open,
        results.length
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommandPalette.useEffect": ()=>{
            if (!open || activeIndex < 0) return;
            resultRefs.current[activeIndex]?.scrollIntoView({
                block: "nearest"
            });
        }
    }["CommandPalette.useEffect"], [
        activeIndex,
        open
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommandPalette.useEffect": ()=>{
            const onGlobalKeyDown = {
                "CommandPalette.useEffect.onGlobalKeyDown": (event)=>{
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                        event.preventDefault();
                        openPalette();
                        return;
                    }
                    if (event.key === "Escape" && open) {
                        event.preventDefault();
                        closePalette();
                    }
                }
            }["CommandPalette.useEffect.onGlobalKeyDown"];
            window.addEventListener("keydown", onGlobalKeyDown);
            return ({
                "CommandPalette.useEffect": ()=>window.removeEventListener("keydown", onGlobalKeyDown)
            })["CommandPalette.useEffect"];
        }
    }["CommandPalette.useEffect"], [
        open
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommandPalette.useEffect": ()=>{
            const shouldIgnoreTarget = {
                "CommandPalette.useEffect.shouldIgnoreTarget": (target)=>{
                    if (!(target instanceof HTMLElement)) return true;
                    return Boolean(target.closest('[data-command-palette-root="true"]'));
                }
            }["CommandPalette.useEffect.shouldIgnoreTarget"];
            const readTriggerValue = {
                "CommandPalette.useEffect.readTriggerValue": (element)=>{
                    if (!element) return "";
                    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                        return element.value ?? "";
                    }
                    return "";
                }
            }["CommandPalette.useEffect.readTriggerValue"];
            const handlePointerDown = {
                "CommandPalette.useEffect.handlePointerDown": (event)=>{
                    if (shouldIgnoreTarget(event.target)) return;
                    if (!(event.target instanceof HTMLElement)) return;
                    const trigger = event.target.closest(TRIGGER_SELECTOR);
                    if (!trigger) return;
                    const initialValue = readTriggerValue(trigger);
                    window.requestAnimationFrame({
                        "CommandPalette.useEffect.handlePointerDown": ()=>{
                            openPalette(initialValue);
                        }
                    }["CommandPalette.useEffect.handlePointerDown"]);
                }
            }["CommandPalette.useEffect.handlePointerDown"];
            const handleFocusIn = {
                "CommandPalette.useEffect.handleFocusIn": (event)=>{
                    if (shouldIgnoreTarget(event.target)) return;
                    if (!(event.target instanceof HTMLElement)) return;
                    const trigger = event.target.closest(TRIGGER_SELECTOR);
                    if (!trigger) return;
                    const initialValue = readTriggerValue(trigger);
                    window.requestAnimationFrame({
                        "CommandPalette.useEffect.handleFocusIn": ()=>{
                            openPalette(initialValue);
                        }
                    }["CommandPalette.useEffect.handleFocusIn"]);
                }
            }["CommandPalette.useEffect.handleFocusIn"];
            document.addEventListener("pointerdown", handlePointerDown, true);
            document.addEventListener("focusin", handleFocusIn, true);
            return ({
                "CommandPalette.useEffect": ()=>{
                    document.removeEventListener("pointerdown", handlePointerDown, true);
                    document.removeEventListener("focusin", handleFocusIn, true);
                }
            })["CommandPalette.useEffect"];
        }
    }["CommandPalette.useEffect"], []);
    function onInputKeyDown(event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (results.length === 0) return;
            setActiveIndex((prev)=>(prev + 1) % results.length);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (results.length === 0) return;
            setActiveIndex((prev)=>(prev - 1 + results.length) % results.length);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            if (activeIndex < 0 || !results[activeIndex]) return;
            selectItem(results[activeIndex]);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            closePalette();
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>openPalette(),
                className: "fixed bottom-4 right-4 z-[74] hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-[#0b1118]/85 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-cyan-300/35 hover:bg-[#0b1118] lg:inline-flex",
                "aria-label": "커맨드 팔레트 열기",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandIcon, {}, void 0, false, {
                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                        lineNumber: 345,
                        columnNumber: 9
                    }, this),
                    "Command"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 339,
                columnNumber: 7
            }, this),
            open ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: rootRef,
                "data-command-palette-root": "true",
                className: "fixed inset-0 z-[80]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/72 backdrop-blur-md",
                        onClick: closePalette
                    }, void 0, false, {
                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                        lineNumber: 355,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-labelledby": "koaptix-command-title",
                        className: "absolute left-1/2 top-[12vh] w-[min(92vw,760px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-cyan-300/18 bg-[#0b1118]/92 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_36px_rgba(34,211,238,0.12),0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pointer-events-none absolute inset-0 opacity-75",
                                style: {
                                    backgroundImage: "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(232,121,249,0.10), transparent 28%), repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 8px)"
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                lineNumber: 366,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative border-b border-white/6 px-4 py-4 sm:px-5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SearchIcon, {}, void 0, false, {
                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                lineNumber: 377,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/home/CommandPalette.tsx",
                                            lineNumber: 376,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0 flex-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    id: "koaptix-command-title",
                                                    className: "text-[11px] uppercase tracking-[0.22em] text-cyan-300/70",
                                                    children: "KOAPTIX COMMAND PALETTE"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                    lineNumber: 381,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "relative mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            ref: inputRef,
                                                            value: query,
                                                            onChange: (event)=>setQuery(event.target.value),
                                                            onKeyDown: onInputKeyDown,
                                                            placeholder: "단지명 또는 지역명을 입력해라...",
                                                            className: "h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-4 pr-28 text-sm text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35",
                                                            "aria-controls": "koaptix-command-results",
                                                            "aria-expanded": "true",
                                                            "aria-activedescendant": activeIndex >= 0 ? `koaptix-command-option-${activeIndex}` : undefined
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                            lineNumber: 389,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] uppercase tracking-[0.16em] text-white/35",
                                                            children: "[esc] to close"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                            lineNumber: 403,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                    lineNumber: 388,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/home/CommandPalette.tsx",
                                            lineNumber: 380,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/home/CommandPalette.tsx",
                                    lineNumber: 375,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                lineNumber: 374,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative max-h-[58vh] overflow-y-auto p-2 sm:p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-2 flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.18em] text-white/35",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: normalize(query) ? "Search Results" : "Quick Access"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                lineNumber: 413,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    results.length,
                                                    " items"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                lineNumber: 414,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                        lineNumber: 412,
                                        columnNumber: 15
                                    }, this),
                                    results.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        id: "koaptix-command-results",
                                        role: "listbox",
                                        className: "grid gap-2",
                                        children: results.map((item, index)=>{
                                            const active = index === activeIndex;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                id: `koaptix-command-option-${index}`,
                                                ref: (element)=>{
                                                    resultRefs.current[index] = element;
                                                },
                                                type: "button",
                                                role: "option",
                                                "aria-selected": active,
                                                onMouseEnter: ()=>setActiveIndex(index),
                                                onClick: ()=>selectItem(item),
                                                className: `grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-cyan-300/28 bg-cyan-300/[0.10] shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_0_26px_rgba(34,211,238,0.14)]" : "border-white/8 bg-white/[0.03] hover:border-cyan-300/16 hover:bg-white/[0.05]"}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "min-w-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/45",
                                                                        children: [
                                                                            "#",
                                                                            item.rank
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                        lineNumber: 442,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                        className: "truncate text-sm font-semibold text-white sm:text-base",
                                                                        children: item.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                        lineNumber: 445,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                lineNumber: 441,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mt-1 truncate text-xs text-white/45 sm:text-sm",
                                                                children: [
                                                                    item.locationLabel || "위치 정보 없음",
                                                                    " · ID ",
                                                                    item.complexId
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                lineNumber: 450,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                        lineNumber: 440,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-[10px] uppercase tracking-[0.16em] text-white/40",
                                                                children: "Market Cap"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                lineNumber: 456,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mt-1 text-sm font-semibold text-cyan-100 sm:text-base",
                                                                children: formatMarketCapKrw(item.marketCapKrw)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                                lineNumber: 459,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                        lineNumber: 455,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, item.complexId, true, {
                                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                                lineNumber: 423,
                                                columnNumber: 23
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                        lineNumber: 418,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm leading-6 text-white/50",
                                        children: "검색 결과가 없다. 단지명, 구, 동 이름을 바꿔서 다시 입력해라."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                                        lineNumber: 468,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                lineNumber: 411,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative border-t border-white/6 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white/35 sm:px-5",
                                children: "↑ ↓ navigate · enter open detail · esc close · cmd/ctrl + k reopen"
                            }, void 0, false, {
                                fileName: "[project]/src/components/home/CommandPalette.tsx",
                                lineNumber: 474,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/home/CommandPalette.tsx",
                        lineNumber: 360,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/home/CommandPalette.tsx",
                lineNumber: 350,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true);
}
_s(CommandPalette, "oXEdTUDzbD0zZ3L9I8N7e7ugflQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c2 = CommandPalette;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "SearchIcon");
__turbopack_context__.k.register(_c1, "CommandIcon");
__turbopack_context__.k.register(_c2, "CommandPalette");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_home_0wwpzce._.js.map