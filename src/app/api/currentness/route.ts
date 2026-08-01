import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getKoaptixCurrentness,
  sanitizePublicationCurrentnessRows,
} from "../../../lib/koaptix/currentness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const CURRENTNESS_CACHE_CONTROL = "private, no-store, max-age=0";

function createCurrentnessSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET() {
  const deployment = getKoaptixCurrentness();

  try {
    const { data, error } = await createCurrentnessSupabase()
      .from("v_koaptix_latest_board_publication_currentness")
      .select(
        `
          generation_id,
          publication_version,
          publication_event_id,
          published_at,
          surface_code,
          universe_code,
          snapshot_date,
          source_previous_snapshot_date,
          row_count,
          plan_run_id,
          execution_run_id,
          source_authority_kind,
          source_authority_key,
          source_date_vector_sha256,
          full_row_digest_sha256,
          component_manifest_sha256,
          combined_surface_manifest_sha256
        `,
      );

    if (error) {
      throw new Error(`Failed to load publication currentness: ${error.message}`);
    }

    const currentness = sanitizePublicationCurrentnessRows(data ?? []);
    const identity = currentness[0]!;

    return NextResponse.json(
      {
        ok: true,
        ...deployment,
        generation_id: identity.generation_id,
        publication_version: identity.publication_version,
        publication_event_id: identity.publication_event_id,
        published_at: identity.published_at,
        publicationCurrentness: currentness,
      },
      {
        headers: {
          "Cache-Control": CURRENTNESS_CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load publication currentness";

    return NextResponse.json(
      {
        ok: false,
        ...deployment,
        error: {
          code: "PUBLICATION_CURRENTNESS_UNAVAILABLE",
          message,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": CURRENTNESS_CACHE_CONTROL,
        },
      },
    );
  }
}
