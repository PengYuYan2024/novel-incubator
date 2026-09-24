import { ItemDetail } from "@/components/items/item-detail";
import { AppShell } from "@/components/shell/app-shell";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><ItemDetail itemId={id} /></AppShell>;
}
