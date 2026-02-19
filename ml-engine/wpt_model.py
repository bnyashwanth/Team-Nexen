import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score

# 1. Ensure the directory exists
model_dir = "models"
os.makedirs(model_dir, exist_ok=True)

# 2. Load dataset
# Using the filename shown in your file explorer
try:
    df_4 = pd.read_csv("dataset4_weight_regression.csv")
except FileNotFoundError:
    df_4 = pd.read_csv("../dataset4_weight_regression.csv")

df_4.columns = df_4.columns.str.lower().str.strip()


num_features = ["label_score", "pick_score", "pack_score"]
cat_features = [] 

target = "wpt_score_actual" 

if target not in df_4.columns:
    print(f"Error: Target '{target}' not found. Available: {list(df_4.columns)}")
    exit()

X = df_4[num_features + cat_features]
y = df_4[target]

def create_pipeline():
    num_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    transformers = [("num", num_pipe, num_features)]

    if cat_features:
        cat_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore"))
        ])
        transformers.append(("cat", cat_pipe, cat_features))

    preprocessor = ColumnTransformer(transformers)

    full_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            n_jobs=-1
        ))
    ])

    return full_pipeline

model_wpt = create_pipeline()
model_wpt.fit(X, y)

model_path = os.path.join(model_dir, "model_wpt.pkl")
with open(model_path, "wb") as f:
    pickle.dump(model_wpt, f)

print(f"Saved at: {model_path}")

