import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "La Struttura",
  description: "Consulta il regolamento ufficiale del Fanta a 20.",
  path: "/regolamento",
});

export default function RegolamentoLayout({ children }: { children: ReactNode }) {
  return children;
}
