// Copyright: Your Name. Apache 2.0

import {
  ACCENT,
  BG_CONTROL_ACTIVE,
  BORDER_STRONG,
  FONT_MONO,
  TEXT_INVERTED,
  TEXT_MUTED,
} from "@/lib/design-tokens";

export interface ObservationChipProps {
  id: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onToggle?: (id: string) => void;
}

export function ObservationChip({
  id,
  label,
  active = false,
  disabled = false,
  onToggle,
}: ObservationChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle?.(id)}
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: 0.5,
        padding: "10px 14px",
        border: `1px solid ${active ? BG_CONTROL_ACTIVE : BORDER_STRONG}`,
        background: active ? BG_CONTROL_ACTIVE : "transparent",
        color: active ? TEXT_INVERTED : TEXT_MUTED,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textTransform: "uppercase",
        borderRadius: 0,
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export interface ChipGridProps {
  chips: Array<{ id: string; label: string }>;
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  /** Max concurrent selections — chips are disabled once the cap is hit. */
  maxActive?: number;
}

export function ChipGrid({
  chips,
  activeIds,
  onToggle,
  maxActive,
}: ChipGridProps) {
  const capped = maxActive !== undefined && activeIds.size >= maxActive;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        fontFamily: FONT_MONO,
        color: ACCENT,
      }}
    >
      {chips.map((c) => {
        const active = activeIds.has(c.id);
        return (
          <ObservationChip
            key={c.id}
            id={c.id}
            label={c.label}
            active={active}
            disabled={capped && !active}
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}
