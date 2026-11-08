## Unsupervised Anomaly Detection in Financial Transactions

This is a **full‑stack data science project** that detects suspicious financial transactions using **Unsupervised Learning (Isolation Forest)**.

- **Frontend**: React + Vite + Material UI  
- **Backend**: Node.js + Express  
- **Database**: PostgreSQL  
- **ML**: `ml-isolation-forest` (JavaScript implementation of Isolation Forest)  

There are **two portals**:
- **User Portal** – view own transactions, see anomaly flags and risk scores.
- **Admin Portal** – monitor global stats, review flagged transactions, and manage users.

---
### 1. Project Structure

```text
Batch-5/
  backend/
    src/
      config/
        database.js
        env.js
      middleware/
        auth.js
      models/
        userModel.js
        transactionModel.js
      ml/
        isolationForestService.js
      routes/
        authRoutes.js
        transactionRoutes.js
        adminRoutes.js
      scripts/
        generateDataset.js
        trainIsolationForest.js
      server.js
    package.json

  frontend/
    index.html
    vite.config.js
    package.json
    src/
      main.jsx
      App.jsx
      api/
        client.js
      pages/
        LoginPage.jsx
        RegisterPage.jsx
        UserDashboard.jsx
        AdminDashboard.jsx
      components/
        Layout.jsx
        TransactionTable.jsx
        AnomalyBadge.jsx
        StatsCards.jsx

  db/
    schema.sql
```

---

### 2. Tech Stack & Design Choices

- **Unsupervised Learning**: Isolation Forest (no labels needed; good for evolving fraud patterns).
- **Backend**:
  - Express REST API.
  - JWT authentication (login/register).
  - Role‑based access (`user`, `admin`).
  - Endpoints for transactions, anomaly scores, and admin dashboards.
- **Database (PostgreSQL)**:
  - `users` – auth + roles.
  - `transactions` – financial transaction data + anomaly score + is_anomaly flag.
- **Frontend**:
  - React + React Router for SPA navigation.
  - Material UI for a **modern, responsive, dashboard‑style UI**.
  - Separate views for **User** and **Admin** portals.

---
### 3. Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **PostgreSQL** running locally (or remote instance you control)

---

### 4. Database Setup (PostgreSQL)

1. Create a database in PostgreSQL (for example):

```sql
CREATE DATABASE anomaly_detection_db;
```

2. Open `db/schema.sql` and execute the full script in your PostgreSQL client (pgAdmin, psql, DBeaver, etc.).

3. Note your DB connection values:
   - `PG_HOST`
   - `PG_PORT`
   - `PG_USER`
   - `PG_PASSWORD`
   - `PG_DATABASE`

You will place these in the backend `.env` file.

---

### 5. Backend – Setup & Running

1. Go to the backend folder and install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/`:

```bash
cp .env.example .env   # or create manually
```

Fill it with your values:

```env
PORT=4000
JWT_SECRET=super_secret_jwt_key_change_me

PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=anomaly_detection_db

ANOMALY_THRESHOLD_SUSPICIOUS=0.55
ANOMALY_THRESHOLD_HIGH_RISK=0.75
ANOMALY_HIGH_VALUE_ELECTRONICS_MIN_AMOUNT=50000
RETRAIN_CRON=0 2 * * *
```

`ANOMALY_HIGH_VALUE_ELECTRONICS_MIN_AMOUNT` is in INR; electronics transactions at or above this amount are classified as `HIGH_RISK`.

3. Generate synthetic dataset (>= 15000 rows) and insert into DB:

```bash
npm run generate:data
```

This will:
- Create a synthetic CSV of financial transactions.
- Insert them into the `transactions` table.

4. Train Isolation Forest model:

```bash
npm run train:model
```

This will:
- Read transactions from the database.
- Train an Isolation Forest model on numerical features.
- Save the trained model to `backend/src/ml/model.json`.

5. Start the backend server:

```bash
npm run dev
```

The API will be running on `http://localhost:4000`.

---

### 6. Frontend – Setup & Running

1. Go to the frontend folder and install dependencies:

```bash
cd frontend
npm install
```

2. Start the React dev server:

