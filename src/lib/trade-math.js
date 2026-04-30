export function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeSignedPnl(status, pnlValue) {
  const pnl = toFiniteNumber(pnlValue, 0);
  if (status === 'loss') return -Math.abs(pnl);
  if (status === 'win') return Math.abs(pnl);
  return pnl;
}

export function normalizeSignedPnlPct(status, pnlPctValue) {
  const pnlPct = toFiniteNumber(pnlPctValue, 0);
  if (status === 'loss') return -Math.abs(pnlPct);
  if (status === 'win') return Math.abs(pnlPct);
  return pnlPct;
}

export function isResolvedTrade(status) {
  return status === 'win' || status === 'loss' || status === 'breakeven';
}
