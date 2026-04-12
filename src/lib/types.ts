export interface Play {
  name: string;
  tag: string;
  desc: string;
  players: Record<string, [number, number]>;
  roster: Record<string, { name: string; pos: string }>;
  ballStart: string;
  phases: Phase[];
}

export interface Phase {
  label: string;
  text: string;
  detail?: string;
  actions: Action[];
}

export interface Action {
  marker: "arrow" | "screen";
  path: string;
  dashed?: boolean;
  move?: { id: string; to: [number, number] };
  ball?: { from: string; to: string };
}
