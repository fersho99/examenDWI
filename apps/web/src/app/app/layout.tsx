import type { Viewport } from "next";
import { AlertWatcher } from "./alert-watcher";
import { BottomNav } from "./bottom-nav";
import { MarketProvider } from "./market-context";

export const viewport: Viewport = {
  themeColor: "#14110d",
  viewportFit: "cover",
};

/** Marco de la app del teléfono: precios compartidos, revisión de alertas y barra inferior. */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <MarketProvider>
      <AlertWatcher />
      <div className="has-nav flex flex-1 flex-col">{children}</div>
      <BottomNav />
    </MarketProvider>
  );
}
