"""
Train Root Cause Classification model (RandomForest Classifier)
Input: dataset3_rootcause_classifier.csv
Output: saved_models/root_cause_model.pkl
"""

import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

num_features = ["poi_score", "label_score", "pick_score", "pack_score", "tt_score", "oa_score", "orders_volume"]
cat_features = ["warehouse_id", "zone"]

def train():
    df = pd.read_csv(os.path.join(DATA_DIR, "dataset3_rootcause_classifier.csv"))
    df.columns = df.columns.str.lower().str.strip()

    X = df[num_features + cat_features]
    y = df["root_cause"]

    num_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])
    cat_pipe = Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("encoder", OneHotEncoder(handle_unknown="ignore"))])
    preprocessor = ColumnTransformer([("num", num_pipe, num_features), ("cat", cat_pipe, cat_features)])

    model = Pipeline([("preprocessor", preprocessor), ("classifier", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1))])
    model.fit(X, y)

    path = os.path.join(MODELS_DIR, "root_cause_model.pkl")
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"  ✅ Root Cause Classification → {path}")
    return model

if __name__ == "__main__":
    train()
