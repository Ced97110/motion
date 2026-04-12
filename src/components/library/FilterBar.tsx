"use client";

// Copyright: Your Name. Apache 2.0

interface FilterBarProps {
  types: string[];
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  search: string;
  onSearchChange: (val: string) => void;
  totalCount: number;
  filteredCount: number;
}

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

const toggleButtonBase: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  padding: "6px 12px",
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 0,
  outline: "none",
  transition: "background 0.15s, color 0.15s",
};

const activeStyle: React.CSSProperties = {
  ...toggleButtonBase,
  background: "#f97316",
  color: "#fff",
  borderColor: "#f97316",
};

const inactiveStyle: React.CSSProperties = {
  ...toggleButtonBase,
  background: "transparent",
  color: "#a1a1aa",
};

function collapseLeftBorder(index: number): React.CSSProperties {
  if (index === 0) return {};
  return { marginLeft: "-1px" };
}

function ToggleGroup<T extends string | null>({
  items,
  active,
  onChange,
}: {
  readonly items: readonly { readonly label: string; readonly value: T }[];
  readonly active: T;
  readonly onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: "flex" }}>
      {items.map((item, i) => {
        const isActive = active === item.value;
        return (
          <button
            key={item.label}
            type="button"
            style={{
              ...(isActive ? activeStyle : inactiveStyle),
              ...collapseLeftBorder(i),
              position: "relative",
              zIndex: isActive ? 1 : 0,
            }}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar({
  types,
  activeType,
  onTypeChange,
  categories,
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const typeItems = [
    { label: "ALL", value: null as string | null },
    ...types.map((t) => ({ label: t.toUpperCase(), value: t })),
  ];

  const categoryItems = [
    { label: "ALL", value: null as string | null },
    ...categories.map((c) => ({ label: c.toUpperCase(), value: c })),
  ];

  const showCategories =
    activeType === null || activeType.toLowerCase() === "play";

  return (
    <div style={{ fontFamily: FONT_FAMILY }}>
      {/* Row 1: Search + Result Count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search plays, drills, concepts..."
          style={{
            width: "100%",
            maxWidth: "300px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.22)",
            color: "#fafafa",
            fontFamily: "inherit",
            fontSize: "12px",
            padding: "6px 10px",
            borderRadius: 0,
            outline: "none",
          }}
        />
        <span
          style={{
            fontSize: "10px",
            color: "#63636e",
            whiteSpace: "nowrap",
            marginLeft: "16px",
          }}
        >
          {filteredCount} / {totalCount} results
        </span>
      </div>

      {/* Row 2: Type + Category toggle groups */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <ToggleGroup
          items={typeItems}
          active={activeType}
          onChange={onTypeChange}
        />
        {showCategories && categories.length > 0 && (
          <ToggleGroup
            items={categoryItems}
            active={activeCategory}
            onChange={onCategoryChange}
          />
        )}
      </div>
    </div>
  );
}
