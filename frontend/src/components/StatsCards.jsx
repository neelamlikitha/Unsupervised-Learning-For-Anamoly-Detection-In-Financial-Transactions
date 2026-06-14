import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

function StatCard({ label, value, accent }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.3)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.9))'
      }}
    >
      <Typography
        variant="overline"
        sx={{ letterSpacing: '0.16em', color: 'rgba(148,163,184,0.9)' }}
      >
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{ mt: 1, fontWeight: 700, color: accent || '#e5e7eb' }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export default function StatsCards({ overview }) {
  if (!overview) return null;

  const {
    total_transactions,
    total_anomalies,
    anomaly_percentage,
    avg_anomalous_amount,
    avg_normal_amount
  } = overview;

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="TOTAL TRANSACTIONS"
          value={total_transactions ?? 0}
          accent="#a5b4fc"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="FLAGGED ANOMALIES"
          value={total_anomalies ?? 0}
          accent="#f97373"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="ANOMALY RATE"
          value={`${anomaly_percentage ?? 0}%`}
          accent="#fbbf24"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="AVG ANOMALY vs NORMAL"
          value={
            avg_anomalous_amount && avg_normal_amount
              ? `${Number(avg_anomalous_amount).toFixed(0)} / ${Number(
                  avg_normal_amount
                ).toFixed(0)}`
              : '-'
          }
          accent="#4ade80"
        />
      </Grid>
    </Grid>
  );
}

