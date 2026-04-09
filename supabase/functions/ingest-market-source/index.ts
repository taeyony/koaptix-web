import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

type JsonRecord = Record<string, unknown>;
type PipelineStatus = "running" | "success" | "failed";

type StageRawRow = {
  run_date: string;
  source_system: string;
  source_dataset: string;
  source_row_key: string;
  lawd_cd: string | null;
  sgg_cd: string | null;
  umd_cd: string | null;
  umd_nm: string | null;
  apt_nm: string | null;
  apt_dong: string | null;
  jibun: string | null;
  exclu_use_ar: number | null;
  deal_amount_krw: string | null;
  deal_year: number | null;
  deal_month: number | null;
  deal_day: number | null;
  trade_date: string | null;
  build_year: number | null;
  floor: number | null;
  road_nm: string | null;
  road_nm_bonbun: string | null;
  road_nm_bubun: string | null;
  dealing_gbn: string | null;
  estate_agent_sgg_nm: string | null;
  raw_item: JsonRecord;
  payload: JsonRecord;
  collected_at: string;
};

type FetchPageResult = {
  items: JsonRecord[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  requestUrl: string;
  resultCode: string | null;
  resultMessage: string | null;
};

const SEOUL_TIME_ZONE = "Asia/Seoul";
const SOURCE_SYSTEM = Deno.env.get("KOAPTIX_SOURCE_SYSTEM") ?? "molit-apt-trade-xml";
const SOURCE_DATASET = Deno.env.get("KOAPTIX_SOURCE_DATASET") ?? "molit-apt-trade-detail";
const KEEP_DAYS = Number(Deno.env.get("KOAPTIX_STAGING_KEEP_DAYS") ?? "14");
const DEFAULT_NUM_OF_ROWS = Math.max(100, Number(Deno.env.get("KOAPTIX_MOLIT_NUM_OF_ROWS") ?? "1000"));
const DEFAULT_PAGE_MAX = Math.max(1, Number(Deno.env.get("KOAPTIX_MOLIT_PAGE_MAX") ?? "50"));

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
  attributeNamePrefix: "",
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

function createAdminClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isCronAuthorized(request: Request): boolean {
  const expected = Deno.env.get("KOAPTIX_CRON_SECRET");
  if (!expected) return true;
  return request.headers.get("x-koaptix-cron-secret") === expected;
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function toSeoulDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function parseRunDate(request: Request, body: JsonRecord | null): string {
  const url = new URL(request.url);
  const candidate =
    url.searchParams.get("run_date") ??
    (typeof body?.run_date === "string" ? body.run_date : null) ??
    toSeoulDateString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new Error(`Invalid run_date: ${candidate}`);
  }

  return candidate;
}

function parseTargetYm(request: Request, body: JsonRecord | null, runDate: string): string {
  const url = new URL(request.url);
  const candidate =
    url.searchParams.get("target_ym") ??
    (typeof body?.target_ym === "string" ? body.target_ym : null) ??
    runDate.slice(0, 7).replace(/-/g, "");

  if (!/^\d{6}$/.test(candidate)) {
    throw new Error(`Invalid target_ym: ${candidate}`);
  }

  return candidate;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function readBodyLawdCodes(body: JsonRecord | null): string[] {
  const raw = body?.lawd_codes;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((value) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : ""))
    .filter((value) => /^\d{5}$/.test(value));
}

function parseLawdCodes(request: Request, body: JsonRecord | null): string[] {
  const url = new URL(request.url);

  const querySingle = url.searchParams.get("lawd_code");
  if (querySingle && /^\d{5}$/.test(querySingle.trim())) {
    return [querySingle.trim()];
  }

  const queryMany = url.searchParams.get("lawd_codes");
  if (queryMany) {
    const parsed = queryMany
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\d{5}$/.test(value));

    if (parsed.length > 0) return Array.from(new Set(parsed));
  }

  const bodyCodes = readBodyLawdCodes(body);
  if (bodyCodes.length > 0) {
    return Array.from(new Set(bodyCodes));
  }

  const envCodes = (Deno.env.get("KOAPTIX_MOLIT_LAWD_CODES") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d{5}$/.test(value));

  if (envCodes.length === 0) {
    throw new Error("No LAWD codes provided. Set KOAPTIX_MOLIT_LAWD_CODES or pass lawd_code(s) in the request.");
  }

  return Array.from(new Set(envCodes));
}

