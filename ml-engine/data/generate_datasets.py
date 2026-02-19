"""
Generate synthetic datasets for training all 7 ML models.
Run: python data/generate_datasets.py
Outputs 4 CSV files into data/ folder.
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# =====================================================
# Dataset 1: Anomaly Detection (10,000 rows)
# Used by: Anomaly Detection model, Z-Score model
# =====================================================
def generate_dataset1():
    n = 10000
    warehouses = [f"WH-{str(i).zfill(3)}" for i in range(1, 11)]
    metrics = ["poi", "otd", "oa", "dfr", "wpt", "tt", "pick", "label", "pack"]

    data = {
        "warehouse_id": np.random.choice(warehouses, n),
        "metric_id": np.random.choice(metrics, n),
        "hour_of_day": np.random.randint(0, 24, n),
        "day_of_week": np.random.randint(0, 7, n),
        "orders_volume": np.random.randint(200, 3000, n),
        "staff_count": np.random.randint(10, 120, n),
    }

    # Generate scores with realistic distribution
    base_scores = np.random.normal(78, 15, n).clip(5, 100)
    data["score"] = np.round(base_scores, 1)

    # Rolling average is smoothed version of score
    data["rolling_avg_7d"] = np.round(
        base_scores + np.random.normal(0, 3, n), 1
    ).clip(5, 100)

    # Z-score = (score - rolling_avg) / std
    std_approx = np.maximum(data["rolling_avg_7d"] * 0.1, 1)
    data["z_score"] = np.round((data["score"] - data["rolling_avg_7d"]) / std_approx, 4)

    # Anomaly flag: score < 50 OR z_score < -2 → likely anomaly
    data["is_anomaly"] = (
        (data["score"] < 50) | (data["z_score"] < -2)
    ).astype(int)

    # Add some noise to make it realistic
    flip_mask = np.random.random(n) < 0.05
    data["is_anomaly"] = np.where(flip_mask, 1 - data["is_anomaly"], data["is_anomaly"])

    df = pd.DataFrame(data)
    path = os.path.join(OUT_DIR, "dataset1_anomaly_detection.csv")
    df.to_csv(path, index=False)
    print(f"✅ Dataset 1: {len(df)} rows → {path}")
    return df


# =====================================================
# Dataset 2: Score Forecasting (5,000 rows)
# Used by: POI Forecasting model
# =====================================================
def generate_dataset2():
    n = 5000
    warehouses = [f"WH-{str(i).zfill(3)}" for i in range(1, 11)]

    data = {
        "warehouse_id": np.random.choice(warehouses, n),
        "day_of_week": np.random.randint(0, 7, n),
        "is_flash_sale_day": np.random.choice([0, 1], n, p=[0.85, 0.15]),
        "orders_volume": np.random.randint(300, 2500, n),
    }

    # Generate 7-day lag features with autocorrelation
    base = np.random.normal(75, 12, n).clip(10, 100)
    for lag in range(1, 8):
        noise = np.random.normal(0, 3, n)
        data[f"poi_score_t_minus_{lag}"] = np.round((base + noise * lag * 0.3).clip(10, 100), 1)

    # Tomorrow's score is correlated with recent history
    recent_avg = np.mean([data[f"poi_score_t_minus_{i}"] for i in range(1, 4)], axis=0)
    flash_penalty = np.where(np.array(data["is_flash_sale_day"]) == 1, -5, 0)
    data["poi_score_tomorrow"] = np.round(
        recent_avg + np.random.normal(0, 4, n) + flash_penalty, 1
    ).clip(10, 100)

    df = pd.DataFrame(data)
    path = os.path.join(OUT_DIR, "dataset2_score_forecasting.csv")
    df.to_csv(path, index=False)
    print(f"✅ Dataset 2: {len(df)} rows → {path}")
    return df


# =====================================================
# Dataset 3: Root Cause Classification (5,000 rows)
# Used by: Root Cause model
# =====================================================
def generate_dataset3():
    n = 5000
    warehouses = [f"WH-{str(i).zfill(3)}" for i in range(1, 11)]
    zones = ["North", "South", "East", "West", "Central"]
    root_causes = [
        "label_issue", "pick_issue", "pack_issue",
        "transit_delay", "order_accuracy", "staff_shortage", "system_failure"
    ]

    data = {
        "warehouse_id": np.random.choice(warehouses, n),
        "zone": np.random.choice(zones, n),
        "orders_volume": np.random.randint(200, 3000, n),
    }

    # Generate scores that correlate with root causes
    root_cause_arr = np.random.choice(root_causes, n)
    data["root_cause"] = root_cause_arr

    # Create scores that are realistic based on root cause
    base_poi = np.random.normal(72, 15, n).clip(10, 100)
    base_label = np.random.normal(80, 12, n).clip(5, 100)
    base_pick = np.random.normal(85, 10, n).clip(10, 100)
    base_pack = np.random.normal(88, 8, n).clip(10, 100)
    base_tt = np.random.normal(82, 11, n).clip(10, 100)
    base_oa = np.random.normal(90, 7, n).clip(10, 100)

    # Degrade specific scores based on root cause
    for i in range(n):
        rc = root_cause_arr[i]
        if rc == "label_issue":
            base_label[i] = np.random.uniform(5, 35)
        elif rc == "pick_issue":
            base_pick[i] = np.random.uniform(15, 45)
        elif rc == "pack_issue":
            base_pack[i] = np.random.uniform(20, 45)
        elif rc == "transit_delay":
            base_tt[i] = np.random.uniform(10, 40)
        elif rc == "order_accuracy":
            base_oa[i] = np.random.uniform(15, 50)
        elif rc == "staff_shortage":
            base_pick[i] = np.random.uniform(25, 55)
            base_pack[i] = np.random.uniform(25, 55)
        elif rc == "system_failure":
            base_label[i] = np.random.uniform(5, 25)
            base_poi[i] = np.random.uniform(10, 35)

    data["poi_score"] = np.round(base_poi, 1)
    data["label_score"] = np.round(base_label, 1)
    data["pick_score"] = np.round(base_pick, 1)
    data["pack_score"] = np.round(base_pack, 1)
    data["tt_score"] = np.round(base_tt, 1)
    data["oa_score"] = np.round(base_oa, 1)

    df = pd.DataFrame(data)
    path = os.path.join(OUT_DIR, "dataset3_rootcause_classifier.csv")
    df.to_csv(path, index=False)
    print(f"✅ Dataset 3: {len(df)} rows → {path}")
    return df


# =====================================================
# Dataset 4: Weight Regression (5,000 rows)
# Used by: WPT, OTD, POI Actual models
# =====================================================
def generate_dataset4():
    n = 5000

    label_score = np.round(np.random.normal(78, 18, n).clip(5, 100), 1)
    pick_score = np.round(np.random.normal(85, 12, n).clip(10, 100), 1)
    pack_score = np.round(np.random.normal(88, 10, n).clip(10, 100), 1)
    tt_score = np.round(np.random.normal(82, 14, n).clip(10, 100), 1)

    # WPT = weighted combination of pick/pack/label
    wpt_score_actual = np.round(
        0.30 * pick_score + 0.40 * label_score + 0.30 * pack_score + np.random.normal(0, 3, n), 1
    ).clip(5, 100)

    # OTD = weighted combination of wpt + tt
    otd_score_actual = np.round(
        0.55 * wpt_score_actual + 0.45 * tt_score + np.random.normal(0, 3, n), 1
    ).clip(5, 100)

    # POI Actual = weighted OTD + OA + DFR (simulate OA and DFR)
    oa_score = np.round(np.random.normal(92, 6, n).clip(10, 100), 1)
    dfr_score = np.round(np.random.normal(95, 4, n).clip(10, 100), 1)
    poi_score_actual = np.round(
        0.60 * otd_score_actual + 0.25 * oa_score + 0.15 * dfr_score + np.random.normal(0, 2, n), 1
    ).clip(5, 100)

    df = pd.DataFrame({
        "label_score": label_score,
        "pick_score": pick_score,
        "pack_score": pack_score,
        "tt_score": tt_score,
        "wpt_score_actual": wpt_score_actual,
        "otd_score_actual": otd_score_actual,
        "poi_score_actual": poi_score_actual,
    })

    path = os.path.join(OUT_DIR, "dataset4_weight_regression.csv")
    df.to_csv(path, index=False)
    print(f"✅ Dataset 4: {len(df)} rows → {path}")
    return df


# =====================================================
# MAIN
# =====================================================
if __name__ == "__main__":
    print("=" * 50)
    print("Generating synthetic training datasets...")
    print("=" * 50)
    generate_dataset1()
    generate_dataset2()
    generate_dataset3()
    generate_dataset4()
    print("\n✅ All datasets generated successfully!")
    print(f"📁 Output directory: {OUT_DIR}")
