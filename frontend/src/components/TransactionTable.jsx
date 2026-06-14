import React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import AnomalyBadge from './AnomalyBadge.jsx';

export default function TransactionTable({
  rows,
  showUserEmail = false,
  showReviewActions = false,
  reviewNotes = {},
  onReviewNotesChange,
  onReview
}) {
  const colSpan = 8 + (showUserEmail ? 1 : 0) + (showReviewActions ? 1 : 0);

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        backgroundColor: 'rgba(15,23,42,0.8)',
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.3)'
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {showUserEmail && <TableCell sx={{ color: '#e5e7eb' }}>User</TableCell>}
            <TableCell sx={{ color: '#e5e7eb' }}>Merchant</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>Category</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }} align="right">
              Amount (INR)
            </TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>Channel</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>City</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>When</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>Anomaly</TableCell>
            <TableCell sx={{ color: '#e5e7eb' }} align="right">
              Score
            </TableCell>
            {showReviewActions && (
              <TableCell sx={{ color: '#e5e7eb' }}>Review</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                  No transactions yet.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                '&:nth-of-type(odd)': { backgroundColor: 'rgba(15,23,42,0.6)' },
                '&:hover': { backgroundColor: 'rgba(30,64,175,0.4)' }
              }}
            >
              {showUserEmail && (
                <TableCell sx={{ color: '#e5e7eb' }}>{row.user_email}</TableCell>
              )}
              <TableCell sx={{ color: '#e5e7eb' }}>{row.merchant}</TableCell>
              <TableCell sx={{ color: '#e5e7eb' }}>{row.category}</TableCell>
              <TableCell sx={{ color: '#e5e7eb' }} align="right">
                {Number(row.amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </TableCell>
              <TableCell sx={{ color: '#e5e7eb' }}>{row.channel}</TableCell>
              <TableCell sx={{ color: '#e5e7eb' }}>{row.city}</TableCell>
              <TableCell sx={{ color: '#e5e7eb' }}>
                {new Date(row.transacted_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <AnomalyBadge level={row.anomaly_level} />
              </TableCell>
              <TableCell sx={{ color: '#e5e7eb' }} align="right">
                {row.anomaly_score != null
                  ? Number(row.anomaly_score).toFixed(3)
                  : '-'}
              </TableCell>
              {showReviewActions && onReview && (
                <TableCell sx={{ color: '#e5e7eb' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.9)', display: 'block', mb: 0.5 }}>
                    {row.admin_review_status || 'pending'}
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Notes"
                    value={reviewNotes[row.id] ?? row.admin_notes ?? ''}
                    onChange={(e) => onReviewNotesChange?.(row.id, e.target.value)}
                    sx={{ '& .MuiInputBase-input': { color: '#e5e7eb', fontSize: '0.75rem' }, width: '100%', maxWidth: 120 }}
                  />
                  <ButtonGroup size="small" sx={{ mt: 0.5 }}>
                    <Button
                      color="error"
                      onClick={() => onReview(row.id, 'confirmed_fraud', reviewNotes[row.id] ?? row.admin_notes ?? '')}
                    >
                      Fraud
                    </Button>
                    <Button
                      color="success"
                      onClick={() => onReview(row.id, 'rejected', reviewNotes[row.id] ?? row.admin_notes ?? '')}
                    >
                      Reject
                    </Button>
                  </ButtonGroup>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

