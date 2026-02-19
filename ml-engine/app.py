"""
ML Engine Flask API for Supply Chain Metric Tree
Serves trained ML models for anomaly detection, z-score forecasting,
root cause classification, and score predictions.
"""

import os
import pickle
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =====================
# LOAD MODELS
# =====================
MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")


def load_model(filename):
    """Safely load a pickle model file."""
    path = os.path.join(MODELS_DIR, filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return pickle.load(f)
    print(f"[WARN] Model not found: {path}")
    return None


# Load all available models at startup
anomaly_model = load_model("Anomaly_model.pkl")
z_score_model = load_model("z_model.pkl")
root_cause_model = load_model("root_cause_model.pkl")
poi_model = load_model("poi_model.pkl")
poi_actual_model = load_model("model_poi_actual_score.pkl")
wpt_model = load_model("model_wpt.pkl")
otd_model = load_model("model_otd.pkl")

print("=" * 50)
print("ML Engine Model Status:")
print(f"  Anomaly Detection  : {'[OK] Loaded' if anomaly_model else '[X] Not found'}")
print(f"  Z-Score Regression : {'[OK] Loaded' if z_score_model else '[X] Not found'}")
print(f"  Root Cause Classif.: {'[OK] Loaded' if root_cause_model else '[X] Not found'}")
print(f"  POI Forecasting    : {'[OK] Loaded' if poi_model else '[X] Not found'}")
print(f"  POI Actual Score   : {'[OK] Loaded' if poi_actual_model else '[X] Not found'}")
print(f"  WPT Score          : {'[OK] Loaded' if wpt_model else '[X] Not found'}")
print(f"  OTD Score          : {'[OK] Loaded' if otd_model else '[X] Not found'}")
print("=" * 50)


# =====================
# HEALTH CHECK
# =====================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "anomaly_detection": anomaly_model is not None,
            "z_score": z_score_model is not None,
            "root_cause": root_cause_model is not None,
            "poi_forecast": poi_model is not None,
            "poi_actual": poi_actual_model is not None,
            "wpt_score": wpt_model is not None,
            "otd_score": otd_model is not None,
        }
    })


