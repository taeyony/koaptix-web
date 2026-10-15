import type { Metadata } from "next";
import { buildComplexMetadata } from "../../../lib/koaptix/metadata";
import { ComplexShareRedirect } from "./ComplexShareRedirect";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return buildComplexMetadata(resolvedParams.id);
}

export default async function ComplexSharePage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: Promise<{ universe?: string }>;
}) {
  const resolvedParams = await params;
  const query = await searchParams;

  return <ComplexShareRedirect complexId={resolvedParams.id} universeCode={query.universe} />;
}
