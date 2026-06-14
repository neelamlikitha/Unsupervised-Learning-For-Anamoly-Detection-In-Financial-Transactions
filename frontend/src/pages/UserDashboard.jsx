import React, { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import UserLayout from '../components/UserLayout.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import api from '../api/client.js';
import { useAuth } from '../App.jsx';

const RISK_LEVELS = ['', 'NORMAL', 'SUSPICIOUS', 'HIGH_RISK'];
const PAGE_SIZE = 20;
const PIE_COLORS = { NORMAL: '#22c55e', SUSPICIOUS: '#f59e0b', HIGH_RISK: '#ef4444' };

// ─── small helpers ───────────────────────────────────────────────
function StatCard({ label, value, sub, accent = '#a5b4fc' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.2)',
        background: 'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,64,175,0.5))'
      }}
    >
      <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.8)', letterSpacing: '0.12em', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: accent }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      variant="h5"
      sx={{
        fontWeight: 700,
        mb: 3,
        background: 'linear-gradient(90deg,#e5e7eb,#a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}
    >
      {children}
    </Typography>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
      ))}
    </>
  );
}

// ─── OVERVIEW VIEW ───────────────────────────────────────────────
function OverviewView({ transactions, loading }) {
  const stats = React.useMemo(() => {
    if (!transactions.length) return null;
    const total = transactions.length;
    const anomalies = transactions.filter((t) => t.is_anomaly).length;
    const highRisk = transactions.filter((t) => t.anomaly_level === 'HIGH_RISK').length;
    const totalAmount = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const avgScore = transactions.filter((t) => t.anomaly_score != null)
      .reduce((s, t, _, a) => s + Number(t.anomaly_score) / a.length, 0);
    return { total, anomalies, highRisk, totalAmount, avgScore };
  }, [transactions]);

  const recent = transactions.slice(0, 5);

  return (
    <Box>
      <SectionTitle>Overview</SectionTitle>
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : stats ? (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="TOTAL TRANSACTIONS" value={stats.total} accent="#a5b4fc" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="FLAGGED" value={stats.anomalies}
                sub={`${((stats.anomalies / stats.total) * 100).toFixed(1)}% of total`}
                accent="#f97373" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="HIGH RISK" value={stats.highRisk} accent="#fbbf24" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="TOTAL SPENT"
                value={`₹${stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                accent="#4ade80"
              />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.9)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#e5e7eb' }}>
              Recent transactions
            </Typography>
            <TransactionTable rows={recent} />
          </Paper>
        </>
      ) : (
        <Alert severity="info">No transactions yet. Use Simulate to add your first one.</Alert>
      )}
    </Box>
  );
}

// ─── TRANSACTIONS VIEW ───────────────────────────────────────────
function TransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', riskLevel: '', minAmount: '', maxAmount: '' });

  const load = useCallback(async (p = 0, f = filters) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset: p * PAGE_SIZE });
      if (f.dateFrom)  params.set('dateFrom',   f.dateFrom);
      if (f.dateTo)    params.set('dateTo',     f.dateTo);
      if (f.riskLevel) params.set('riskLevel',  f.riskLevel);
      if (f.minAmount !== '') params.set('minAmount', f.minAmount);
      if (f.maxAmount !== '') params.set('maxAmount', f.maxAmount);
      const res = await api.get(`/transactions?${params}`);
      setTransactions(res.data.data || []);
      setTotal(res.data.total ?? res.data.data?.length ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load.');
    } finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(0, filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => { setPage(0); load(0, filters); };
  const handleClear = () => {
    const empty = { dateFrom: '', dateTo: '', riskLevel: '', minAmount: '', maxAmount: '' };
    setFilters(empty); setPage(0); load(0, empty);
  };
  const fc = (f) => (e) => setFilters((p) => ({ ...p, [f]: e.target.value }));

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <Box>
      <SectionTitle>My Transactions</SectionTitle>

      {/* Filter bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.8)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" alignItems="center">
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={fc('dateFrom')} sx={{ minWidth: 140 }} />
          <TextField size="small" type="date" label="To"   InputLabelProps={{ shrink: true }} value={filters.dateTo}   onChange={fc('dateTo')}   sx={{ minWidth: 140 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Risk level</InputLabel>
            <Select value={filters.riskLevel} label="Risk level" onChange={fc('riskLevel')}>
              {RISK_LEVELS.map((r) => (
                <MenuItem key={r || 'all'} value={r}>{r || 'All levels'}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" type="number" label="Min ₹" value={filters.minAmount} onChange={fc('minAmount')} sx={{ width: 100 }} />
          <TextField size="small" type="number" label="Max ₹" value={filters.maxAmount} onChange={fc('maxAmount')} sx={{ width: 100 }} />
          <Button variant="contained" size="small" onClick={handleApply}>Apply</Button>
          <Button variant="outlined"  size="small" onClick={handleClear} color="inherit">Clear</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <LoadingRows /> : (
        <>
          <TransactionTable rows={transactions} />
          {totalPages > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
              <Button size="small" variant="outlined" disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); load(p); }}>← Prev</Button>
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.8)' }}>Page {page + 1} / {totalPages} ({total} total)</Typography>
              <Button size="small" variant="outlined" disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); load(p); }}>Next →</Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

// ─── ANALYTICS VIEW ──────────────────────────────────────────────
function AnalyticsView({ transactions }) {
  const amountByDate = React.useMemo(() => {
    const m = {};
    transactions.forEach((t) => {
      const d = new Date(t.transacted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!m[d]) m[d] = { date: d, amount: 0, count: 0 };
      m[d].amount += Number(t.amount || 0);
      m[d].count += 1;
    });
    return Object.values(m).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-21);
  }, [transactions]);

  const riskPie = React.useMemo(() => {
    const c = { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 };
    transactions.forEach((t) => { const l = t.anomaly_level || 'NORMAL'; c[l] = (c[l] || 0) + 1; });
    return [
      { name: 'Normal',    value: c.NORMAL,    color: PIE_COLORS.NORMAL },
      { name: 'Suspicious',value: c.SUSPICIOUS, color: PIE_COLORS.SUSPICIOUS },
      { name: 'High Risk', value: c.HIGH_RISK,  color: PIE_COLORS.HIGH_RISK }
    ].filter((d) => d.value > 0);
  }, [transactions]);

  const byCategory = React.useMemo(() => {
    const m = {};
    transactions.forEach((t) => {
      const cat = t.category || 'other';
      if (!m[cat]) m[cat] = { category: cat, total: 0, count: 0 };
      m[cat].total += Number(t.amount || 0);
      m[cat].count += 1;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [transactions]);

  const byChannel = React.useMemo(() => {
    const m = {};
    transactions.forEach((t) => {
      const ch = t.channel || 'unknown';
      if (!m[ch]) m[ch] = { channel: ch, count: 0 };
      m[ch].count += 1;
    });
    return Object.values(m);
  }, [transactions]);

  const chartPaper = (children, title) => (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.9)', height: '100%' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(148,163,184,0.85)', fontWeight: 600 }}>{title}</Typography>
      {children}
    </Paper>
  );

  const tooltipStyle = { contentStyle: { background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8 }, labelStyle: { color: '#e5e7eb' } };

  if (!transactions.length) return <Alert severity="info">No data yet to show analytics.</Alert>;

  return (
    <Box>
      <SectionTitle>Analytics</SectionTitle>
      <Grid container spacing={2.5}>
        {/* Amount over time – area chart */}
        <Grid item xs={12} md={8}>
          {chartPaper(
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={amountByDate}>
                <defs>
                  <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" fill="url(#amtGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>,
            'Amount Spent Over Time'
          )}
        </Grid>

        {/* Risk distribution – pie */}
        <Grid item xs={12} md={4}>
          {chartPaper(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                  {riskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>,
            'Risk Distribution'
          )}
        </Grid>

        {/* Spend by category – bar */}
        <Grid item xs={12} md={7}>
          {chartPaper(
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Total']} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>,
            'Spend by Category'
          )}
        </Grid>

        {/* Transactions by channel – bar */}
        <Grid item xs={12} md={5}>
          {chartPaper(
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={byChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="channel" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>,
            'Transactions by Channel'
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── SIMULATE VIEW ───────────────────────────────────────────────
function SimulateView({ onNewTransaction }) {
  const [form, setForm] = useState({ amount: '', merchant: '', category: 'shopping', channel: 'online', city: 'Hyderabad' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const CATEGORIES = ['shopping', 'food', 'travel', 'entertainment', 'groceries', 'utilities', 'electronics'];
  const CHANNELS   = ['online', 'pos', 'atm', 'upi'];
  const CITIES     = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'];

  const fc = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setResult(null); setLoading(true);
    try {
      const res = await api.post('/transactions/simulate', {
        amount: Number(form.amount),
        merchant: form.merchant || 'Demo Merchant',
        category: form.category,
        channel: form.channel,
        city: form.city,
        country: 'India'
      });
      setResult(res.data.anomaly);
      onNewTransaction?.(res.data.transaction);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simulate.');
    } finally { setLoading(false); }
  };

  const resultColor = result?.level === 'HIGH_RISK' ? '#ef4444' : result?.level === 'SUSPICIOUS' ? '#f59e0b' : '#22c55e';

  return (
    <Box>
      <SectionTitle>Simulate Transaction</SectionTitle>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.9)' }}>
            <Typography variant="body2" sx={{ mb: 2.5, color: 'rgba(148,163,184,0.8)' }}>
              Submit a hypothetical transaction — the Isolation Forest model will score it in real time.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField label="Amount (INR)" type="number" required value={form.amount} onChange={fc('amount')} fullWidth inputProps={{ min: 1 }} />
              <TextField label="Merchant name" value={form.merchant} onChange={fc('merchant')} fullWidth placeholder="e.g. Amazon, Swiggy..." />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category" onChange={fc('category')}>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Channel</InputLabel>
                <Select value={form.channel} label="Channel" onChange={fc('channel')}>
                  {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>City</InputLabel>
                <Select value={form.city} label="City" onChange={fc('city')}>
                  {CITIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1, py: 1.3, fontWeight: 600 }}>
                {loading ? 'Scoring...' : 'Score Transaction'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          {result ? (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${resultColor}55`, background: 'rgba(15,23,42,0.9)' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: resultColor }}>
                Result: {result.level.replace('_', ' ')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'rgba(148,163,184,0.8)' }}>Anomaly Score</Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={result.score * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'rgba(148,163,184,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: resultColor, borderRadius: 5 }
                    }}
                  />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: resultColor, minWidth: 60 }}>
                  {(result.score * 100).toFixed(1)}%
                </Typography>
              </Stack>
              <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', my: 2 }} />
              <Stack spacing={1}>
                {[
                  ['Score (raw)',   result.score.toFixed(4)],
                  ['Risk level',   result.level],
                  ['Interpretation',
                    result.level === 'HIGH_RISK'   ? 'This transaction looks highly anomalous — very different from your spending pattern.' :
                    result.level === 'SUSPICIOUS'  ? 'This transaction is slightly unusual — keep an eye on it.' :
                                                    'This transaction fits your normal spending pattern.']
                ].map(([label, val]) => (
                  <Stack key={label} direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: '#e5e7eb', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{val}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <Stack alignItems="center" spacing={1}>
                <Typography variant="h2">🔍</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.6)', textAlign: 'center' }}>
                  Fill the form and click<br />"Score Transaction" to see the result here.
                </Typography>
              </Stack>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 2.5, mt: 2, borderRadius: 3, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.7)' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'rgba(148,163,184,0.8)', fontWeight: 600 }}>
              Try these examples
            </Typography>
            <Stack spacing={1}>
              {[
                { label: 'Normal grocery', amount: 1200, merchant: 'BigBasket', category: 'groceries', channel: 'online', city: 'Hyderabad', expect: 'NORMAL' },
                { label: 'High-value electronics', amount: 85000, merchant: 'Flipkart', category: 'electronics', channel: 'online', city: 'Mumbai', expect: 'HIGH_RISK' },
                { label: 'Unusual food expense', amount: 18000, merchant: 'Zomato', category: 'food', channel: 'upi', city: 'Delhi', expect: 'SUSPICIOUS' }
              ].map((ex) => (
                <Stack key={ex.label} direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ color: '#e5e7eb' }}>{ex.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>
                      ₹{ex.amount.toLocaleString('en-IN')} · {ex.category} · {ex.channel}
                    </Typography>
                  </Box>
                  <Chip
                    label={ex.expect}
                    size="small"
                    color={ex.expect === 'HIGH_RISK' ? 'error' : ex.expect === 'SUSPICIOUS' ? 'warning' : 'success'}
                    sx={{ fontSize: '0.65rem' }}
                  />
                  <Button size="small" variant="outlined" onClick={() => setForm({ amount: String(ex.amount), merchant: ex.merchant, category: ex.category, channel: ex.channel, city: ex.city })}>
                    Use
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── RISK REPORT VIEW ────────────────────────────────────────────
function RiskReportView({ transactions, loading }) {
  const report = React.useMemo(() => {
    if (!transactions.length) return null;
    const scored = transactions.filter((t) => t.anomaly_score != null);
    const avgScore = scored.length ? scored.reduce((s, t) => s + Number(t.anomaly_score), 0) / scored.length : 0;
    const highRisk = transactions.filter((t) => t.anomaly_level === 'HIGH_RISK');
    const suspicious = transactions.filter((t) => t.anomaly_level === 'SUSPICIOUS');
    const topRisky = [...transactions].filter((t) => t.anomaly_score != null).sort((a, b) => b.anomaly_score - a.anomaly_score).slice(0, 5);
    const overallLevel = avgScore > 0.75 ? 'HIGH_RISK' : avgScore > 0.55 ? 'SUSPICIOUS' : 'NORMAL';
    return { avgScore, highRisk, suspicious, topRisky, overallLevel };
  }, [transactions]);

  const scoreColor = (s) => s > 0.75 ? '#ef4444' : s > 0.55 ? '#f59e0b' : '#22c55e';

  return (
    <Box>
      <SectionTitle>Risk Report</SectionTitle>
      {loading ? <LoadingRows /> : !report ? (
        <Alert severity="info">No transactions yet to generate a report.</Alert>
      ) : (
        <Grid container spacing={2.5}>
          {/* Overall score */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${scoreColor(report.avgScore)}44`, background: 'rgba(15,23,42,0.9)', textAlign: 'center' }}>
              <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.7)', letterSpacing: '0.12em' }}>
                Your Risk Score
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, color: scoreColor(report.avgScore), my: 1 }}>
                {(report.avgScore * 100).toFixed(1)}
              </Typography>
              <Chip
                label={report.overallLevel.replace('_', ' ')}
                color={report.overallLevel === 'HIGH_RISK' ? 'error' : report.overallLevel === 'SUSPICIOUS' ? 'warning' : 'success'}
              />
              <LinearProgress
                variant="determinate"
                value={report.avgScore * 100}
                sx={{
                  mt: 2, height: 8, borderRadius: 5,
                  bgcolor: 'rgba(148,163,184,0.1)',
                  '& .MuiLinearProgress-bar': { bgcolor: scoreColor(report.avgScore), borderRadius: 5 }
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)', mt: 1, display: 'block' }}>
                Average across {transactions.length} transactions
              </Typography>
            </Paper>
          </Grid>

          {/* Summary stats */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <StatCard label="HIGH RISK TXNS"   value={report.highRisk.length}   accent="#ef4444" sub="require attention" />
              </Grid>
              <Grid item xs={6}>
                <StatCard label="SUSPICIOUS TXNS"  value={report.suspicious.length} accent="#f59e0b" sub="worth reviewing" />
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.8)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#e5e7eb', fontWeight: 600 }}>
                    Score Guide
                  </Typography>
                  {[
                    { range: '0 – 55', level: 'NORMAL',    desc: 'Fits your usual spending pattern', color: '#22c55e' },
                    { range: '55 – 75', level: 'SUSPICIOUS', desc: 'Slightly unusual — review recommended', color: '#f59e0b' },
                    { range: '75 – 100', level: 'HIGH RISK',  desc: 'Highly anomalous — immediate attention', color: '#ef4444' }
                  ].map((item) => (
                    <Stack key={item.level} direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: item.color, fontWeight: 600, minWidth: 50 }}>{item.range}</Typography>
                      <Typography variant="caption" sx={{ color: '#e5e7eb', fontWeight: 600, minWidth: 80 }}>{item.level}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>{item.desc}</Typography>
                    </Stack>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Top risky transactions */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.9)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#e5e7eb' }}>
                Top 5 Riskiest Transactions
              </Typography>
              <TransactionTable rows={report.topRisky} />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function UserDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [allTransactions, setAllTransactions] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);

  // Fetch up to 200 transactions for overview / analytics / risk-report
  useEffect(() => {
    api.get('/transactions?limit=200')
      .then((r) => setAllTransactions(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, []);

  const handleNewTransaction = (tx) => {
    setAllTransactions((prev) => [tx, ...prev]);
  };

  const renderView = () => {
    switch (activeView) {
      case 'overview':     return <OverviewView     transactions={allTransactions} loading={loadingAll} />;
      case 'transactions': return <TransactionsView />;
      case 'analytics':    return <AnalyticsView    transactions={allTransactions} />;
      case 'simulate':     return <SimulateView     onNewTransaction={handleNewTransaction} />;
      case 'risk-report':  return <RiskReportView   transactions={allTransactions} loading={loadingAll} />;
      default:             return <OverviewView     transactions={allTransactions} loading={loadingAll} />;
    }
  };

  return (
    <UserLayout active={activeView} onNavigate={setActiveView}>
      {renderView()}
    </UserLayout>
  );
}
