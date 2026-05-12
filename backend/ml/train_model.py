"""
===============================================================================
  Pure View — Advanced ML Training Pipeline
  ─────────────────────────────────────────
  
  Purpose
  -------
  Train a regression model that predicts a movie's objective "AI Score" (0–100)
  using ONLY pre-release metadata, solving the Cold-Start Problem where no user
  ratings exist yet.

  Feature Engineering (5 categories)
  ----------------------------------
  1. Star Power   — historical avg rating of director & top-3 cast
  2. Pedigree     — One-Hot Encoded genres & top-20 production companies
  3. Temporal     — release month (seasonality), scaled budget/runtime/popularity
  4. NLP          — TF-IDF on plot synopsis (top 100 thematic features)
  5. Interaction  — budget-per-minute derivative feature

  Model
  -----
  HistGradientBoostingRegressor (scikit-learn ≥ 1.0) wrapped inside a
  sklearn Pipeline + ColumnTransformer for reproducible, end-to-end
  transform → predict inference.

  Usage
  -----
    $ python train_model.py
  
  Outputs
  -------
    pure_view_ml_pipeline.joblib   — serialized pipeline for Node.js backend
    model.joblib                   — symlink/copy for backward compatibility
  
  Dataset
  -------
  TMDB 5000 Movies (tmdb_5000_movies.csv + tmdb_5000_credits.csv)
  Fetched automatically from public GitHub mirrors or loaded from local CSV.

===============================================================================
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 1. IMPORTS
# ═══════════════════════════════════════════════════════════════════════════════
import os
import sys
import json
import shutil
import warnings
import numpy as np
import pandas as pd

# Scikit-learn core
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import (
    StandardScaler,
    OneHotEncoder,
    FunctionTransformer,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# Suppress non-critical warnings during training
warnings.filterwarnings("ignore", category=UserWarning)

# ═══════════════════════════════════════════════════════════════════════════════
# 2. PATHS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════
SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
PIPELINE_PATH    = os.path.join(SCRIPT_DIR, "pure_view_ml_pipeline.joblib")
COMPAT_PATH      = os.path.join(SCRIPT_DIR, "model.joblib")  # backward compat

# Dataset URLs — public GitHub mirrors of the TMDB 5000 dataset
MOVIES_URL  = "https://raw.githubusercontent.com/codeheroku/Introduction-to-Machine-Learning/master/Building%20a%20Movie%20Recommendation%20Engine/tmdb_5000_movies.csv"
CREDITS_URL = "https://raw.githubusercontent.com/codeheroku/Introduction-to-Machine-Learning/master/Building%20a%20Movie%20Recommendation%20Engine/tmdb_5000_credits.csv"

# Feature engineering constants
TOP_N_COMPANIES  = 20    # Number of production companies to one-hot encode
TOP_N_TFIDF      = 100   # Number of TF-IDF text features from the overview
MIN_VOTE_COUNT   = 15    # Minimum votes to include a movie (reduces noise)
TEST_SIZE        = 0.20  # 80/20 train-test split
RANDOM_STATE     = 42    # Reproducibility seed


# ═══════════════════════════════════════════════════════════════════════════════
# 3. DATA ACQUISITION
# ═══════════════════════════════════════════════════════════════════════════════
def load_data():
    """
    Fetch the TMDB 5000 Movies + Credits datasets.
    
    Tries to download from GitHub mirrors first; if that fails (e.g. no 
    internet), falls back to local CSVs in the same directory.
    
    Returns
    -------
    movies_df : pd.DataFrame
        Raw movies table with budget, revenue, genres, overview, etc.
    credits_df : pd.DataFrame or None
        Raw credits table with cast/crew JSON. Can be None if unavailable.
    """
    import io, requests

    movies_df  = None
    credits_df = None

    # ── Try fetching movies data ──────────────────────────────────────────
    local_movies = os.path.join(SCRIPT_DIR, "tmdb_5000_movies.csv")
    if os.path.exists(local_movies):
        print(f"  📂 Loading movies from local file: {local_movies}")
        movies_df = pd.read_csv(local_movies)
    else:
        print(f"  🌐 Downloading movies dataset from GitHub...")
        try:
            r = requests.get(MOVIES_URL, timeout=30)
            r.raise_for_status()
            movies_df = pd.read_csv(io.StringIO(r.text))
            print(f"     ✓ Downloaded {len(movies_df)} movies")
        except Exception as e:
            print(f"     ✗ Download failed: {e}")

    # ── Try fetching credits data ─────────────────────────────────────────
    local_credits = os.path.join(SCRIPT_DIR, "tmdb_5000_credits.csv")
    if os.path.exists(local_credits):
        print(f"  📂 Loading credits from local file: {local_credits}")
        credits_df = pd.read_csv(local_credits)
    else:
        print(f"  🌐 Downloading credits dataset from GitHub...")
        try:
            r = requests.get(CREDITS_URL, timeout=30)
            r.raise_for_status()
            credits_df = pd.read_csv(io.StringIO(r.text))
            print(f"     ✓ Downloaded {len(credits_df)} credit records")
        except Exception as e:
            print(f"     ✗ Credits download failed: {e} (will proceed without Star Power features)")

    # ── Validation ────────────────────────────────────────────────────────
    if movies_df is None:
        print("\n  ⚠ No movie data available — generating synthetic fallback")
        movies_df = _generate_synthetic_data()

    return movies_df, credits_df


def _generate_synthetic_data():
    """Generate a synthetic dataset for when real data is unavailable."""
    import random
    genres_pool = ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Horror',
                   'Thriller', 'Animation', 'Romance', 'Documentary']
    data = []
    for i in range(800):
        genre = random.choice(genres_pool)
        data.append({
            'genres':       json.dumps([{"name": genre}]),
            'release_date': f'{random.randint(1985, 2024)}-{random.randint(1,12):02d}-15',
            'budget':       random.randint(0, 250_000_000),
            'runtime':      random.randint(72, 210),
            'popularity':   random.uniform(1, 200),
            'overview':     f'A {genre.lower()} film about {random.choice(["adventure", "love", "survival", "mystery", "conflict"])}.',
            'vote_average': round(random.uniform(3.5, 8.5), 1),
            'vote_count':   random.randint(20, 5000),
            'production_companies': json.dumps([{"name": random.choice(["Warner Bros", "Disney", "A24", "Universal", "Indie Studio"])}]),
        })
    return pd.DataFrame(data)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. JSON COLUMN PARSERS
# ═══════════════════════════════════════════════════════════════════════════════
def safe_json_parse(x):
    """Safely parse a JSON string, returning an empty list on failure."""
    try:
        if pd.isna(x):
            return []
        s = str(x).strip()
        if s.startswith('['):
            return json.loads(s)
        return []
    except (json.JSONDecodeError, TypeError):
        return []


def extract_genre_names(json_str):
    """
    Extract genre names from TMDB JSON format.
    
    Input:  '[{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}]'
    Output: 'Action Adventure'
    """
    parsed = safe_json_parse(json_str)
    if isinstance(parsed, list):
        return ' '.join(item.get('name', '') for item in parsed if isinstance(item, dict))
    return str(json_str)


def extract_primary_genre(json_str):
    """Extract only the first (primary) genre name."""
    parsed = safe_json_parse(json_str)
    if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
        return parsed[0].get('name', 'Unknown')
    return str(json_str) if not pd.isna(json_str) else 'Unknown'


def extract_company_name(json_str):
    """Extract the primary production company name."""
    parsed = safe_json_parse(json_str)
    if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
        return parsed[0].get('name', 'Other')
    return 'Other'


def extract_director(crew_json):
    """
    Extract the director's name from the TMDB crew JSON array.
    
    The crew column contains a JSON array of objects, each with a 'job' field.
    We filter for job == 'Director' and return the first match.
    """
    parsed = safe_json_parse(crew_json)
    for member in parsed:
        if isinstance(member, dict) and member.get('job') == 'Director':
            return member.get('name', 'Unknown')
    return 'Unknown'


def extract_top_cast(cast_json, n=3):
    """
    Extract the top-N cast members from the TMDB cast JSON array.
    
    Cast members are ordered by 'order' (billing position), so the first N
    entries represent the most prominent actors.
    
    Returns
    -------
    list of str : up to N actor names
    """
    parsed = safe_json_parse(cast_json)
    names = []
    for member in parsed[:n]:
        if isinstance(member, dict):
            names.append(member.get('name', 'Unknown'))
    return names


# ═══════════════════════════════════════════════════════════════════════════════
# 5. FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════════
def engineer_features(movies_df, credits_df=None):
    """
    Perform all advanced feature engineering on the raw datasets.
    
    This function:
      1. Merges movies + credits (if available)
      2. Filters low-quality entries (< MIN_VOTE_COUNT votes)
      3. Extracts Star Power features (director & cast historical averages)
      4. Extracts Pedigree features (genres, production companies)
      5. Extracts Temporal features (release month)
      6. Computes interaction features (budget per minute)
      7. Prepares the NLP-ready overview text column
    
    Parameters
    ----------
    movies_df  : pd.DataFrame — raw TMDB movies
    credits_df : pd.DataFrame or None — raw TMDB credits
    
    Returns
    -------
    df     : pd.DataFrame — feature-engineered dataset ready for modelling
    global_avg : float — global average score, used for imputing new talent
    """
    df = movies_df.copy()
    print(f"\n  📊 Starting with {len(df)} raw movies")

    # ── 5.1 Merge credits if available ────────────────────────────────────
    if credits_df is not None:
        # The credits dataset links via 'movie_id' or 'title'
        merge_col = 'movie_id' if 'movie_id' in credits_df.columns else 'title'
        movies_merge_col = 'id' if merge_col == 'movie_id' else 'title'
        if movies_merge_col in df.columns:
            df = df.merge(
                credits_df[[merge_col, 'cast', 'crew']],
                left_on=movies_merge_col,
                right_on=merge_col,
                how='left'
            )
            print(f"     ✓ Merged credits data ({len(credits_df)} records)")
    
    # ── 5.2 Filter: Remove movies with very few votes (noise reduction) ──
    if 'vote_count' in df.columns:
        before = len(df)
        df = df[pd.to_numeric(df['vote_count'], errors='coerce').fillna(0) > MIN_VOTE_COUNT]
        print(f"     ✓ Filtered to {len(df)} movies (removed {before - len(df)} low-vote entries)")

    # ── 5.3 Target variable ──────────────────────────────────────────────
    #    TMDB vote_average is 0–10; we scale to PureView's 0–100 scale.
    df['target_score'] = pd.to_numeric(df['vote_average'], errors='coerce') * 10
    df = df.dropna(subset=['target_score'])
    global_avg = df['target_score'].mean()
    print(f"     ✓ Target: mean={global_avg:.1f}, std={df['target_score'].std():.1f}")

    # ── 5.4 STAR POWER: Director historical average ──────────────────────
    if 'crew' in df.columns:
        df['director'] = df['crew'].apply(extract_director)
        
        # Calculate each director's historical average rating
        director_stats = df.groupby('director')['target_score'].agg(['mean', 'count'])
        director_stats.columns = ['director_avg_score', 'director_movie_count']
        
        # Only trust directors with ≥ 2 movies; impute newcomers with global avg
        director_stats.loc[director_stats['director_movie_count'] < 2, 'director_avg_score'] = global_avg
        
        df = df.merge(director_stats[['director_avg_score']], left_on='director', right_index=True, how='left')
        df['director_avg_score'] = df['director_avg_score'].fillna(global_avg)
        print(f"     ✓ Director Star Power: {director_stats[director_stats['director_movie_count'] >= 2].shape[0]} known directors")
    else:
        # No crew data available — fill with global average
        df['director'] = 'Unknown'
        df['director_avg_score'] = global_avg
        print(f"     ⚠ No crew data — director_avg_score set to global avg ({global_avg:.1f})")

    # ── 5.5 STAR POWER: Top-3 Cast historical average ────────────────────
    if 'cast' in df.columns:
        df['top_cast'] = df['cast'].apply(lambda x: extract_top_cast(x, n=3))
        
        # Explode: assign each movie's score to each of its actors
        actor_rows = df[['top_cast', 'target_score']].explode('top_cast')
        actor_rows = actor_rows.rename(columns={'top_cast': 'actor'})
        actor_rows = actor_rows.dropna(subset=['actor'])
        
        actor_stats = actor_rows.groupby('actor')['target_score'].agg(['mean', 'count'])
        actor_stats.columns = ['actor_avg', 'actor_count']
        actor_stats.loc[actor_stats['actor_count'] < 2, 'actor_avg'] = global_avg
        
        # Map back: average the historical scores of the top-3 cast
        def compute_cast_avg(cast_list):
            """Average the historical ratings of the top-3 cast members."""
            if not isinstance(cast_list, list) or len(cast_list) == 0:
                return global_avg
            scores = []
            for actor in cast_list:
                if actor in actor_stats.index:
                    scores.append(actor_stats.loc[actor, 'actor_avg'])
                else:
                    scores.append(global_avg)
            return np.mean(scores)
        
        df['cast_avg_score'] = df['top_cast'].apply(compute_cast_avg)
        known_actors = actor_stats[actor_stats['actor_count'] >= 2].shape[0]
        print(f"     ✓ Cast Star Power: {known_actors} known actors across top-3 billing")
    else:
        df['cast_avg_score'] = global_avg
        print(f"     ⚠ No cast data — cast_avg_score set to global avg ({global_avg:.1f})")

    # ── 5.6 PEDIGREE: Genre extraction (for OHE & TF-IDF) ───────────────
    df['genre_text']    = df['genres'].apply(extract_genre_names).fillna('Unknown')
    df['primary_genre'] = df['genres'].apply(extract_primary_genre).fillna('Unknown')
    print(f"     ✓ Genres extracted ({df['primary_genre'].nunique()} unique)")

    # ── 5.7 PEDIGREE: Production company (top-N + "Other") ──────────────
    if 'production_companies' in df.columns:
        df['company'] = df['production_companies'].apply(extract_company_name)
        # Keep only the top N companies; map everything else to "Other"
        top_companies = df['company'].value_counts().head(TOP_N_COMPANIES).index.tolist()
        df['company'] = df['company'].apply(lambda x: x if x in top_companies else 'Other')
        print(f"     ✓ Production companies: top-{TOP_N_COMPANIES} kept, rest → 'Other'")
    else:
        df['company'] = 'Other'

    # ── 5.8 TEMPORAL: Release month extraction ───────────────────────────
    df['release_month'] = pd.to_datetime(df['release_date'], errors='coerce').dt.month
    df['release_month'] = df['release_month'].fillna(6).astype(int)  # Default: June
    print(f"     ✓ Release month extracted (range: {df['release_month'].min()}–{df['release_month'].max()})")

    # ── 5.9 QUANTITATIVE: Numerical features ────────────────────────────
    df['budget']     = pd.to_numeric(df.get('budget', 0), errors='coerce').fillna(0)
    df['runtime']    = pd.to_numeric(df.get('runtime', 90), errors='coerce').fillna(90)
    df['popularity'] = pd.to_numeric(df.get('popularity', 10), errors='coerce').fillna(10)

    # ── 5.10 INTERACTION: Budget-per-minute ──────────────────────────────
    #    This derivative feature captures "production investment intensity".
    #    Movies with high budget per minute tend to be polished blockbusters.
    df['budget_per_minute'] = np.where(
        df['runtime'] > 0,
        df['budget'] / df['runtime'],
        0
    )
    print(f"     ✓ Interaction feature: budget_per_minute")

    # ── 5.11 NLP: Prepare overview text ──────────────────────────────────
    df['overview'] = df['overview'].fillna('').astype(str)
    non_empty = (df['overview'].str.strip() != '').sum()
    print(f"     ✓ Overview text: {non_empty}/{len(df)} movies have synopses")

    # ── 5.12 Final cleanup ───────────────────────────────────────────────
    required = ['target_score', 'primary_genre', 'company', 'release_month',
                'budget', 'runtime', 'popularity', 'budget_per_minute',
                'director_avg_score', 'cast_avg_score', 'genre_text', 'overview']
    df = df[required].dropna()
    print(f"\n  ✅ Final engineered dataset: {len(df)} movies × {len(required)} feature columns")

    return df, global_avg


# ═══════════════════════════════════════════════════════════════════════════════
# 6. PIPELINE CONSTRUCTION
# ═══════════════════════════════════════════════════════════════════════════════
def build_pipeline():
    """
    Construct the full scikit-learn Pipeline with a ColumnTransformer.
    
    The ColumnTransformer processes 5 feature groups in parallel:
    
    ┌──────────────────────────────────────────────────────────────┐
    │  ColumnTransformer                                          │
    │  ├─ "star_power"  → StandardScaler on [director_avg, cast_avg]│
    │  ├─ "numerical"   → StandardScaler on [budget, runtime, ...] │
    │  ├─ "genre_ohe"   → OneHotEncoder on [primary_genre]         │
    │  ├─ "company_ohe" → OneHotEncoder on [company]               │
    │  ├─ "temporal"    → StandardScaler on [release_month]        │
    │  ├─ "genre_tfidf" → TfidfVectorizer on genre_text            │
    │  └─ "nlp_tfidf"   → TfidfVectorizer on overview              │
    └──────────────────────────────────────────────────────────────┘
                              ↓
              HistGradientBoostingRegressor
    
    Returns
    -------
    Pipeline : scikit-learn Pipeline object (untrained)
    """

    # ── 6.1 Define the ColumnTransformer ─────────────────────────────────
    preprocessor = ColumnTransformer(
        transformers=[
            # ── Star Power features (continuous) ──
            # Historical averages of director & cast — scale to normalize
            (
                "star_power",
                StandardScaler(),
                ["director_avg_score", "cast_avg_score"]
            ),

            # ── Quantitative features (continuous) ──
            # Budget, runtime, popularity, and the derived budget_per_minute
            (
                "numerical",
                StandardScaler(),
                ["budget", "runtime", "popularity", "budget_per_minute"]
            ),

            # ── Pedigree: Genre One-Hot Encoding ──
            # Converts primary_genre (e.g., "Action") into binary columns
            (
                "genre_ohe",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ["primary_genre"]
            ),

            # ── Pedigree: Production Company One-Hot Encoding ──
            # Top 20 companies get their own column; all others are "Other"
            (
                "company_ohe",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ["company"]
            ),

            # ── Temporal: Release Month ──
            # Captures seasonal trends (summer blockbusters vs. awards season)
            (
                "temporal",
                StandardScaler(),
                ["release_month"]
            ),

            # ── Genre TF-IDF (multi-label text) ──
            # Captures combinations like "Action Adventure Sci-Fi" as a vector
            (
                "genre_tfidf",
                TfidfVectorizer(max_features=30, token_pattern=r"(?u)\b\w+\b"),
                "genre_text"
            ),

            # ── NLP: Plot Synopsis TF-IDF ──
            # Top 100 thematic features from movie descriptions
            (
                "nlp_tfidf",
                TfidfVectorizer(
                    max_features=TOP_N_TFIDF,
                    stop_words="english",          # Remove "the", "a", "is", etc.
                    ngram_range=(1, 2),             # Unigrams + bigrams
                    min_df=3,                       # Feature must appear in ≥ 3 docs
                    max_df=0.85,                    # Ignore terms in > 85% of docs
                    sublinear_tf=True,              # Apply log normalization
                ),
                "overview"
            ),
        ],
        # Any column not listed above is silently dropped
        remainder="drop",
        verbose_feature_names_out=False,
    )

    # ── 6.2 Define the regression estimator ──────────────────────────────
    #    HistGradientBoostingRegressor is:
    #      • Natively handles missing values
    #      • Very fast (histogram-based splits)
    #      • Strong regularization (max_depth, min_samples_leaf)
    #      • Robust against overfitting with early_stopping
    regressor = HistGradientBoostingRegressor(
        max_iter=300,               # Number of boosting iterations
        max_depth=6,                # Limit tree depth to prevent overfitting
        learning_rate=0.08,         # Conservative learning rate
        min_samples_leaf=10,        # Minimum samples per leaf node
        l2_regularization=0.1,      # L2 ridge penalty
        max_bins=255,               # Histogram binning resolution
        early_stopping=True,        # Stop early if validation plateaus
        validation_fraction=0.1,    # Use 10% of training data for validation
        n_iter_no_change=15,        # Patience: stop after 15 non-improving iterations
        random_state=RANDOM_STATE,
    )

    # ── 6.3 Assemble the full Pipeline ───────────────────────────────────
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor",    regressor),
    ])

    return pipeline


# ═══════════════════════════════════════════════════════════════════════════════
# 7. TRAINING & EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════
def train_and_evaluate():
    """
    Main training function.
    
    Workflow:
      1. Load raw data
      2. Engineer features
      3. Split into train/test (80/20)
      4. Build the pipeline
      5. Fit the pipeline on training data
      6. Evaluate on held-out test set
      7. Perform 5-fold cross-validation
      8. Export the pipeline as .joblib files
    """
    print("=" * 70)
    print("  🎬 Pure View — ML Pipeline Training")
    print("=" * 70)

    # ── Step 1: Load data ─────────────────────────────────────────────────
    print("\n[1/6] Loading datasets...")
    movies_df, credits_df = load_data()

    # ── Step 2: Feature engineering ──────────────────────────────────────
    print("\n[2/6] Engineering features...")
    df, global_avg = engineer_features(movies_df, credits_df)

    # ── Step 3: Train/test split ─────────────────────────────────────────
    print(f"\n[3/6] Splitting data ({int((1-TEST_SIZE)*100)}/{int(TEST_SIZE*100)})...")
    feature_cols = [
        'primary_genre', 'company', 'release_month',
        'budget', 'runtime', 'popularity', 'budget_per_minute',
        'director_avg_score', 'cast_avg_score',
        'genre_text', 'overview',
    ]
    X = df[feature_cols]
    y = df['target_score']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )
    print(f"     Train: {len(X_train)} samples")
    print(f"     Test:  {len(X_test)} samples")

    # ── Step 4: Build pipeline ───────────────────────────────────────────
    print("\n[4/6] Building ColumnTransformer + HistGBR pipeline...")
    pipeline = build_pipeline()

    # ── Step 5: Fit ──────────────────────────────────────────────────────
    print("\n[5/6] Training model...")
    pipeline.fit(X_train, y_train)
    print("     ✓ Training complete")

    # ── Step 6: Evaluate ─────────────────────────────────────────────────
    print("\n[6/6] Evaluating...")

    # Test set predictions
    y_pred = pipeline.predict(X_test)
    y_pred = np.clip(y_pred, 0, 100)  # Clamp to 0–100

    mse  = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2   = r2_score(y_test, y_pred)

    print(f"\n  ╔════════════════════════════════════════╗")
    print(f"  ║  Test Set Evaluation Results           ║")
    print(f"  ╠════════════════════════════════════════╣")
    print(f"  ║  MSE  (Mean Squared Error) : {mse:>9.2f} ║")
    print(f"  ║  RMSE (Root MSE)           : {rmse:>9.2f} ║")
    print(f"  ║  R²   (R-squared)          : {r2:>9.4f} ║")
    print(f"  ╚════════════════════════════════════════╝")

    # ── Cross-validation for robustness check ────────────────────────────
    print("\n  Running 5-fold cross-validation...")
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring='r2')
    print(f"  CV R² scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"  CV R² mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── Prediction distribution analysis ─────────────────────────────────
    print(f"\n  Prediction analysis:")
    print(f"    Actual  range: {y_test.min():.0f} – {y_test.max():.0f}")
    print(f"    Predict range: {y_pred.min():.1f} – {y_pred.max():.1f}")
    print(f"    Mean error:    {(y_test - y_pred).mean():.2f}")

    # ── Step 7: Export ───────────────────────────────────────────────────
    print(f"\n  💾 Saving pipeline...")
    joblib.dump(pipeline, PIPELINE_PATH)
    print(f"     → {PIPELINE_PATH}")
    shutil.copy2(PIPELINE_PATH, COMPAT_PATH)
    print(f"     → {COMPAT_PATH} (backward compat)")

    # ── Save training metadata for the Node.js backend ───────────────────
    metadata = {
        "model_version":    "v3.0-advanced",
        "features_used":    feature_cols,
        "global_avg_score": round(global_avg, 2),
        "test_mse":         round(mse, 4),
        "test_rmse":        round(rmse, 4),
        "test_r2":          round(r2, 4),
        "cv_r2_mean":       round(cv_scores.mean(), 4),
        "training_samples": len(X_train),
        "test_samples":     len(X_test),
        "total_features":   len(feature_cols),
    }
    meta_path = os.path.join(SCRIPT_DIR, "model_metadata.json")
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"     → {meta_path}")

    print("\n" + "=" * 70)
    print(f"  ✅ Pipeline exported as pure_view_ml_pipeline.joblib")
    print(f"     Ready for consumption by Node.js backend via predict.py")
    print("=" * 70)

    return pipeline, metadata


# ═══════════════════════════════════════════════════════════════════════════════
# 8. ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    train_and_evaluate()
