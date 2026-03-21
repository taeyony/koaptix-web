"use client";

import { useEffect, useRef, useState } from "react";
import type { ComplexDetail, RankingItem } from "../../lib/koaptix/types";

type ComplexDetailSheetProps = {
  open: boolean;
  item: RankingItem | null;
  detail: ComplexDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

function formatMarketCapKrw(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;
  if (value >= TRILLION) return `${(value / TRILLION).toFixed(value / TRILLION >= 100 ? 0 : value / TRILLION >= 10 ? 1 : 2)}조원`;
  if (value >= HUNDRED_MILLION) return `${(value / HUNDRED_MILLION).toFixed(value / HUNDRED_MILLION >= 100 ? 0 : value / HUNDRED_MILLION >= 10 ? 1 : 2)}억원`;
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatCount(value: number | null | undefined) { return value == null ? "-" : `${new Intl.NumberFormat("ko-KR").format(value)}개`; }
function formatPlainNumber(value: number | null | undefined) { return value == null ? "-" : new Intl.NumberFormat("ko-KR").format(value); }
function formatYear(value: number | null | undefined) { return value == null ? "-" : `${value}년`; }
function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function ComplexDetailSheet({ open, item, detail, loading, error, onClose }: ComplexDetailSheetProps) {
  const [sharePending, setSharePending] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function showToast(message: string, tone: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  async function handleShare() {
    if (!item || typeof window === "undefined") return;
    const shareTitle = detail?.name ?? item.name;
    const shareUrl = window.location.href;

    setSharePending(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, url: shareUrl });
          return;
        } catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("링크가 복사되었습니다!", "success");
        return;
      }
      showToast("공유를 지원하지 않는 브라우저입니다.", "error");
    } catch {
      showToast("공유에 실패했습니다.", "error");
    } finally {
      setSharePending(false);
    }
  }

  if (!open || !item) return null;

  const title = detail?.name ?? item.name;
  const location = detail?.locationLabel ?? item.locationLabel ?? "위치 정보 없음";
  const rank = detail?.rank ?? item.rank;
  const marketCap = detail?.marketCapKrw ?? item.marketCapKrw;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose} />

      <section style={{ position: 'relative', width: '100%', maxWidth: '640px', backgroundColor: '#0b1118', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', border: '1px solid #22d3ee', boxShadow: '0 -10px 50px rgba(0,0,0,0.8)', padding: '24px', color: 'white', maxHeight: '85vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ color: '#67e8f9', fontSize: '12px', letterSpacing: '2px', margin: '0 0 4px 0' }}>COMPLEX DETAIL</p>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>{location}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleShare} disabled={sharePending} style={{ padding: '8px 16px', backgroundColor: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.2)', borderRadius: '8px', color: '#cffafe', cursor: sharePending ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              {sharePending ? "공유 중..." : "공유하기"}
            </button>
            <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', border: 'none', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>현재 순위</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>#{formatPlainNumber(rank)}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>시가총액</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{formatMarketCapKrw(marketCap)}</p>
          </div>
        </div>

        {error ? <div style={{ color: '#fda4af', padding: '12px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', marginBottom: '16px' }}>{error}</div> : null}

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
          {loading && !detail ? (
            <p style={{ color: '#22d3ee', textAlign: 'center', margin: '20px 0', fontWeight: 'bold' }}>상세 데이터를 불러오는 중입니다...</p>
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>세대수</span><span style={{ fontWeight: 'bold' }}>{formatCount(detail.householdCount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>준공연도</span><span style={{ fontWeight: 'bold' }}>{formatYear(detail.approvalYear)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>주차대수</span><span style={{ fontWeight: 'bold' }}>{formatCount(detail.parkingCount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>데이터 기준일</span><span style={{ fontWeight: 'bold' }}>{formatUpdatedAt(detail.updatedAt)}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>상세 데이터가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 💡 잼이사가 예쁘게 꾸민 토스트 알림! */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999999, padding: '12px 24px', borderRadius: '30px', backgroundColor: toast.tone === 'success' ? '#047857' : '#be123c', color: 'white', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}