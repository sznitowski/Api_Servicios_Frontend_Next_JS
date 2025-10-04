// src/app/provider/[...slug]/page.tsx  (Server Component)
import { redirect } from "next/navigation";

export default function Page({ params }: { params: { slug?: string[] } }) {
  redirect(`/providers/${(params.slug ?? []).join("/")}`);
}
