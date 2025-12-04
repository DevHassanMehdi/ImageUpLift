import GalleryItem from "./GalleryItem";

export default function GalleryGrid({ items, apiBase, onOpen, onDelete }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="gallery-grid">
      {items.map((item) => {
        const mode = (item?.mode || '').toLowerCase();
        const useOutput = mode === 'vectorize' || mode === 'outline';
        const thumbUrl = item
          ? `${apiBase}/conversion/${useOutput ? 'output' : 'thumb'}/${item.id}`
          : "/logo.svg";
        const badge = item.mode ? item.mode.toUpperCase() : "OUTPUT";
        const mime = item.output_mime || "";
        return (
          <GalleryItem
            key={item.id}
            item={item}
            thumbUrl={thumbUrl}
            badge={badge}
            mime={mime}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
