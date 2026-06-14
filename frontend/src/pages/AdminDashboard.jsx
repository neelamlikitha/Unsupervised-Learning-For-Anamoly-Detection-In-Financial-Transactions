import React, { useEffect, useState, useCallback, useRef } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout.jsx';
import StatsCards from '../components/StatsCards.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import api from '../api/client.js';

const RISK_LEVELS = ['', 'NORMAL', 'SUSPICIOUS', 'HIGH_RISK'];
const RISK_COLORS = { NORMAL: 'success', SUSPICIOUS: 'warning', HIGH_RISK: 'error' };
const PAGE_SIZE = 50;
const DEBOUNCE_MS = 600;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [page, setPage] = useState(0);
  const [reviewNotes, setReviewNotes] = useState({});

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    riskLevel: '',
    userId: ''
  });

  // Debounce only text inputs (date & userId) — selects/switch are instant
  const debouncedDateFrom = useDebounce(filters.dateFrom, DEBOUNCE_MS);
  const debouncedDateTo   = useDebounce(filters.dateTo,   DEBOUNCE_MS);
  const debouncedUserId   = useDebounce(filters.userId,   DEBOUNCE_MS);

  const fetchData = useCallback(async (opts) => {
    const { anomaliesOnly, pageOffset, dateFrom, dateTo, riskLevel, userId } = opts;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: String(pageOffset * PAGE_SIZE),
        onlyAnomalies: anomaliesOnly ? 'true' : 'false'
      });
      if (dateFrom)   params.set('dateFrom',   dateFrom);
      if (dateTo)     params.set('dateTo',     dateTo);
      if (riskLevel)  params.set('riskLevel',  riskLevel);
      if (userId)     params.set('userId',     userId);

      const [overviewRes, txRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get(`/admin/transactions?${params}`)
      ]);
      setOverview(overviewRes.data);
      setRows(txRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs whenever any filter / page changes (debounced for text fields)
  useEffect(() => {
    fetchData({
      anomaliesOnly: onlyAnomalies,
      pageOffset: page,
      dateFrom:   debouncedDateFrom,
      dateTo:     debouncedDateTo,
      riskLevel:  filters.riskLevel,
      userId:     debouncedUserId
    });
  }, [onlyAnomalies, page, debouncedDateFrom, debouncedDateTo, filters.riskLevel, debouncedUserId, fetchData]);

  // Reset page to 0 whenever any filter changes (not page itself)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setPage(0);
  }, [onlyAnomalies, debouncedDateFrom, debouncedDateTo, filters.riskLevel, debouncedUserId]);

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', riskLevel: '', userId: '' });
    setOnlyAnomalies(false);
    setPage(0);
  };

  const handleExport = () => {
    const params = new URLSearchParams({ onlyAnomalies: onlyAnomalies ? 'true' : 'false' });
    if (filters.dateFrom)  params.set('dateFrom',  filters.dateFrom);
    if (filters.dateTo)    params.set('dateTo',    filters.dateTo);
    if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
    if (filters.userId)    params.set('userId',    filters.userId);
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    const token = window.localStorage.getItem('token');
    const url = `${base}/admin/transactions/export?${params}&_token=${token}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions_export.csv';
    a.click();
  };

  const handleReview = async (txId, status, notes) => {
    try {
      const res = await api.patch(`/admin/transactions/${txId}/review`, { status, notes });
      setRows((prev) => prev.map((r) => (r.id === txId ? { ...r, ...res.data } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Review failed.');
    }
  };

  const barData = React.useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      const level = r.anomaly_level || 'NORMAL';
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const activeFilterCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.riskLevel,
    filters.userId,
    !onlyAnomalies ? 'all' : ''
  ].filter(Boolean).length;

  return (
    <Layout title="Fraud Operations Command Center">
      <StatsCards overview={overview} />

      {barData.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(15,23,42,0.9)'
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(148,163,184,0.9)' }}>
            Risk level distribution (current results)
          </Typography>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.3)' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ color: 'rgba(148,163,184,0.9)' }}>
              Transaction feed
            </Typography>
            {loading && (
              <Typography variant="caption" sx={{ color: '#4f46e5' }}>
                Loading...
              </Typography>
            )}
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                size="small"
                color="primary"
                onDelete={handleClearFilters}
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Stack>

          {/* ── Filter bar ── */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 2,
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(15,23,42,0.7)'
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              flexWrap="wrap"
              alignItems="center"
            >
              {/* Anomalies only toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={onlyAnomalies}
                    onChange={(e) => setOnlyAnomalies(e.target.checked)}
                    color="secondary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                    Anomalies only
                  </Typography>
                }
              />

              {/* Date From */}
              <TextField
                size="small"
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={filters.dateFrom}
                onChange={handleFilterChange('dateFrom')}
                sx={{ minWidth: 140 }}
              />

              {/* Date To */}
              <TextField
                size="small"
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={filters.dateTo}
                onChange={handleFilterChange('dateTo')}
                sx={{ minWidth: 140 }}
              />

              {/* Risk level — instant trigger */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Risk level</InputLabel>
                <Select
                  value={filters.riskLevel}
                  label="Risk level"
                  onChange={(e) => setFilters((p) => ({ ...p, riskLevel: e.target.value }))}
                >
                  {RISK_LEVELS.map((r) => (
                    <MenuItem key={r || 'all'} value={r}>
                      {r ? (
                        <Chip
                          label={r}
                          size="small"
                          color={RISK_COLORS[r] || 'default'}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ) : 'All levels'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* User ID search */}
              <TextField
                size="small"
                label="User email / ID"
                value={filters.userId}
                onChange={handleFilterChange('userId')}
                placeholder="paste UUID or email..."
                sx={{ minWidth: 180 }}
              />

              {/* Clear button — only when filters active */}
              {activeFilterCount > 0 && (
                <Button size="small" variant="outlined" color="inherit" onClick={handleClearFilters}>
                  Clear all
                </Button>
              )}

              <Button size="small" variant="outlined" color="secondary" onClick={handleExport} sx={{ ml: 'auto' }}>
                Export CSV
              </Button>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <>
              <Skeleton variant="rectangular" height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 0.5, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
            </>
          ) : (
            <>
              <TransactionTable
                rows={rows}
                showUserEmail
                showReviewActions
                reviewNotes={reviewNotes}
                onReviewNotesChange={(id, v) => setReviewNotes((p) => ({ ...p, [id]: v }))}
                onReview={handleReview}
              />

              {/* Pagination */}
              {(rows.length === PAGE_SIZE || page > 0) && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </Button>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                    Page {page + 1}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={rows.length < PAGE_SIZE}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </Layout>
  );
}
