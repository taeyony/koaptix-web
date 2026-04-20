#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const repeats = Number(process.env.KOAPTIX_DIRECT_READ_REPEATS ?? 5);
const targetCodes = (process.env.KOAPTIX_DIRECT_READ_CODES ?? "SGG_11110,SGG_11260,BUSAN_ALL")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

function readEnvLocal() {
  const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function formatError(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message ?? String(error),
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

async function timed(fn) {
  const startedAt = performance.now();
  const result = await fn();
  return {
    ms: Math.round(performance.now() - startedAt),
    data: result.data ?? null,
    error: formatError(result.error),
  };
}

async function readSnapshot(supabase, universeCode) {
  return timed(() =>
    supabase
      .from("koaptix_rank_snapshot")
      .select("snapshot_date")
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

async function readLatestBoard(supabase, universeCode) {
  return timed(() =>
    supabase
      .from("v_koaptix_latest_universe_rank_board_u")
      .select("universe_code, complex_id, apt_name_ko, rank_all")
      .eq("universe_code", universeCode)
      .order("rank_all", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
}

async function readDynamicBoard(supabase, universeCode, snapshotDate) {
  if (!snapshotDate) {
    return {
      ms: 0,
      data: null,
      error: null,
    };
  }

  return timed(() =>
    supabase
      .from("v_koaptix_universe_rank_history_dynamic")
      .select("universe_code, snapshot_date, complex_id, apt_name_ko, rank_all")
      .eq("universe_code", universeCode)
      .eq("snapshot_date", snapshotDate)
      .order("rank_all", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
}

async function diagnoseOne(supabase, universeCode) {
  const attempts = [];

  for (let i = 1; i <= repeats; i += 1) {
    const snapshot = await readSnapshot(supabase, universeCode);
    const snapshotDate = snapshot.data?.snapshot_date ?? null;
    const latestBoard = await readLatestBoard(supabase, universeCode);
    const dynamicBoard = await readDynamicBoard(supabase, universeCode, snapshotDate);

    attempts.push({
      attempt: i,
      snapshotOk: !snapshot.error && Boolean(snapshotDate),
      snapshotDate,
      snapshotMs: snapshot.ms,
      snapshotError: snapshot.error,
      latestBoardOk: !latestBoard.error && Boolean(latestBoard.data?.complex_id),
      latestBoardMs: latestBoard.ms,
      latestBoardError: latestBoard.error,
      latestComplexId: latestBoard.data?.complex_id ?? null,
      dynamicBoardOk: !dynamicBoard.error && Boolean(dynamicBoard.data?.complex_id),
      dynamicBoardMs: dynamicBoard.ms,
      dynamicBoardError: dynamicBoard.error,
      dynamicComplexId: dynamicBoard.data?.complex_id ?? null,
    });
  }

  return {
    code: universeCode,
    repeats,
    snapshotPasses: attempts.filter((row) => row.snapshotOk).length,
    latestBoardPasses: attempts.filter((row) => row.latestBoardOk).length,
    dynamicBoardPasses: attempts.filter((row) => row.dynamicBoardOk).length,
    attempts,
  };
}

async function main() {
  const env = readEnvLocal();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = [];
  for (const code of targetCodes) {
    results.push(await diagnoseOne(supabase, code));
  }

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        targetCodes,
        repeats,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
