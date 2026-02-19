import pandas as pd
import pickle
import os

from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
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
df_1 = pd.read_csv("data_set/dataset1_anomaly_detection.csv")
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

target = "z_score"

X = df_1[num_features + cat_features]
y = df_1[target]

# =====================
# CREATE PIPELINE
# =====================
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

# =====================
# TRAIN MODEL
# =====================
print("Training model...")
model_pipeline.fit(X, y)

# =====================
# SAVE MODEL
# =====================
model_path = "models/z_model.pkl"

with open(model_path, "wb") as f:
    pickle.dump(model_pipeline, f)

print("Model trained successfully")
print("Model stored at:", model_path)
