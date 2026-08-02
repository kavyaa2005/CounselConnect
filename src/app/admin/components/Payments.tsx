import { useState } from "react";
import { motion } from "motion/react";
import { DollarSign, TrendingUp, CreditCard, RefreshCw, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData, exportCsv } from "../lib/adminApi";

const statusColors: Record<string, { bg: string; color: string }> = {
  Paid: { bg: "#EAF7EA", color: "#4CAF50" },
  Pending: { bg: "#FFF9E8", color: "#FFC107" },
  Refunded: { bg: "#EBF5FF", color: "#42A5F5" },
  Failed: { bg: "#FEF2F2", color: "#EF5350" },
};

export function Payments(_props?: any) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.payments);
  const [filterStatus, setFilterStatus] = useState("All");

  const transactions: any[] = data?.transactions || [];
  const summary = data?.summary || { totalRevenue: 0, pending: 0, refunded: 0, count: 0, platformFee: 0, payouts: 0 };
  const revenueData: any[] = data?.monthly || [];

  const filtered = transactions.filter(tx => filterStatus === "All" || tx.status === filterStatus);

  const totalRevenue = summary.totalRevenue;
  const totalRefunds = summary.refunded;
  const avgPerSession = summary.count ? Math.round(summary.totalRevenue / summary.count) : 0;

  function handleExport() {
    exportCsv("payments.csv", transactions.map(tx => ({
      Transaction: tx.id, User: tx.user, Counselor: tx.counselor,
      Amount: tx.amount, Method: tx.method, Status: tx.status, Date: tx.date,
    })));
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl shadow-xl border px-4 py-3 text-xs"
        style={{ background: t.card, borderColor: t.border }}>
        <p className="font-semibold mb-1" style={{ color: t.text }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>${Number(p.value).toLocaleString()}</strong>
          </p>
        ))}
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading payments…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load payments</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Payments</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>
            {summary.count} transaction{summary.count === 1 ? "" : "s"} · counselor payouts ${summary.payouts.toLocaleString()} · platform fee ${summary.platformFee.toLocaleString()}
          </p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
          style={{ color: t.textSec, borderColor: t.border, background: t.card }}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, change: `${summary.count} txns`, up: true, icon: DollarSign, color: "#5E8B7E", bg: "#F0F7F5" },
          { label: "Counselor Payouts", value: `$${summary.payouts.toLocaleString()}`, change: "80% share", up: true, icon: TrendingUp, color: "#2D6A4F", bg: "#E8F5ED" },
          { label: "Refunded", value: `$${totalRefunds.toLocaleString()}`, change: "cancelled", up: false, icon: RefreshCw, color: "#42A5F5", bg: "#EBF5FF" },
          { label: "Avg per Session", value: `$${avgPerSession}`, change: "all time", up: true, icon: CreditCard, color: "#D8A48F", bg: "#FDF3EE" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-5 border"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: s.up ? "#4CAF50" : "#EF5350" }}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: t.muted }}>{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl p-5 border"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <h3 className="font-semibold mb-1" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Revenue Trend</h3>
        <p className="text-xs mb-5" style={{ color: t.muted }}>Paid revenue over the last 6 months</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5E8B7E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5E8B7E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false}
              tickFormatter={v => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#5E8B7E" strokeWidth={2.5} fill="url(#revGrad)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Transactions Table */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
          <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Recent Transactions</h3>
          <div className="flex items-center gap-2">
            {["All", "Paid", "Pending", "Refunded"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={filterStatus === s ? {
                  background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                } : { background: t.card2, color: t.textSec }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ background: t.card2, borderColor: t.border }}>
              {["ID", "User", "Counselor", "Amount", "Date", "Method", "Status"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: t.muted }}>
                  No transactions yet — they appear here as soon as sessions are booked.
                </td>
              </tr>
            )}
            {filtered.map((tx: any, i: number) => {
              const sc = statusColors[tx.status] || statusColors.Pending;
              return (
                <motion.tr key={tx.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b transition-colors"
                  style={{ borderColor: t.border }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-5 py-3.5 text-xs font-mono" style={{ color: t.muted }}>{tx.id}</td>
                  <td className="px-5 py-3.5 text-sm font-medium" style={{ color: t.text }}>{tx.user}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{tx.counselor}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: t.text }}>${tx.amount}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{tx.date}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{tx.method}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: sc.bg, color: sc.color }}>
                      {tx.status}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
