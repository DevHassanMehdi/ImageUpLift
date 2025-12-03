import GalleryItem from "./GalleryItem";

export default function GalleryGrid({ items, apiBase, onOpen, onDelete }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="gallery-grid">
      {items.map((item) => {
        const hasThumb = item.output_size_bytes && item.output_size_bytes > 0 && item.output_mime;
        const thumbUrl = hasThumb ? `${apiBase}/conversion/output/${item.id}` : "/logo.svg";
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
