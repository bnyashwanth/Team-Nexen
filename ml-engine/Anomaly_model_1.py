import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

# =====================
# CREATE MODELS FOLDER
# =====================
os.makedirs("models", exist_ok=True)

# =====================
# LOAD DATA
# =====================
df_1 = pd.read_csv("dataset1_anomaly_detection.csv")
df_1.columns = df_1.columns.str.lower().str.strip()

# =====================
# DEFINE FEATURES
# =====================
num_features = [
    "hour_of_day",
    "day_of_week",
    "score",
    "orders_volume",
    "staff_count",
    "rolling_avg_7d"
]

cat_features = [
    "warehouse_id",
    "metric_id"
]

# ---------------------------------------------------------
# MODEL 1: ANOMALY DETECTION (CLASSIFICATION)
# ---------------------------------------------------------
target = "is_anomaly"

X = df_1[num_features + cat_features]
y = df_1[target]

def create_pipeline():
    num_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    cat_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ])

    preprocessor = ColumnTransformer([
        ("num", num_pipe, num_features),
        ("cat", cat_pipe, cat_features)
    ])

    full_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=-1
        ))
    ])

    return full_pipeline

model_Anomaly = create_pipeline()
model_Anomaly.fit(X, y)

with open("models/Anomaly_model.pkl", "wb") as f:
    pickle.dump(model_Anomaly, f)

print("Anomaly Detection Model trained successfully")
print("Saved at: models/Anomaly_model.pkl")

# ---------------------------------------------------------
# MODEL 2: Z-SCORE FORECASTING (REGRESSION)
# ---------------------------------------------------------
target = "z_score"

X = df_1[num_features + cat_features]
y = df_1[target]

# Pipeline for Regression
num_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())
])

cat_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore"))
])

preprocessor = ColumnTransformer([
    ("num", num_pipe, num_features),
    ("cat", cat_pipe, cat_features)
])

model_pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", RandomForestRegressor(
        n_estimators=100,
        random_state=42,
        n_jobs=-1
    ))
])

print("Training Z-Score model...")
model_pipeline.fit(X, y)

model_path = "models/z_model.pkl"
with open(model_path, "wb") as f:
    pickle.dump(model_pipeline, f)

print("Z-Score Model trained successfully")
print("Model stored at:", model_path)