import { redirect } from "next/navigation";
import { getContext } from "@/lib/auth";

export default async function Home() {
  const ctx = await getContext();
  redirect(ctx.isOwner ? "/today" : "/my-work");
}
