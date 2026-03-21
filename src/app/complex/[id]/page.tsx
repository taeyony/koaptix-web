import type { Metadata } from "next";
import { buildComplexMetadata } from "../../../lib/koaptix/metadata";
import { ComplexShareRedirect } from "./ComplexShareRedirect";

type RouteParams =
  | Promise<{ id: string }>
  | { id: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  return buildComplexMetadata(resolvedParams.id);
}

export default async function ComplexSharePage({
  params,
}: {
  params: RouteParams;
}) {
  const resolvedParams = await Promise.resolve(params);

  return <ComplexShareRedirect complexId={resolvedParams.id} />;
}