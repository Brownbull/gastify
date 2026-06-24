import { AppHeader, BottomNav, ScanFab } from "@design-system/organisms/Nav";
import { ItemsBrowseContent } from "./ItemsBrowseContent";

/**
 * ItemsBrowseScreen (Roadmap B) — the standalone "Productos" browse: the
 * ItemsBrowseContent (search/filter band + HistoryItemRow list + overlays)
 * wrapped in its own chrome (AppHeader + BottomNav + ScanFab). The same content
 * also powers the Productos subsection of HistoryScreen (without this chrome).
 */
export function ItemsBrowseScreen() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="browse" title="Productos" />
      <ItemsBrowseContent />
      <BottomNav active="history" />
      <ScanFab placement="corner" />
    </div>
  );
}
