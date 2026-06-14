import React from 'react';
import Chip from '@mui/material/Chip';

export default function AnomalyBadge({ level }) {
  if (!level) {
    return <Chip label="Unknown" size="small" />;
  }

  const normalized = String(level).toUpperCase();

  if (normalized === 'HIGH_RISK') {
    return (
      <Chip
        label="High Risk"
        color="error"
        size="small"
        variant="filled"
      />
    );
  }

  if (normalized === 'SUSPICIOUS') {
    return (
      <Chip
        label="Suspicious"
        color="warning"
        size="small"
        variant="filled"
      />
    );
  }

  return (
    <Chip
      label="Normal"
      color="success"
      size="small"
      variant="outlined"
    />
  );
}