function getCandidate(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toNullableInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

function toNullableFloat(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function pad2(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return String(value).padStart(2, "0");
}

function composeTradeDate(dealYear: number | null, dealMonth: number | null, dealDay: number | null): string | null {
  if (dealYear === null || dealMonth === null || dealDay === null) {
    return null;
  }

  const mm = pad2(dealMonth);
  const dd = pad2(dealDay);
  if (!mm || !dd) return null;

  return `${dealYear}-${mm}-${dd}`;
}

function toMoneyWanString(value: unknown): string | null {
  const candidate = toNullableString(value);
  if (!candidate) return null;

  const normalized = candidate.replace(/,/g, "").replace(/\s+/g, "").trim();
  if (!/^[-+]?\d+$/.test(normalized)) return null;
  return normalized;
}

function dealAmountWanToKrwString(value: unknown): string | null {
  const normalized = toMoneyWanString(value);
  if (!normalized) return null;

  try {
    const krw = BigInt(normalized) * 10000n;
    return krw.toString();
  } catch {
    return null;
  }
}

function buildSourceRowKey(record: JsonRecord, tradeDate: string | null, dealAmountKrw: string | null): string | null {
  const parts = [
    toNullableString(getCandidate(record, ["lawdCd", "법정동시군구코드", "지역코드"])),
    toNullableString(getCandidate(record, ["umdCd", "법정동읍면동코드"])),
    toNullableString(getCandidate(record, ["aptNm", "아파트"])),
    toNullableString(getCandidate(record, ["aptDong", "아파트동명", "동"])),
    toNullableString(getCandidate(record, ["jibun", "지번"])),
    toNullableString(getCandidate(record, ["excluUseAr", "전용면적"])),
    tradeDate,
    dealAmountKrw,
    toNullableString(getCandidate(record, ["floor", "층"])),
    toNullableString(getCandidate(record, ["buildYear", "건축년도"])),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("::") : null;
}

function normalizeTradeRow(raw: unknown, runDate: string, fallbackLawdCode: string): StageRawRow | null {
  const record = asRecord(raw);

  const dealYear = toNullableInteger(getCandidate(record, ["dealYear", "년"]));
  const dealMonth = toNullableInteger(getCandidate(record, ["dealMonth", "월"]));
  const dealDay = toNullableInteger(getCandidate(record, ["dealDay", "일"]));
  const tradeDate = composeTradeDate(dealYear, dealMonth, dealDay);
  const dealAmountKrw = dealAmountWanToKrwString(getCandidate(record, ["dealAmount", "거래금액"]));
  const excluUseAr = toNullableFloat(getCandidate(record, ["excluUseAr", "전용면적"]));
  const aptNm = toNullableString(getCandidate(record, ["aptNm", "아파트"]));
  const umdNm = toNullableString(getCandidate(record, ["umdNm", "법정동"]));
  const sourceRowKey = buildSourceRowKey(record, tradeDate, dealAmountKrw);

  if (!tradeDate || !dealAmountKrw || !aptNm || !umdNm || !sourceRowKey) {
    return null;
  }

  return {
    run_date: runDate,
    source_system: SOURCE_SYSTEM,
    source_dataset: SOURCE_DATASET,
    source_row_key: sourceRowKey,
    lawd_cd: toNullableString(getCandidate(record, ["lawdCd", "법정동시군구코드", "지역코드"])) ?? fallbackLawdCode,
    sgg_cd: toNullableString(getCandidate(record, ["sggCd", "시군구코드"])),
    umd_cd: toNullableString(getCandidate(record, ["umdCd", "법정동읍면동코드"])),
    umd_nm: umdNm,
    apt_nm: aptNm,
    apt_dong: toNullableString(getCandidate(record, ["aptDong", "아파트동명", "동"])),
    jibun: toNullableString(getCandidate(record, ["jibun", "지번"])),
    exclu_use_ar: excluUseAr,
    deal_amount_krw: dealAmountKrw,
    deal_year: dealYear,
    deal_month: dealMonth,
    deal_day: dealDay,
    trade_date: tradeDate,
    build_year: toNullableInteger(getCandidate(record, ["buildYear", "건축년도"])),
    floor: toNullableInteger(getCandidate(record, ["floor", "층"])),
    road_nm: toNullableString(getCandidate(record, ["roadNm", "도로명"])),
    road_nm_bonbun: toNullableString(getCandidate(record, ["roadNmBonbun", "도로명건물본번호코드"])),
    road_nm_bubun: toNullableString(getCandidate(record, ["roadNmBubun", "도로명건물부번호코드"])),
    dealing_gbn: toNullableString(getCandidate(record, ["dealingGbn", "거래유형"])),
    estate_agent_sgg_nm: toNullableString(getCandidate(record, ["estateAgentSggNm", "중개사소재지"])),
    raw_item: record,
    payload: record,
    collected_at: new Date().toISOString(),
  };
}

function parseXmlPage(xmlText: string): FetchPageResult {
  const parsed = xmlParser.parse(xmlText);
  const response = asRecord(parsed.response);
  const header = asRecord(response.header);
  const body = asRecord(response.body);
  const itemsContainer = asRecord(body.items);
  const rawItems = itemsContainer.item;
  const items = toArray(rawItems).map((item) => asRecord(item));

  const resultCode = toNullableString(header.resultCode);
  const resultMessage = toNullableString(header.resultMsg ?? header.resultMessage);

  return {
    items,
    totalCount: toNullableInteger(body.totalCount) ?? items.length,
    pageNo: toNullableInteger(body.pageNo) ?? 1,
    numOfRows: toNullableInteger(body.numOfRows) ?? Math.max(items.length, 1),
    requestUrl: "",
    resultCode,
    resultMessage,
  };
}

async function fetchLawdCodePage(params: {
  endpoint: string;
  serviceKey: string;
  lawdCode: string;
  targetYm: string;
  pageNo: number;
  numOfRows: number;
}) {
  const url = new URL(params.endpoint);
  url.searchParams.set("serviceKey", params.serviceKey);
  url.searchParams.set("LAWD_CD", params.lawdCode);
  url.searchParams.set("DEAL_YMD", params.targetYm);
  url.searchParams.set("pageNo", String(params.pageNo));
  url.searchParams.set("numOfRows", String(params.numOfRows));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MOLIT fetch failed (${params.lawdCode} p${params.pageNo}): ${response.status} ${response.statusText} :: ${text.slice(0, 300)}`);
  }

  const parsed = parseXmlPage(text);
  parsed.requestUrl = url.toString();

  if (parsed.resultCode && parsed.resultCode !== "00" && parsed.resultCode !== "000") {
    throw new Error(
      `MOLIT response error (${params.lawdCode} p${params.pageNo}): ${parsed.resultCode} ${parsed.resultMessage ?? "unknown"}`,
    );
  }

  return parsed;
}

async function fetchAllTradeRows(targetYm: string, lawdCodes: string[]): Promise<{
  rows: Array<{ lawdCode: string; item: JsonRecord }>;
  pageCount: number;
  sourceUrl: string;
}> {
  const endpoint = getEnv("KOAPTIX_MOLIT_APT_TRADE_URL");
  const serviceKey = getEnv("KOAPTIX_MOLIT_SERVICE_KEY");

  const rows: Array<{ lawdCode: string; item: JsonRecord }> = [];
  let totalPagesFetched = 0;
  let lastRequestUrl = endpoint;

  for (const lawdCode of lawdCodes) {
    let pageNo = 1;
    let totalCount: number | null = null;

    while (pageNo <= DEFAULT_PAGE_MAX) {
      const page = await fetchLawdCodePage({
        endpoint,
        serviceKey,
        lawdCode,
        targetYm,
        pageNo,
        numOfRows: DEFAULT_NUM_OF_ROWS,
      });

      totalPagesFetched += 1;
      lastRequestUrl = page.requestUrl;
      totalCount = totalCount ?? page.totalCount;

      for (const item of page.items) {
        rows.push({ lawdCode, item });
      }

      const consumed = page.pageNo * page.numOfRows;
      const hasMore = consumed < (totalCount ?? 0) && page.items.length > 0;

      if (!hasMore) {
        break;
      }

      pageNo += 1;
    }
  }

  return {
    rows,
    pageCount: totalPagesFetched,
    sourceUrl: endpoint,
  };
}

async function upsertPipelineRun(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    jobName: string;
    runDate: string;
    status: PipelineStatus;
    summary: JsonRecord;
    errorText?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  },
) {
  const payload = {
    job_name: params.jobName,
    run_date: params.runDate,
    status: params.status,
    summary_json: params.summary,
    error_text: params.errorText ?? null,
    started_at: params.startedAt ?? null,
    finished_at: params.finishedAt ?? null,
  };

  const { error } = await supabase.from("pipeline_runs").upsert(payload, {
    onConflict: "job_name,run_date",
  });

  if (error) {
    throw new Error(`Failed to upsert pipeline_runs: ${error.message}`);
  }
}

async function cleanupOldStaging(supabase: ReturnType<typeof createAdminClient>, baseRunDate: string) {
  const base = new Date(`${baseRunDate}T00:00:00+09:00`);
  const cutoff = new Date(base.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000);
  const cutoffDate = toSeoulDateString(cutoff);

  const { error } = await supabase
    .from("staging_market_raw")
    .delete()
    .lt("run_date", cutoffDate);

  if (error) {
    throw new Error(`Failed to cleanup staging rows: ${error.message}`);
  }

  return { cutoffDate };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  if (!isCronAuthorized(request)) {
    return jsonResponse({ ok: false, message: "Unauthorized cron caller" }, 401);
  }

  const startedAt = new Date().toISOString();
  const supabase = createAdminClient();

  let body: JsonRecord | null = null;
  try {
    body = await request.json().catch(() => null);
  } catch {
    body = null;
  }

  const runDate = (() => {
    try {
      return parseRunDate(request, body);
    } catch {
      return toSeoulDateString();
    }
  })();

  try {
    const targetYm = parseTargetYm(request, body, runDate);
    const lawdCodes = parseLawdCodes(request, body);

    await upsertPipelineRun(supabase, {
      jobName: "ingest-market-source",
      runDate,
      status: "running",
      summary: {
        phase: "fetching-molit-xml",
        target_ym: targetYm,
        lawd_code_count: lawdCodes.length,
      },
      startedAt,
      finishedAt: null,
    });

    const fetched = await fetchAllTradeRows(targetYm, lawdCodes);

    const normalizedRows = fetched.rows
      .map(({ lawdCode, item }) => normalizeTradeRow(item, runDate, lawdCode))
      .filter((row): row is StageRawRow => row !== null);

    const invalidRows = fetched.rows.length - normalizedRows.length;
    if (normalizedRows.length === 0) {
      throw new Error(
        "No valid MOLIT trade rows were produced. Required fields include aptNm, umdNm, dealAmount, dealYear, dealMonth, dealDay.",
      );
    }

    const chunkSize = 500;
    for (let index = 0; index < normalizedRows.length; index += chunkSize) {
      const batch = normalizedRows.slice(index, index + chunkSize);

      // 🚨 [CTO 긴급 뇌수술]: 국토부가 준 중복 데이터를 창고에 넣기 전에 미리 걸러냅니다!!
      const uniqueBatch = Array.from(
        new Map(batch.map((item) => [item.source_row_key, item])).values()
      );

      const { error } = await supabase.from("staging_market_raw").upsert(uniqueBatch, {
        onConflict: "run_date,source_system,source_row_key",
        ignoreDuplicates: false,
      });

      if (error) {
        throw new Error(`Failed to upsert staging batch ${index / chunkSize + 1}: ${error.message}`);
      }
    }

    const cleanup = await cleanupOldStaging(supabase, runDate);

    const summary = {
      phase: "ingest-complete",
      source_system: SOURCE_SYSTEM,
      source_dataset: SOURCE_DATASET,
      target_ym: targetYm,
      lawd_code_count: lawdCodes.length,
      page_count: fetched.pageCount,
      source_rows: fetched.rows.length,
      ingested_rows: normalizedRows.length,
      invalid_rows: invalidRows,
      source_url: fetched.sourceUrl,
      staging_keep_days: KEEP_DAYS,
      staging_cutoff_date: cleanup.cutoffDate,
      sample_trade_date: normalizedRows[0]?.trade_date ?? null,
      sample_deal_amount_krw: normalizedRows[0]?.deal_amount_krw ?? null,
    };

    await upsertPipelineRun(supabase, {
      jobName: "ingest-market-source",
      runDate,
      status: "success",
      summary,
      finishedAt: new Date().toISOString(),
    });

    return jsonResponse({
      ok: true,
      run_date: runDate,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await upsertPipelineRun(supabase, {
        jobName: "ingest-market-source",
        runDate,
        status: "failed",
        summary: {
          phase: "ingest-failed",
        },
        errorText: message,
        finishedAt: new Date().toISOString(),
      });
    } catch (loggingError) {
      console.error("[ingest-market-source] failed to record pipeline_runs", loggingError);
    }

    console.error("[ingest-market-source]", error);
    return jsonResponse({ ok: false, run_date: runDate, error: message }, 500);
  }
});
