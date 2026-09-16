import styles from './Pool.module.css';

// Stacked 3px rings, one per color, plus a soft glow in the first color.
function glowShadow(colors) {
  const rings = colors.map((color, i) => `0 0 0 ${(i + 1) * 3}px ${color}`);
  return [...rings, `0 0 ${colors.length * 3 + 12}px ${colors[0]}`].join(', ');
}

// previews (id -> product) and glows (id -> colors) are optional overlays used
// by the playtest settings; onHover reports the hovered or focused open tile.
// targetable (tile -> bool), when set, means an item is choosing a tile: only
// matching tiles (used or not) can be clicked.
export default function Pool({
  label,
  pool,
  selectedId,
  onSelect,
  awaitingSelection,
  onHover,
  previews,
  glows,
  targetable,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.grid}>
        {pool.map((item) => {
          const preview = previews?.[item.id];
          const glow = glows?.[item.id];
          const canTarget = targetable ? targetable(item) : false;
          const disabled = targetable ? !canTarget : item.used;
          const hoverHandlers =
            onHover && !item.used && !targetable
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
              } ${awaitingSelection && !item.used && selectedId !== item.id ? styles.awaiting : ''} ${
                canTarget ? styles.targetable : ''
              }`}
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              style={glow && !targetable ? { boxShadow: glowShadow(glow) } : undefined}
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