# =====================
# ANOMALY DETECTION + Z-SCORE
# =====================
@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Detect anomalies and predict z-score for a metric snapshot.
    Expected input:
    {
        "score": 75.5,
        "rolling_avg_7d": 80.2,
        "hour_of_day": 14,
        "day_of_week": 3,
        "orders_volume": 1200,
        "staff_count": 45,
        "warehouse_id": "WH-001",
        "metric_id": "poi"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Required fields
        required = ["score", "rolling_avg_7d", "hour_of_day", "orders_volume", "staff_count"]
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        import pandas as pd

        # Anomaly Detection
        is_anomaly = False
        anomaly_confidence = 0.5

        if anomaly_model:
            features = pd.DataFrame([{
                "hour_of_day": data["hour_of_day"],
                "day_of_week": data.get("day_of_week", 0),
                "score": data["score"],
                "orders_volume": data["orders_volume"],
                "staff_count": data["staff_count"],
                "rolling_avg_7d": data["rolling_avg_7d"],
                "warehouse_id": data.get("warehouse_id", "WH-001"),
                "metric_id": data.get("metric_id", "poi"),
            }])
            prediction = anomaly_model.predict(features)
            is_anomaly = bool(prediction[0])

            # Get probability if available
            if hasattr(anomaly_model, "predict_proba"):
                proba = anomaly_model.predict_proba(features)
                anomaly_confidence = float(proba[0][1])  # Probability of anomaly class
        else:
            # Heuristic fallback
            is_anomaly = data["score"] < 60
            anomaly_confidence = 0.7 if is_anomaly else 0.3

        # Z-Score Prediction
        z_score = 0.0
        if z_score_model:
            z_features = pd.DataFrame([{
                "hour_of_day": data["hour_of_day"],
                "day_of_week": data.get("day_of_week", 0),
                "score": data["score"],
                "orders_volume": data["orders_volume"],
                "staff_count": data["staff_count"],
                "rolling_avg_7d": data["rolling_avg_7d"],
                "warehouse_id": data.get("warehouse_id", "WH-001"),
                "metric_id": data.get("metric_id", "poi"),
            }])
            z_score = float(z_score_model.predict(z_features)[0])
        else:
            # Heuristic fallback
            if data["rolling_avg_7d"] > 0:
                z_score = (data["score"] - data["rolling_avg_7d"]) / max(data["rolling_avg_7d"] * 0.1, 1)

        return jsonify({
            "is_anomaly": is_anomaly,
            "confidence_score": round(anomaly_confidence, 4),
            "z_score": round(z_score, 4),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =====================
# ROOT CAUSE CLASSIFICATION
# =====================
@app.route("/api/root-cause", methods=["POST"])
def root_cause():
    """
    Classify the root cause of an anomaly.
    Expected input:
    {
        "metric": "poi",
        "score": 45.0,
        "poi_score": 45.0,
        "label_score": 30.0,
        "pick_score": 65.0,
        "pack_score": 70.0,
        "tt_score": 55.0,
        "oa_score": 60.0,
        "orders_volume": 1200,
        "warehouse_id": "WH-001",
        "zone": "North"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        root_cause_label = "Unknown"
        recommendation = "No specific recommendation available."
        confidence = 0.5

        if root_cause_model:
            import pandas as pd

            features = pd.DataFrame([{
                "poi_score": data.get("poi_score", data.get("score", 50)),
                "label_score": data.get("label_score", 50),
                "pick_score": data.get("pick_score", 50),
                "pack_score": data.get("pack_score", 50),
                "tt_score": data.get("tt_score", 50),
                "oa_score": data.get("oa_score", 50),
                "orders_volume": data.get("orders_volume", 1000),
                "warehouse_id": data.get("warehouse_id", "WH-001"),
                "zone": data.get("zone", "North"),
            }])

            prediction = root_cause_model.predict(features)
            root_cause_label = str(prediction[0])

            if hasattr(root_cause_model, "predict_proba"):
                proba = root_cause_model.predict_proba(features)
                confidence = float(max(proba[0]))

            # Generate recommendation based on root cause
            recommendations = {
                "label_issue": "Check label printer connectivity and API keys. Reset courier integration for affected zones.",
                "pick_issue": "Review pick list accuracy and optimize warehouse layout. Consider staff retraining.",
                "pack_issue": "Inspect packing station equipment and review packaging standards compliance.",
                "transit_delay": "Renegotiate carrier SLAs and implement route optimization. Consider alternative carriers.",
                "order_accuracy": "Audit order processing pipeline and implement additional validation checkpoints.",
                "staff_shortage": "Rebalance staff allocation and consider temporary staffing during peak hours.",
                "system_failure": "Check API integrations and system health. Initiate failover procedures if needed.",
            }
            recommendation = recommendations.get(
                root_cause_label.lower().replace(" ", "_"),
                f"Investigate {root_cause_label} and take corrective action based on historical patterns."
            )
        else:
            # Heuristic fallback
            score = data.get("score", 50)
            if score < 30:
                root_cause_label = "Critical System Failure"
                recommendation = "Immediate intervention required. Escalate to operations management."
                confidence = 0.8
            elif score < 60:
                root_cause_label = "Performance Degradation"
                recommendation = "Monitor closely and implement preventive measures. Review recent changes."
                confidence = 0.65

        return jsonify({
            "root_cause": root_cause_label,
            "recommendation": recommendation,
            "confidence": round(confidence, 4),
            "model_used": root_cause_model is not None,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =====================
# SCORE PREDICTIONS
# =====================
@app.route("/api/predict/poi", methods=["POST"])
def predict_poi():
    """Forecast tomorrow's POI score."""
    try:
        data = request.get_json()
        if not poi_model:
            return jsonify({"error": "POI model not loaded"}), 503

        import pandas as pd
        features = pd.DataFrame([{
            "day_of_week": data.get("day_of_week", 0),
            "is_flash_sale_day": data.get("is_flash_sale_day", 0),
            "orders_volume": data.get("orders_volume", 1000),
            "poi_score_t_minus_1": data.get("poi_score_t_minus_1", 75),
            "poi_score_t_minus_2": data.get("poi_score_t_minus_2", 75),
            "poi_score_t_minus_3": data.get("poi_score_t_minus_3", 75),
            "poi_score_t_minus_4": data.get("poi_score_t_minus_4", 75),
            "poi_score_t_minus_5": data.get("poi_score_t_minus_5", 75),
            "poi_score_t_minus_6": data.get("poi_score_t_minus_6", 75),
            "poi_score_t_minus_7": data.get("poi_score_t_minus_7", 75),
            "warehouse_id": data.get("warehouse_id", "WH-001"),
        }])

        prediction = float(poi_model.predict(features)[0])
        return jsonify({"poi_score_tomorrow": round(prediction, 2)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict/poi-actual", methods=["POST"])
def predict_poi_actual():
    """Predict POI actual score from sub-metric scores."""
    try:
        data = request.get_json()
        if not poi_actual_model:
            return jsonify({"error": "POI Actual model not loaded"}), 503

        import pandas as pd
        features = pd.DataFrame([{
            "label_score": data.get("label_score", 75),
            "pick_score": data.get("pick_score", 75),
            "pack_score": data.get("pack_score", 75),
            "wpt_score_actual": data.get("wpt_score_actual", 75),
            "tt_score": data.get("tt_score", 75),
        }])

        prediction = float(poi_actual_model.predict(features)[0])
        return jsonify({"poi_actual_score": round(prediction, 2)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict/wpt", methods=["POST"])
def predict_wpt():
    """Predict WPT (Warehouse Processing Time) score."""
    try:
        data = request.get_json()
        if not wpt_model:
            return jsonify({"error": "WPT model not loaded"}), 503

        import pandas as pd
        features = pd.DataFrame([{
            "label_score": data.get("label_score", 75),
            "pick_score": data.get("pick_score", 75),
            "pack_score": data.get("pack_score", 75),
        }])

        prediction = float(wpt_model.predict(features)[0])
        return jsonify({"wpt_score": round(prediction, 2)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict/otd", methods=["POST"])
def predict_otd():
    """Predict OTD (On-Time Delivery) score."""
    try:
        data = request.get_json()
        if not otd_model:
            return jsonify({"error": "OTD model not loaded"}), 503

        import pandas as pd
        features = pd.DataFrame([{
            "label_score": data.get("label_score", 75),
            "pick_score": data.get("pick_score", 75),
            "pack_score": data.get("pack_score", 75),
            "wpt_score_actual": data.get("wpt_score_actual", 75),
            "tt_score": data.get("tt_score", 75),
        }])

        prediction = float(otd_model.predict(features)[0])
        return jsonify({"otd_score": round(prediction, 2)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =====================
# RUN SERVER
# =====================
if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"\nML Engine starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