```bash
npm run dev
```

By default, the app runs on `http://localhost:5173` (Vite default).  
The frontend is configured to call the backend at `http://localhost:4000`.

---

### 7. Main Features & Flow

- **Authentication**
  - **Register**: `/api/auth/register` – create a user (default role: `user`).
  - **Login**: `/api/auth/login` – returns a JWT token.
  - The frontend stores the token (e.g., in memory or localStorage) and sends it in the `Authorization: Bearer <token>` header.

- **User Portal**
  - View own transaction history.
  - Each transaction shows:
    - Amount, timestamp, merchant, location, category.
    - **Anomaly score** and an **Anomaly badge** (Normal / Suspicious / High Risk).
  - Filter/sort by risk level, amount, date.

- **Admin Portal**
  - View global statistics cards:
    - Total transactions
    - Number of anomalies
    - Percentage of anomalies
    - Average amount of anomalous vs normal transactions
  - View table of **flagged transactions** (is_anomaly = true).
  - Search by user, date range, amount, and risk level.

---

### 8. APIs (High‑Level)

- **Auth**
  - `POST /api/auth/register`
  - `POST /api/auth/login`

- **User Transactions**
  - `GET /api/transactions` – list authenticated user’s transactions.
  - `GET /api/transactions/:id` – details for a single transaction.

- **Anomaly Detection**
  - `POST /api/transactions/simulate` – send a new transaction payload; backend runs model and returns anomaly score + flag.

- **Admin**
  - `GET /api/admin/overview` – high‑level stats.
  - `GET /api/admin/transactions` – paginated list of transactions (with filters).

---

### 9. Hybrid Anomaly Scoring

The backend keeps **Isolation Forest** as the primary unsupervised model:

1. The backend trains an in-memory model at startup and replaces it on the configured `RETRAIN_CRON` schedule; each simulation request scores against the active model without retraining it.
2. The model uses amount, time of day, recent 24-hour amount/count, and category. Time and recent-activity features can differ between otherwise identical form entries.
3. The raw Isolation Forest score is returned separately from the final risk classification. Scores `<= 0.55` are `NORMAL`, scores `> 0.55` and `<= 0.75` are `SUSPICIOUS`, and scores `> 0.75` are `HIGH_RISK` by default. These thresholds can be configured with `ANOMALY_THRESHOLD_SUSPICIOUS` and `ANOMALY_THRESHOLD_HIGH_RISK`.
4. As a documented business rule, a category of `electronics` (case-insensitive) with an amount greater than or equal to `ANOMALY_HIGH_VALUE_ELECTRONICS_MIN_AMOUNT` is classified as `HIGH_RISK`. The default threshold is INR 50,000. The response identifies whether the classification came from ML, the business rule, or both; the rule does not alter the raw ML score.
5. Transactions outside that business rule use the active model. A model requires at least 10 training samples; before one has been successfully activated, normal transactions remain `INSUFFICIENT_HISTORY`, never silently `NORMAL`. A matching electronics rule can still classify a transaction without an ML score.

The scheduled job builds and validates a candidate before publishing it, and retains the prior model if training or score persistence fails. The installed `ml-isolation-forest` package does not expose a seed or model serialization API: predictions are repeatable for identical feature vectors against one active model version, but retraining (including after a restart) can produce a different model and score.

The “Try these examples” labels are expected outcomes for guidance only; the backend calculates and returns the actual classification.

Run backend automated tests with `cd backend && npm test`.

---

### 10. What You Can Customize

- Feature engineering for the model (additional transaction features).
- Thresholds for anomaly categories.
- UI theme, color palette, and layout (Material UI theme).
- Extra admin tools (e.g., confirming fraud / not‑fraud, exporting reports).

---

### 11. Next Steps

- Implement more advanced feature engineering for better anomaly quality.
- Add background retraining jobs (e.g., periodic retraining with latest data).
- Add audit logs and alerting (email / SMS) for high‑risk anomalies.

This README gives you everything needed to **run the full project** and to explain it as a **data science + full‑stack** solution based on **Unsupervised Learning (Isolation Forest)** for financial fraud detection.
