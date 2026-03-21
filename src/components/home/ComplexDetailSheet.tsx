"use client";

import { useEffect, useState } from "react";
import type { ComplexDetail, RankingItem } from "../../lib/koaptix/types";

type ComplexDetailSheetProps = {
  open: boolean;
  item: RankingItem | null;
  detail: ComplexDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

function formatMarketCapKrw(value: number): string {
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

function formatCount(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}개`;
}

function formatPlainNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatYear(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value}년`;
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function ComplexDetailSheet({ open, item, detail, loading, error, onClose }: ComplexDetailSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !item || !mounted) return null;

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
          <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', border: 'none', cursor: 'pointer' }}>닫기</button>
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
    </div>
  );
}