<p align="center">
  <img src="assets/banner_main.svg" alt="Unsupervised Anomaly Detection in Financial Transactions" width="100%"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ML-Isolation%20Forest-1D9E75?style=for-the-badge" alt="ML"/>
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Auth-JWT-black?style=for-the-badge" alt="JWT"/>
</p>

---

# 🔍 Unsupervised Anomaly Detection in Financial Transactions

A **full-stack data science project** that detects suspicious financial transactions using **Unsupervised Learning (Isolation Forest)**. No labeled fraud data required — the model learns what "normal" looks like and flags deviations automatically.

---

## 📐 Architecture

<p align="center">
  <img src="assets/architecture_diagram.svg" alt="Autoencoder Pipeline Architecture" width="100%"/>
</p>

The system uses **Isolation Forest** as the core anomaly detection algorithm, combined with a React frontend, Express REST API, and PostgreSQL database. Transactions are scored in real-time and classified into risk tiers.

---

## 🗂️ Project Structure

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

  assets/
    banner_main.svg
    architecture_diagram.svg
    clustering_visualization.svg
```

---

## ⚙️ Tech Stack & Design Choices

| Layer | Technology | Reason |
|---|---|---|
| ML Model | Isolation Forest | No labels needed; robust to evolving fraud patterns |
| Backend | Node.js + Express | Lightweight REST API with JWT auth |
| Database | PostgreSQL | Reliable storage for transactions + anomaly scores |
| Frontend | React + Vite + Material UI | Fast SPA with responsive dashboard UI |
| Auth | JWT (Role-based) | Separate `user` and `admin` access levels |

---

## 🔮 Anomaly Clustering — Latent Feature Space

<p align="center">
  <img src="assets/clustering_visualization.svg" alt="Transaction Clusters in 2D Feature Space" width="100%"/>
</p>

Transactions are projected into a 2D feature space. **Teal clusters** represent normal low-value transactions, **purple clusters** represent normal high-value transactions, and **red/amber points** are flagged anomalies isolated by the model.

---

## 🛠️ Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **PostgreSQL** running locally (or a remote instance you control)

---

## 🗄️ Database Setup (PostgreSQL)

**1. Create the database:**

```sql
CREATE DATABASE anomaly_detection_db;
```

**2. Run the schema script:**

Open `db/schema.sql` and execute it in your PostgreSQL client (pgAdmin, psql, DBeaver, etc.).

**3. Note your connection values** — you'll need these for the `.env` file:

| Variable | Example |
|---|---|
| `PG_HOST` | `localhost` |
| `PG_PORT` | `5432` |
| `PG_USER` | `postgres` |
| `PG_PASSWORD` | `your_password` |
| `PG_DATABASE` | `anomaly_detection_db` |

---

## 🚀 Backend — Setup & Running

**1. Install dependencies:**

```bash
cd backend
npm install
```

**2. Create your `.env` file:**

```bash
cp .env.example .env   # or create manually
```

```env
PORT=4000
JWT_SECRET=super_secret_jwt_key_change_me

PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=anomaly_detection_db
```

**3. Generate synthetic dataset (≥ 15,000 rows):**

```bash
npm run generate:data
```

This creates a synthetic CSV of financial transactions and inserts them into the `transactions` table.

**4. Train the Isolation Forest model:**

```bash
npm run train:model
```

This reads transactions from the database, trains the model on numerical features, and saves it to `backend/src/ml/model.json`.

**5. Start the backend server:**

```bash
npm run dev
```

API running at → `http://localhost:4000`

---

## 💻 Frontend — Setup & Running

**1. Install dependencies:**

```bash
cd frontend
npm install
```

**2. Start the React dev server:**

```bash
npm run dev
```

App running at → `http://localhost:5173`  
The frontend is pre-configured to call the backend at `http://localhost:4000`.

---

## 🧠 Isolation Forest Logic

The model works in 4 steps:

```
1. Feature Selection
   ├── amount
   ├── time_of_day  (0–23)
   └── transaction_frequency  (count in last 24h)

2. Unsupervised Training
   └── Isolation Forest learns the "normal" distribution — no labels needed

3. Anomaly Scoring
   ├── Score → 1.0   =  likely anomaly
   └── Score → 0.0   =  likely normal

4. Risk Classification
   ├── score < 0.55            →  ✅ NORMAL
   ├── 0.55 ≤ score ≤ 0.75   →  ⚠️ SUSPICIOUS
   └── score > 0.75            →  🚨 HIGH_RISK
```

Scores and risk categories are stored back into the `transactions` table for display in both portals.

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user (default role: `user`) |
| `POST` | `/api/auth/login` | Login and receive a JWT token |

### User Transactions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/transactions` | List the authenticated user's transactions |
| `GET` | `/api/transactions/:id` | Details for a single transaction |
| `POST` | `/api/transactions/simulate` | Submit a new transaction; returns anomaly score + flag |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Global stats (total txns, anomaly %, avg amounts) |
| `GET` | `/api/admin/transactions` | Paginated transactions list with filters |

> All protected routes require `Authorization: Bearer <token>` in the request header.

---

## 👤 User Portal

- View **own transaction history** with full details (amount, timestamp, merchant, location, category).
- Each transaction shows its **anomaly score** and a color-coded **risk badge**:
  - 🟢 **Normal** — routine transaction
  - 🟡 **Suspicious** — elevated risk score
  - 🔴 **High Risk** — likely fraudulent
- Filter and sort by risk level, amount, or date.

---

## 🔐 Admin Portal

- **Global statistics cards**: total transactions, anomaly count, anomaly percentage, average amount (normal vs anomalous).
- **Flagged transactions table**: all transactions where `is_anomaly = true`.
- **Search & filter** by user, date range, amount, and risk level.

---

## 🎛️ What You Can Customize

- **Feature engineering** — add more transaction features to improve model accuracy.
- **Anomaly thresholds** — tune the `NORMAL / SUSPICIOUS / HIGH_RISK` cutoffs.
- **UI theme** — customize colors, fonts, and layout via the Material UI theme.
- **Admin tools** — add fraud confirmation, report exports, or audit logs.

---

## 🔭 Next Steps

- [ ] Advanced feature engineering (merchant category encoding, geo-velocity scoring)
- [ ] Periodic background retraining jobs with latest transaction data
- [ ] Email / SMS alerting for HIGH_RISK anomalies
- [ ] Audit logs for admin actions
- [ ] Model performance dashboard (precision, recall on labeled test cases)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using Unsupervised Machine Learning · Isolation Forest · React · Node.js · PostgreSQL
</p>
