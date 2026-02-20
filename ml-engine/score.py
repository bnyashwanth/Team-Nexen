import pandas as pd
import pickle
import os
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
import numpy as np

# =====================
# MAIN EXECUTION (TRAINING)
# =====================
if __name__ == "__main__":
    # =====================
    # CREATE MODELS FOLDER
    # =====================
    os.makedirs("models", exist_ok=True)

    # =====================
    # LOAD DATA
    # =====================
    df_1 = pd.read_csv("data/dataset1_anomaly_detection.csv")
    df_1.columns = df_1.columns.str.lower().str.strip()

    # Convert timestamp to datetime if exists
    if 'timestamp' in df_1.columns:
        df_1['timestamp'] = pd.to_datetime(df_1['timestamp'])

    # Calculate rolling 7-day average for orders_volume
    if 'orders_volume' in df_1.columns and 'timestamp' in df_1.columns:
        df_1 = df_1.sort_values('timestamp')
        # Calculate rolling average per warehouse
        df_1['rolling_avg_7d'] = df_1.groupby('warehouse_id')['orders_volume'].transform(
            lambda x: x.rolling(window=7, min_periods=1).mean()
        )

    # Calculate composite score using formula
    # Score = (0.4 * normalized_orders_volume) + (0.3 * staff_efficiency) + (0.2 * rolling_avg_7d) + (0.1 * time_factor)
    if 'orders_volume' in df_1.columns:
        # Normalize orders_volume (0-100 scale)
        max_volume = df_1['orders_volume'].max()
        df_1['normalized_volume'] = (df_1['orders_volume'] / max_volume * 100) if max_volume > 0 else 50
        
        # Calculate staff efficiency (assuming staff_count and orders_volume)
        if 'staff_count' in df_1.columns and 'orders_volume' in df_1.columns:
            # Avoid division by zero
            df_1['staff_efficiency'] = (df_1['orders_volume'] / df_1['staff_count'].replace(0, 1)).clip(0, 100)
        else:
            df_1['staff_efficiency'] = 75  # Default efficiency
        
        # Calculate time factor (hour_of_day and day_of_week impact)
        if 'hour_of_day' in df_1.columns:
            # Peak hours: 9-17 get higher scores
            df_1['time_factor'] = np.where(
                (df_1['hour_of_day'] >= 9) & (df_1['hour_of_day'] <= 17),
                80,  # Peak hours
                40   # Off hours
            )
        else:
            df_1['time_factor'] = 60  # Default time factor
        
        # Calculate final score using formula
        if 'orders_volume' in df_1.columns:
            max_volume = df_1['orders_volume'].max()
            if max_volume > 0:
                df_1['score'] = (
                    0.4 * df_1['normalized_volume'] +
                    0.3 * df_1['staff_efficiency'] +
                    0.2 * (df_1['rolling_avg_7d'] / max_volume * 100) +
                    0.1 * df_1['time_factor']
                ).round(2)
            else:
                df_1['score'] = 75.0  # Default score if no valid data
        else:
            df_1['score'] = 75.0  # Default score
    else:
        df_1['score'] = 75.0  # Default score

    # =====================
    # DEFINE FEATURES
    # =====================
    num_features = [
        "hour_of_day",
        "day_of_week",
        "orders_volume",
        "staff_count",
        "rolling_avg_7d"
    ]

    cat_features = [
        "warehouse_id",
        "metric_id"
    ]

    target = "score"

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
    model_path = "models/score_model.pkl"

    with open(model_path, "wb") as f:
        pickle.dump(model_pipeline, f)

    print("Model trained successfully")
    print("Model stored at:", model_path)

# =====================
# SCORE CALCULATION FUNCTION
# =====================
def calculate_score(data):
    """
    Calculate score for new data using the trained model and rolling 7-day average
    """
    try:
        # Convert to DataFrame if it's a dict
        if isinstance(data, dict):
            data = pd.DataFrame([data])
        
        # Calculate rolling 7-day average if timestamp and orders_volume exist
        if 'timestamp' in data.columns and 'orders_volume' in data.columns:
            data['timestamp'] = pd.to_datetime(data['timestamp'])
            data = data.sort_values('timestamp')
            
            # For demo purposes, use historical data to calculate rolling avg
            # In production, this would query historical data
            data['rolling_avg_7d'] = data['orders_volume'] * 0.9  # Simplified rolling avg
        
        # Apply the same feature engineering as in training
        if 'orders_volume' in data.columns:
            max_volume = 1000  # Assumed max volume for normalization
            data['normalized_volume'] = (data['orders_volume'] / max_volume * 100).clip(0, 100)
            
            if 'staff_count' in data.columns:
                # Avoid division by zero
                staff_count = data['staff_count'].replace(0, 1)
                data['staff_efficiency'] = (data['orders_volume'] / staff_count).clip(0, 100)
            else:
                data['staff_efficiency'] = 75
            
            if 'hour_of_day' in data.columns:
                data['time_factor'] = np.where(
                    (data['hour_of_day'] >= 9) & (data['hour_of_day'] <= 17),
                    80, 40
                )
            else:
                data['time_factor'] = 60
            
            # Calculate final score
            if 'rolling_avg_7d' in data.columns:
                rolling_score = (data['rolling_avg_7d'] / max_volume * 100).clip(0, 100)
            else:
                rolling_score = 50
            
            score = (
                0.4 * data['normalized_volume'] +
                0.3 * data['staff_efficiency'] +
                0.2 * rolling_score +
                0.1 * data['time_factor']
            ).round(2)
            
            return score.iloc[0] if len(score) > 0 else 75.0
        
        return 75.0  # Default score
        
    except Exception as e:
        print(f"Error calculating score: {e}")
        return 75.0

