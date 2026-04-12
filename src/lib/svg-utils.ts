const ns = "http://www.w3.org/2000/svg";

function makePath(d: string) {
  if (typeof document === "undefined") return null;
  const s = document.createElementNS(ns, "svg");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", d);
  s.appendChild(p);
  document.body.appendChild(s);
  return {
    el: p,
    svg: s,
    len: p.getTotalLength(),
    remove: () => document.body.removeChild(s),
  };
}

export function calcLen(d: string): number {
  const p = makePath(d);
  if (!p) return 50;
  const l = p.len;
  p.remove();
  return l;
}

export function pointAt(d: string, t: number): [number, number] | null {
  const p = makePath(d);
  if (!p) return null;
  const pt = p.el.getPointAtLength(p.len * Math.max(0, Math.min(1, t)));
  p.remove();
  return [pt.x, pt.y];
}

export function pointAtLen(d: string, len: number): [number, number] | null {
  const p = makePath(d);
  if (!p) return null;
  const pt = p.el.getPointAtLength(Math.max(0, Math.min(p.len, len)));
  p.remove();
  return [pt.x, pt.y];
}
