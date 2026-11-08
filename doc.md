## Simulate Transaction – User Guide

The simulation form accepts an amount, merchant, category, channel, and city. Merchant, channel, and city are saved as transaction details; Isolation Forest features are amount, time of day, recent 24-hour amount/count, and category.

### Risk scoring

- The backend scores each transaction with its active Isolation Forest model. It trains the model at startup and replaces it on the scheduled retraining interval; individual simulation requests do not retrain it.
- The raw model score and final risk level are separate. Default thresholds are `<= 0.55` for `NORMAL`, `> 0.55` through `0.75` for `SUSPICIOUS`, and `> 0.75` for `HIGH_RISK`. Configure them with `ANOMALY_THRESHOLD_SUSPICIOUS` and `ANOMALY_THRESHOLD_HIGH_RISK`.
- A configured business rule classifies any `electronics` transaction with an amount at or above `ANOMALY_HIGH_VALUE_ELECTRONICS_MIN_AMOUNT` as `HIGH_RISK`. The default is INR 50,000. Category matching ignores surrounding whitespace and case. This rule applies to every matching transaction, not just examples.
- `ANOMALY_HIGH_VALUE_ELECTRONICS_MIN_AMOUNT` must be a non-negative INR amount. A model requires at least 10 training samples. If no model has been activated, an ordinary transaction remains `INSUFFICIENT_HISTORY`; it is not reported as `NORMAL`. The electronics rule can still classify a matching transaction without an ML score.
- The API response explains whether the result came from ML, the business rule, or both. The example cards' labels are expectations for guidance only; clicking “Use” only fills the form and does not control the backend result.
- Equal feature vectors scored by the same active model version produce the same score. Time and recent-activity features may change between submissions, and a retrained model can differ. The installed Isolation Forest package does not provide deterministic seeding or model persistence.

### Example values

Merchant examples: Amazon, Flipkart, Myntra, BigBasket, Swiggy, Zomato, Uber, Ola, MakeMyTrip, BookMyShow, Paytm Mall, Ajio.

Categories: `shopping`, `food`, `travel`, `entertainment`, `groceries`, `utilities`, `electronics`.

Channels: `online`, `pos`, `atm`, `upi`.

High-value electronics example (expected to match the configurable rule at the default):

| Field | Value |
|---|---|
| Amount | 85000 |
| Merchant | Flipkart |
| Category | electronics |
| Channel | online |

Other example labels (such as “Normal grocery” and “Unusual food expense”) are not guaranteed outcomes. The backend's active model determines their actual classification.
