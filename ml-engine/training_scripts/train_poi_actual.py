"""
Train POI Actual Score model (RandomForest Regressor)
Input: dataset4_weight_regression.csv
Output: saved_models/model_poi_actual_score.pkl
"""

import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

num_features = ["label_score", "pick_score", "pack_score", "wpt_score_actual", "tt_score"]

def train():
    df = pd.read_csv(os.path.join(DATA_DIR, "dataset4_weight_regression.csv"))
    df.columns = df.columns.str.lower().str.strip()

    X = df[num_features]
    y = df["poi_score_actual"]

    num_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])
    preprocessor = ColumnTransformer([("num", num_pipe, num_features)])

    model = Pipeline([("preprocessor", preprocessor), ("model", RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))])
    model.fit(X, y)

    path = os.path.join(MODELS_DIR, "model_poi_actual_score.pkl")
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"  [OK] POI Actual Score -> {path}")
    return model

if __name__ == "__main__":
    train()
