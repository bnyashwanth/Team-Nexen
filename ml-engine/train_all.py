"""
Master Training Pipeline — trains all 7 ML models.
Run: python train_all.py

Steps:
  1. Generate synthetic datasets (if missing)
  2. Train all 7 models in sequence
  3. Save .pkl files to saved_models/
"""

import os
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

def main():
    print("=" * 60)
    print("  ML Engine — Master Training Pipeline")
    print("=" * 60)
    start = time.time()

    # Step 1: Generate datasets if not present
    data_dir = os.path.join(ROOT, "data")
    datasets = [
        "dataset1_anomaly_detection.csv",
        "dataset2_score_forecasting.csv",
        "dataset3_rootcause_classifier.csv",
        "dataset4_weight_regression.csv",
    ]

    missing = [d for d in datasets if not os.path.exists(os.path.join(data_dir, d))]
    if missing:
        print(f"\n📦 Generating {len(missing)} missing dataset(s)...")
        from data.generate_datasets import (
            generate_dataset1, generate_dataset2,
            generate_dataset3, generate_dataset4
        )
        if "dataset1_anomaly_detection.csv" in missing:
            generate_dataset1()
        if "dataset2_score_forecasting.csv" in missing:
            generate_dataset2()
        if "dataset3_rootcause_classifier.csv" in missing:
            generate_dataset3()
        if "dataset4_weight_regression.csv" in missing:
            generate_dataset4()
    else:
        print("\n✅ All datasets already present")

    # Step 2: Train all models
    print("\n🔧 Training models...\n")

    from training_scripts.train_anomaly import train as train_anomaly
    from training_scripts.train_zscore import train as train_zscore
    from training_scripts.train_poi_forecast import train as train_poi
    from training_scripts.train_poi_actual import train as train_poi_actual
    from training_scripts.train_wpt import train as train_wpt
    from training_scripts.train_otd import train as train_otd
    from training_scripts.train_root_cause import train as train_root_cause

    train_anomaly()
    train_zscore()
    train_poi()
    train_poi_actual()
    train_wpt()
    train_otd()
    train_root_cause()

    elapsed = time.time() - start

    # Summary
    models_dir = os.path.join(ROOT, "saved_models")
    pkl_files = [f for f in os.listdir(models_dir) if f.endswith(".pkl")]

    print("\n" + "=" * 60)
    print(f"  ✅ All {len(pkl_files)} models trained in {elapsed:.1f}s")
    print(f"  📁 Models saved to: {models_dir}")
    for f in sorted(pkl_files):
        size_kb = os.path.getsize(os.path.join(models_dir, f)) / 1024
        print(f"     • {f} ({size_kb:.0f} KB)")
    print("=" * 60)
    print("\n🚀 Run `python app.py` to start the ML Engine API")


if __name__ == "__main__":
    main()
