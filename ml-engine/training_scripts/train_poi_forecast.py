"""
Train POI Forecasting model (RandomForest Regressor)
Input: dataset2_score_forecasting.csv
Output: saved_models/poi_model.pkl
"""

import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

num_features = [
    "day_of_week", "is_flash_sale_day", "orders_volume",
    "poi_score_t_minus_1", "poi_score_t_minus_2", "poi_score_t_minus_3",
    "poi_score_t_minus_4", "poi_score_t_minus_5", "poi_score_t_minus_6", "poi_score_t_minus_7"
]
cat_features = ["warehouse_id"]

def train():
    df = pd.read_csv(os.path.join(DATA_DIR, "dataset2_score_forecasting.csv"))
    df.columns = df.columns.str.lower().str.strip()

    X = df[num_features + cat_features]
    y = df["poi_score_tomorrow"]

    num_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])
    cat_pipe = Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("encoder", OneHotEncoder(handle_unknown="ignore"))])
    preprocessor = ColumnTransformer([("num", num_pipe, num_features), ("cat", cat_pipe, cat_features)])

    model = Pipeline([("preprocessor", preprocessor), ("model", RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))])
    model.fit(X, y)

    path = os.path.join(MODELS_DIR, "poi_model.pkl")
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"  [OK] POI Forecasting -> {path}")
    return model

if __name__ == "__main__":
    train()
