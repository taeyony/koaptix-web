"use client";

import { useEffect, useState, useRef } from "react";
import type { ComplexDetail, RankingItem } from "../../lib/koaptix/types";

export function ComparisonSheet({ open, items, onClose, onClear }: any) {
  const [details, setDetails] = useState<Record<string, ComplexDetail>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || items.length !== 2) return;
    
    // 배경 스크롤 방지
    document.body.style.overflow = "hidden";
    
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    Promise.all(
      items.map((item: any) =>
        fetch(`/api/complex-detail?complexId=${item.complexId}`, { signal: controller.signal })
          .then(res => res.json())
          .then(data => ({ id: item.complexId, detail: data.data }))
      )
    ).then(results => {
      const newDetails: any = {};
      results.forEach(r => { if (r.detail) newDetails[r.id] = r.detail; });
      setDetails(newDetails);
      setLoading(false);
    }).catch(e => {
      if (e.name !== 'AbortError') setLoading(false);
    });

    return () => {
      document.body.style.overflow = "";
      controller.abort();
    };
  }, [open, items]);

  if (!open) return null;

  const leftItem = items[0];
  const rightItem = items[1];
  const leftDetail = leftItem ? details[leftItem.complexId] : null;
  const rightDetail = rightItem ? details[rightItem.complexId] : null;

  const getVal = (item: any, detail: any, key: string) => detail?.[key] ?? item?.[key] ?? null;

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

  const formatNum = (val: any, suffix = '') => val ? `${new Intl.NumberFormat('ko-KR').format(val)}${suffix}` : '-';
  const formatCap = (val: any) => {
    if (!val) return '-';
    if (val >= 1000000000000) return `${(val / 1000000000000).toFixed(1)}조원`;
    return `${(val / 100000000).toFixed(0)}억원`;
  };

  // 💡 대결 표(Row) 렌더링 함수
  const Row = ({ label, lVal, rVal, lWin, rWin }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
      <div style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '12px', backgroundColor: lWin ? 'rgba(34,211,238,0.1)' : 'transparent', color: lWin ? '#67e8f9' : 'white', fontWeight: 'bold', border: lWin ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent' }}>
        {lVal}
      </div>
      <div style={{ width: '80px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>{label}</div>
      <div style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '12px', backgroundColor: rWin ? 'rgba(34,211,238,0.1)' : 'transparent', color: rWin ? '#67e8f9' : 'white', fontWeight: 'bold', border: rWin ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent' }}>
        {rVal}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose} />
      <section style={{ position: 'relative', width: '100%', maxWidth: '800px', backgroundColor: '#0b1118', borderRadius: '24px', border: '1px solid #22d3ee', padding: '24px', color: 'white', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div>
            <p style={{ color: '#67e8f9', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', margin: '0 0 8px 0' }}>VS COMPARISON</p>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>단지 스펙 비교</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClear} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', border: 'none', cursor: 'pointer' }}>초기화</button>
            <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: 'rgba(34,211,238,0.2)', borderRadius: '8px', color: '#cffafe', border: 'none', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#22d3ee', fontWeight: 'bold' }}>데이터를 불러오는 중입니다...</div>
        ) : items.length === 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* 상단 단지명 비교 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px', marginBottom: '8px' }}>A 단지</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{leftItem.name}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{leftItem.locationLabel}</div>
              </div>
              <div style={{ width: '80px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#475569', fontStyle: 'italic' }}>VS</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px', marginBottom: '8px' }}>B 단지</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{rightItem.name}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{rightItem.locationLabel}</div>
              </div>
            </div>

            {/* 항목별 대결 로직 (이긴 쪽에 불빛 들어옴) */}
            <Row label="현재 순위" lVal={formatNum(leftRank, '위')} rVal={formatNum(rightRank, '위')} lWin={leftRank && rightRank && leftRank < rightRank} rWin={leftRank && rightRank && rightRank < leftRank} />
            <Row label="시가총액" lVal={formatCap(leftCap)} rVal={formatCap(rightCap)} lWin={leftCap && rightCap && leftCap > rightCap} rWin={leftCap && rightCap && rightCap > leftCap} />
            <Row label="세대수" lVal={formatNum(leftHouse, '세대')} rVal={formatNum(rightHouse, '세대')} lWin={leftHouse && rightHouse && leftHouse > rightHouse} rWin={leftHouse && rightHouse && rightHouse > leftHouse} />
            <Row label="준공연도" lVal={formatNum(leftYear, '년')} rVal={formatNum(rightYear, '년')} lWin={leftYear && rightYear && leftYear > rightYear} rWin={leftYear && rightYear && rightYear > leftYear} />
            <Row label="주차대수" lVal={formatNum(leftPark, '대')} rVal={formatNum(rightPark, '대')} lWin={leftPark && rightPark && leftPark > rightPark} rWin={leftPark && rightPark && rightPark > leftPark} />

          </div>
        ) : null}
      </section>
    </div>
  );
}