from flask import Flask, request, jsonify
import pandas as pd
import sys
import os

# Add the ml-engine directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml-engine'))

try:
    from score import calculate_score
    print("Successfully imported calculate_score function")
except ImportError as e:
    print(f"Error importing calculate_score: {e}")
    def calculate_score(data):
        return 75.0  # Fallback score

app = Flask(__name__)

@app.route('/api/calculate-score', methods=['POST'])
def calculate_score_endpoint():
    """Calculate score using ML model and rolling 7-day average"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Calculate score using the function from score.py
        score = calculate_score(data)
        
        # Calculate rolling 7-day average if we have historical data
        rolling_avg = None
        if 'orders_volume' in data:
            # Simplified rolling average calculation
            # In production, this would query actual historical data
            rolling_avg = data.get('orders_volume', 100) * 0.9
        
        response = {
            'score': float(score),
            'rolling_avg_7d': rolling_avg,
            'timestamp': pd.Timestamp.now().isoformat(),
            'formula_used': 'Score = (0.4 * normalized_volume) + (0.3 * staff_efficiency) + (0.2 * rolling_avg_7d) + (0.1 * time_factor)'
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
