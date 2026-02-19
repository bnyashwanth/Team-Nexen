import pandas as pd
import pickle
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

# 1. Ensure the directory exists
model_dir = "models"
os.makedirs(model_dir, exist_ok=True)

# 2. Load and clean dataset
df_3 = pd.read_csv("data_set/dataset3_rootcause_classifier.csv")
df_3.columns = df_3.columns.str.lower().str.strip()

# Define features
num_features = [
    "poi_score", "label_score", "pick_score",
    "pack_score", "tt_score", "oa_score", "orders_volume"
]
cat_features = ["warehouse_id", "zone"]
target = "root_cause"

X = df_3[num_features + cat_features]
y = df_3[target]

# 3. Define Pipelines
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

# Full model pipeline
model_pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        n_jobs=-1
    ))
])

# 4. Train the model
model_pipeline.fit(X, y)

# 5. Save to the models folder
model_path = os.path.join(model_dir, "root_cause_model.pkl")
with open(model_path, "wb") as f:
    pickle.dump(model_pipeline, f)

print(f"Model successfully saved to: {model_path}")