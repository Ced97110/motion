"use client";

interface PhaseTabsProps {
  phases: Array<{ label: string }>;
  activeIndex: number;
  onSelect: (index: number) => void;
  disabled: boolean;
}

export default function PhaseTabs({ phases, activeIndex, onSelect, disabled }: PhaseTabsProps) {
  return (
    <div style={{ display: "flex", marginBottom: 8 }}>
      {phases.map((phase, i) => {
        const isActive = i === activeIndex;
        const isLast = i === phases.length - 1;

        return (
          <button
            key={i}
            onClick={() => !disabled && onSelect(i)}
            disabled={disabled}
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.5px",
              padding: "6px 16px",
              border: isActive ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.22)",
              borderRight: isLast
                ? isActive
                  ? "1px solid #f97316"
                  : "1px solid rgba(255,255,255,0.22)"
                : "none",
              borderRadius: 0,
              background: isActive ? "#f97316" : "transparent",
              color: isActive ? "#ffffff" : "#a1a1aa",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {phase.label}
          </button>
        );
      })}
    </div>
  );
}
