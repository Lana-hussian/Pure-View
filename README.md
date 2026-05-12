# 🎬 Pure View Platform

**Pure View** is a premium, full-stack movie and TV show discovery platform. It features a unique dual-rating system (AI + User), advanced family content filtering, and a state-of-the-art "Anti-Gravity" dark mode aesthetic.

The platform leverages a **React/Vite** frontend, a **Node.js/Express** backend, and a **Python Machine Learning Pipeline** for objective technical scoring.

---

## ✨ Key Features
*   **Dual Rating System:** Combines live User feedback with an objective AI Score.
*   **Family Safety Filters:** Interactive sliders to filter content based on Horror, Violence, Adult Content, and more.
*   **Premium Aesthetics:** Glassmorphism UI, fluid animations, and a cohesive design system.
*   **Admin Controls:** Comprehensive dashboard for managing content and classification logic.
*   **ML Predictions:** Real-time interface with Python data pipelines for predictive scoring.
*   **Metadata Enrichment:** Integrated with TMDB for rich, automated content details.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v18 or higher)
*   **Python** (v3.8 or higher)
*   **Git**

---

## 📥 Getting Started

Follow these steps to set up the project on your local machine:

### 1. Clone the Repository
```bash
git clone https://github.com/peterraafat99/Pure-View.git
cd "Pure View"
```

### 2. Setup the Backend
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

### 3. Setup the Machine Learning Environment
Ensure you have the required Python libraries installed:
```bash
pip install -r ml/requirements.txt
```

### 4. Setup the Frontend
Open a new terminal (or navigate back and then into frontend) and install dependencies:
```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration & Initialization

### 1. Database Initialization
The project uses a local SQLite database. Initialize the schema and seed initial data (Admin/Client accounts):
```bash
cd backend
npm run seed
```
**Default Credentials:**
*   **Admin:** `admin@pureview.com` / `admin123`
*   **Client:** `alice@example.com` / `user123`

### 2. ML Model Training (Optional)
The pre-trained model files are included in the repository. If you wish to retrain the model with fresh data, you can run:
```bash
cd backend/ml
python train_model.py
```

### 3. TMDB API (Optional)
A demo API key is included in `backend/src/services/TMDBService.js`. For a production environment, please use your own key from [themoviedb.org](https://www.themoviedb.org/).

---

## 🚀 Running the Application

To run the application, you need to start both the Backend and the Frontend servers.

### Start the Backend (API)
```bash
cd backend
npm run dev
```
*API running at: [http://localhost:5000](http://localhost:5000)*

### Start the Frontend (Web Interface)
```bash
cd frontend
npm run dev
```
*Web App running at: [http://localhost:5173](http://localhost:5173)*

---

## 🧪 Technical Overview
The **AI Score** uses a `HistGradientBoostingRegressor` trained on pre-release metadata (budget, cast, crew, genres, and plot themes). 
*   **Feature Engineering:** Star power imputation, interaction terms (budget/duration), and TF-IDF plot analysis.
*   **Pipeline:** Deterministic execution via Scikit-Learn's `ColumnTransformer`.

---

## 🛡️ License
Distributed under the ISC License.
