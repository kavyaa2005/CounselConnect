// One place that decides how money is written down on screen.
//
// The symbol used to be typed literally as '$' in a dozen components. Once
// payments went through a real gateway — which charges in rupees — checkout
// said ₹80 while the dashboards, reports and tables said $80 for the very same
// session. Same number, two currencies, and nothing on screen to say which was
// true. The server is now the only thing that decides, and every screen asks it.

import { useEffect, useState } from 'react';
import { api } from './api';

const CACHE_KEY = 'cc_currency_symbol';

/**
 * Seeded from the last known answer so the first paint is already correct.
 * Without this every page rendered '$' for a moment and then flipped to '₹' —
 * brief, but it is the wrong number on screen, and on a slow connection it is
 * not brief at all.
 */
let symbol = (() => {
  try { return localStorage.getItem(CACHE_KEY) || '$'; } catch { return '$'; }
})();
let loaded = false;
let inflight: Promise<string> | null = null;
const listeners = new Set<(s: string) => void>();

/** Asks the server once; every later caller reuses the answer. */
export function loadCurrency(): Promise<string> {
  if (loaded) return Promise.resolve(symbol);
  if (inflight) return inflight;

  inflight = api.get('/billing/config')
    .then((r: any) => {
      symbol = r?.data?.symbol || '$';
      loaded = true;
      try { localStorage.setItem(CACHE_KEY, symbol); } catch { /* private mode */ }
      listeners.forEach(fn => fn(symbol));
      return symbol;
    })
    .catch(() => symbol)          // offline or logged out — keep the default
    .finally(() => { inflight = null; });

  return inflight;
}

/** The symbol as currently known. Safe to call before the fetch resolves. */
export const currencySymbol = () => symbol;

/** `80` → `₹80`. Whole numbers stay whole; decimals keep two places. */
export function money(amount: any, sym = symbol): string {
  const n = Number(amount || 0);
  const body = Number.isInteger(n)
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym}${body}`;
}

/**
 * Component hook. Returns a formatter that re-renders the component once the
 * real symbol arrives, so a screen never settles on the wrong currency.
 */
export function useMoney() {
  const [sym, setSym] = useState(symbol);

  useEffect(() => {
    let alive = true;
    const update = (s: string) => { if (alive) setSym(s); };
    listeners.add(update);
    loadCurrency().then(update);
    return () => { alive = false; listeners.delete(update); };
  }, []);

  return {
    symbol: sym,
    money: (amount: any) => money(amount, sym),
  };
}
