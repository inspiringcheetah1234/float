import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { getFirm } from "@/server/queries/common";
import { FirmForm } from "./firm-form";

export const metadata: Metadata = { title: "Firm settings" };

export default async function FirmPage() {
  const ctx = await getContext();
  const firm = await getFirm();
  return <FirmForm firm={firm} canEdit={ctx.can("settings", "edit")} />;
}
