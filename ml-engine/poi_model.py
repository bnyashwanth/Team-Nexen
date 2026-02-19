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
# LOAD DATASET 2
# =====================
df_2 = pd.read_csv("data_set/dataset2_score_forecasting.csv")
df_2.columns = df_2.columns.str.lower().str.strip()

# =====================
# DEFINE FEATURES
# =====================
num_features = [
    "day_of_week",
    "is_flash_sale_day",
    "orders_volume",
    "poi_score_t_minus_1",
    "poi_score_t_minus_2",
    "poi_score_t_minus_3",
    "poi_score_t_minus_4",
    "poi_score_t_minus_5",
    "poi_score_t_minus_6",
    "poi_score_t_minus_7"
]

cat_features = [
    "warehouse_id"
]

target = "poi_score_tomorrow"

# ✅ FIXED: use df_2
X = df_2[num_features + cat_features]
y = df_2[target]

# =====================
# CREATE PIPELINE
# =====================
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
        ("model", RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            n_jobs=-1
        ))
    ])

    return full_pipeline


# =====================
# TRAIN MODEL
# =====================
model_poi = create_pipeline()

print("Training POI forecasting model...")
model_poi.fit(X, y)

# =====================
# SAVE MODEL
# =====================
model_path = "models/poi_model.pkl"

with open(model_path, "wb") as f:
    pickle.dump(model_poi, f)

print("Model trained successfully")
print("Saved at:", model_path)

# =====================
# LOAD MODEL (OPTIONAL)
# =====================
with open(model_path, "rb") as f:
    loaded_model = pickle.load(f)

print("Model loaded successfully")
