import Link from "next/link";
import type { ReactNode } from "react";
import { PhotoTile } from "@/components/ui/PhotoTile";

const TILE_CLASS =
  "group relative block w-full overflow-hidden rounded-[26px] shadow-[0_10px_32px_rgba(5,5,5,0.07)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(5,5,5,0.13)]";

interface PhotoMosaicItem {
  id: string;
  href: string;
  mono: string;
  photo?: string;
}

interface PhotoMosaicProps<T extends PhotoMosaicItem> {
  items: T[];
  aspectPattern: string[];
  monoSize?: number;
  renderOverlay: (item: T) => ReactNode;
  renderBadge?: (item: T) => ReactNode;
  className?: string;
}

// Splits items round-robin into `count` columns, e.g. [0,1,2,3,4] with
// count=3 -> [[0,3],[1,4],[2]]. Rendering each bucket as its own flex column
// (instead of relying on CSS `columns-N`, which balances column count/height
// per browser engine and can render fewer columns than requested — Chromium
// and WebKit disagree here) keeps the column count exact in every browser.
function splitIntoColumns<T>(items: T[], count: number): T[][] {
  const columns: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => columns[index % count].push(item));
  return columns;
}

// Shared masonry mechanics for every "grid of photo cards linking somewhere"
// screen (venue roles, talent opportunities, ...). One column/gap/aspect-
// cycling implementation so every mosaic in the app behaves identically —
// only the data and overlay content differ per screen.
export function PhotoMosaic<T extends PhotoMosaicItem>({
  items,
  aspectPattern,
  monoSize = 76,
  renderOverlay,
  renderBadge,
  className = "",
}: PhotoMosaicProps<T>) {
  if (items.length === 0) return null;

  const renderTile = (item: T, index: number) => {
    const aspect = aspectPattern[index % aspectPattern.length];
    return (
      <Link key={item.id} href={item.href} className={`${TILE_CLASS} ${aspect}`}>
        <PhotoTile mono={item.mono} photoUrl={item.photo} monoSize={monoSize} className="h-full w-full">
          {renderBadge?.(item)}
          <div className="absolute bottom-[9px] left-[9px] right-[9px] flex flex-col gap-[3px] rounded-[18px] bg-white/95 px-3.5 py-2.5">
            {renderOverlay(item)}
          </div>
        </PhotoTile>
      </Link>
    );
  };

  const indexed = items.map((item, index) => ({ item, index }));

  return (
    <>
      <div className={`grid grid-cols-2 gap-x-[13px] md:hidden ${className}`}>
        {splitIntoColumns(indexed, 2).map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-[13px]">
            {column.map(({ item, index }) => renderTile(item, index))}
          </div>
        ))}
      </div>
      <div className={`hidden md:grid md:grid-cols-3 md:gap-x-4 ${className}`}>
        {splitIntoColumns(indexed, 3).map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map(({ item, index }) => renderTile(item, index))}
          </div>
        ))}
      </div>
    </>
  );
}
