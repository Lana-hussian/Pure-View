"""
===============================================================================
  Pure View — ML Inference Script (predict.py)
  ─────────────────────────────────────────────
  
  Called by the Node.js backend via child_process.spawn().
  
  Usage:
    python predict.py '{"title":"Inception","genre":"Sci-Fi","year":2010,
                        "budget":160000000,"runtime":148,"popularity":80,
                        "overview":"A thief who steals corporate secrets..."}'
  
  Output (stdout):
    {"score": 78.3}
  
  The script loads the trained pipeline (pure_view_ml_pipeline.joblib) and
  runs inference on the input features. Missing features are gracefully
  imputed with sensible defaults so the prediction never fails.
===============================================================================
"""

import sys
import json
import os

import joblib
import pandas as pd
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
PIPELINE_PATH = os.path.join(SCRIPT_DIR, "pure_view_ml_pipeline.joblib")
COMPAT_PATH   = os.path.join(SCRIPT_DIR, "model.joblib")
META_PATH     = os.path.join(SCRIPT_DIR, "model_metadata.json")

# ── Defaults for missing features ─────────────────────────────────────────────
DEFAULTS = {
    'primary_genre':      'Drama',
    'company':            'Other',
    'release_month':      6,
    'budget':             15_000_000,
    'runtime':            100,
    'popularity':         20.0,
    'budget_per_minute':  150_000,
    'director_avg_score': 60.0,
    'cast_avg_score':     60.0,
    'genre_text':         'Drama',
    'overview':           '',
}


def load_global_avg():
    """Load the global average score from training metadata (for imputation)."""
    try:
        if os.path.exists(META_PATH):
            with open(META_PATH, 'r') as f:
                meta = json.load(f)
            return meta.get('global_avg_score', 60.0)
    except Exception:
        pass
    return 60.0


def predict():
    """
    Main inference function.
    
    1. Parse JSON input from command-line argument
    2. Map input fields to the pipeline's expected feature columns
    3. Load the trained pipeline
    4. Output the prediction as JSON to stdout
    """
    try:
        # ── Parse input ──────────────────────────────────────────────────
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No input provided. Pass a JSON string as the first argument."}))
            return

        input_data = json.loads(sys.argv[1])

        # ── Extract and map features ─────────────────────────────────────
        genre       = input_data.get('genre',       DEFAULTS['primary_genre'])
        year        = int(input_data.get('year',     2024))
        budget      = float(input_data.get('budget', DEFAULTS['budget']))
        runtime     = float(input_data.get('runtime', DEFAULTS['runtime']))
        popularity  = float(input_data.get('popularity', DEFAULTS['popularity']))
        overview    = str(input_data.get('overview',  DEFAULTS['overview']))
        company     = str(input_data.get('company',   DEFAULTS['company']))
        title       = str(input_data.get('title',     'Unknown'))

        # Derive features
        release_month    = int(input_data.get('release_month', DEFAULTS['release_month']))
        budget_per_min   = budget / runtime if runtime > 0 else 0

        # Use global average for star power when not provided
        global_avg       = load_global_avg()
        director_avg     = float(input_data.get('director_avg_score', global_avg))
        cast_avg         = float(input_data.get('cast_avg_score', global_avg))

        # ── Build the DataFrame the pipeline expects ─────────────────────
        row = {
            'primary_genre':      genre,
            'company':            company,
            'release_month':      release_month,
            'budget':             budget,
            'runtime':            runtime,
            'popularity':         popularity,
            'budget_per_minute':  budget_per_min,
            'director_avg_score': director_avg,
            'cast_avg_score':     cast_avg,
            'genre_text':         genre,         # For genre TF-IDF
            'overview':           overview,      # For NLP TF-IDF
        }
        df = pd.DataFrame([row])

        # ── Load pipeline ────────────────────────────────────────────────
        model_path = PIPELINE_PATH if os.path.exists(PIPELINE_PATH) else COMPAT_PATH
        if not os.path.exists(model_path):
            print(json.dumps({
                "score": 65.0,
                "note":  "Model not found. Run train_model.py first.",
            }))
            return

        pipeline = joblib.load(model_path)

        # ── Predict ──────────────────────────────────────────────────────
        predicted = pipeline.predict(df)[0]
        final_score = float(np.clip(predicted, 0, 100))

        print(json.dumps({
            "score": round(final_score, 1),
            "model": "v3.0-advanced",
        }))

    except Exception as e:
        # Always return valid JSON so Node.js can parse the error
        print(json.dumps({"error": str(e), "score": 65.0}))


if __name__ == "__main__":
    predict()
