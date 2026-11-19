# ml_service/app.py

import os
import time
import joblib
import pandas as pd
from flask import Flask, request, jsonify, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)

# --- PROMETHEUS METRICS ---
PREDICTION_REQUESTS = Counter(
    'donor_ml_prediction_requests_total',
    'Total count of donor availability prediction requests',
    ['status']
)

PREDICTION_LATENCY = Histogram(
    'donor_ml_prediction_latency_seconds',
    'Inference latency in seconds',
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

AVAILABILITY_SCORES = Histogram(
    'donor_ml_predicted_score_distribution',
    'Distribution of predicted donor availability scores (0 to 1)',
    buckets=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
)

MODEL_STATUS = Gauge(
    'donor_ml_model_loaded',
    'Indicates if the ML model is currently loaded in memory (1=Yes, 0=No)'
)
# --------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'availability_model.joblib')

# 1. Load the trained model once when the application starts
print(f"Loading prediction model from {MODEL_PATH}...")
try:
    model = joblib.load(MODEL_PATH)
    MODEL_STATUS.set(1)
    print("✅ Model successfully loaded!")
except FileNotFoundError:
    print(f"Error: {MODEL_PATH} not found. Please run train.py first.")
    model = None
    MODEL_STATUS.set(0)

# Define the exact feature order the model was trained on
TRAINING_COLUMNS = [
    'age', 
    'days_since_last_donation', 
    'total_notifications', 
    'times_donated', 
    'response_rate'
]

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy' if model is not None else 'degraded',
        'model_loaded': model is not None,
        'features': TRAINING_COLUMNS
    }), 200

# Prometheus Metrics Endpoint
@app.route('/metrics', methods=['GET'])
def metrics():
    """Exposes Prometheus formatted telemetry metrics for scraping."""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

# 2. Prediction API endpoint
@app.route('/predict-availability', methods=['POST'])
def predict():
    start_time = time.time()

    if model is None:
        PREDICTION_REQUESTS.labels(status='error').inc()
        return jsonify({'error': 'Model is not loaded.'}), 500

    try:
        # Get JSON data sent from client / Node.js backend
        data = request.get_json()
        
        if not data:
            PREDICTION_REQUESTS.labels(status='error').inc()
            return jsonify({'error': 'Invalid input'}), 400
            
        # Create DataFrame from input
        input_df = pd.DataFrame([data])
        
        # Ensure all required features are present
        missing_features = [col for col in TRAINING_COLUMNS if col not in input_df.columns]
        if missing_features:
            PREDICTION_REQUESTS.labels(status='error').inc()
            return jsonify({'error': f'Missing features: {missing_features}'}), 400

        # Reorder DataFrame columns to match training order
        input_df_reordered = input_df[TRAINING_COLUMNS]
        
        # Predict availability probability
        probability = model.predict_proba(input_df_reordered)
        availability_score = float(round(probability[0][1], 4))
        
        # Record Prometheus metrics
        latency = time.time() - start_time
        PREDICTION_LATENCY.observe(latency)
        AVAILABILITY_SCORES.observe(availability_score)
        PREDICTION_REQUESTS.labels(status='success').inc()

        return jsonify({'availability_score': availability_score})

    except Exception as e:
        PREDICTION_REQUESTS.labels(status='error').inc()
        print(f"Prediction Error: {e}")
        return jsonify({'error': 'Failed to make a prediction.'}), 400

# 3. Run the Flask app
if __name__ == '__main__':
    # Listen on all interfaces on port 5001 so Docker Prometheus can scrape it
    app.run(host='0.0.0.0', port=5001, debug=True)
