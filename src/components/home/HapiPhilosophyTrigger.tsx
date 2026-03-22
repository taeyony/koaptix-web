"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function HapiPhilosophyTrigger() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 💡 잼이사 마법: 화면이 완전히 켜진 뒤에만 포탈을 열기 위한 장치
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 💡 잼이사 조립: 짤리지 않는 무적의 인라인 스타일 팝업창
  const modalContent = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setOpen(false)} />

      <section style={{ position: 'relative', width: '100%', maxWidth: '760px', backgroundColor: '#0b1118', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
        
        {/* 사이버펑크 배경 데코레이션 */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.7, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(217,70,239,0.12), transparent 28%)' }} />

        {/* 헤더 및 닫기 버튼 구출! */}
        <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(103,232,249,0.7)', letterSpacing: '2px', fontWeight: 'bold' }}>HAPI OPERATING PHILOSOPHY</p>
            <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: 'white', textShadow: '0 0 22px rgba(34,211,238,0.3)', letterSpacing: '2px' }}>ELASTIC SACRIFICE</h2>
          </div>
          <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }}>닫기</button>
        </div>

        {/* 본문 철학 내용 */}
        <div style={{ position: 'relative', padding: '24px' }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(103,232,249,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.8' }}>
              HAPI는 맹목적인 투기를 권하지 않는다. 우리는 <span style={{ color: '#cffafe', fontWeight: 'bold' }}>버틸 것</span>과 <span style={{ color: '#f5d0fe', fontWeight: 'bold' }}>비울 것</span>을 계산하고, 현재의 자산을 다음 포지션으로 이동시키는 <span style={{ color: '#6ee7b7', fontWeight: 'bold' }}>합리적 갈아타기</span>를 설계한다. KOAPTIX는 그 순간을 읽는 콘솔이다.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'rgba(103,232,249,0.7)', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' }}>HOLD</p>
              <p style={{ margin: '0 0 8px 0', color: 'white', fontWeight: 'bold', fontSize: '15px' }}>버틸 가치를 식별한다</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6' }}>단지의 체급, 위치, 시총 내구성을 먼저 본다.</p>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'rgba(240,171,252,0.7)', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' }}>RELEASE</p>
              <p style={{ margin: '0 0 8px 0', color: 'white', fontWeight: 'bold', fontSize: '15px' }}>과잉 집착을 비운다</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6' }}>감정이 아니라 데이터로 희생의 강도를 조절한다.</p>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'rgba(110,231,183,0.7)', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' }}>ROTATE</p>
              <p style={{ margin: '0 0 8px 0', color: 'white', fontWeight: 'bold', fontSize: '15px' }}>더 강한 흐름으로 탄다</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6' }}>KOAPTIX는 그 방향성과 타이밍을 시각화한다.</p>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(103,232,249,0.05)', border: '1px dashed rgba(103,232,249,0.2)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ margin: '0 0 8px 0', color: 'rgba(103,232,249,0.7)', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' }}>HAPI SIGNAL</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: '1.8' }}>
              “좋은 투자”가 아니라, <span style={{ color: '#cffafe', fontWeight: 'bold' }}>더 높은 확률의 이동</span>을 선택한다. 지금의 집을 지키는 것조차 하나의 포지션이고, 갈아타는 결단 역시 하나의 전략이다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-300/25 bg-black/30 text-[11px] font-semibold text-cyan-100">?</span>
        ABOUT HAPI
      </button>
      
      {/* 💡 잼이사 마법: createPortal로 모달창을 최상위 body로 순간이동! */}
      {open && mounted ? createPortal(modalContent, document.body) : null}
    </>
  );
}