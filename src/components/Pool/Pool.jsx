import styles from './Pool.module.css';

// Stacked 3px rings, one per color, plus a soft glow in the first color.
function glowShadow(colors) {
  const rings = colors.map((color, i) => `0 0 0 ${(i + 1) * 3}px ${color}`);
  return [...rings, `0 0 ${colors.length * 3 + 12}px ${colors[0]}`].join(', ');
}

// previews (id -> product) and glows (id -> colors) are optional overlays used
// by the playtest settings; onHover reports the hovered or focused open tile.
export default function Pool({
  pool,
  selectedId,
  onSelect,
  awaitingSelection,
  onHover,
  previews,
  glows,
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {pool.map((item) => {
          const preview = previews?.[item.id];
          const glow = glows?.[item.id];
          const hoverHandlers =
            onHover && !item.used
              ? {
                  onMouseEnter: () => onHover(item.id),
                  onMouseLeave: () => onHover(null),
                  onFocus: () => onHover(item.id),
                  onBlur: () => onHover(null),
                }
              : {};

          return (
            <button
              key={item.id}
              className={`${styles.cell} ${item.used ? styles.used : ''} ${
                selectedId === item.id ? styles.selected : ''
              } ${awaitingSelection && !item.used && selectedId !== item.id ? styles.awaiting : ''}`}
              disabled={item.used}
              onClick={() => onSelect(item.id)}
              style={glow ? { boxShadow: glowShadow(glow) } : undefined}
              {...hoverHandlers}
            >
              {item.value}
              {preview && (
                <span className={styles.preview}>
                  <span className={styles.previewHi}>{preview.highWord}</span>
                  <span className={styles.previewLo}>
                    {String(preview.lowWord).padStart(2, '0')}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
