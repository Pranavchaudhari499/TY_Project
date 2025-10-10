# app.py

from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# 1. Load the trained model once when the application starts
print("Loading the prediction model...")
try:
    model = joblib.load('availability_model.joblib')
except FileNotFoundError:
    print("Error: availability_model.joblib not found. Please run train.py first.")
    model = None

# --- ADDED: Define the exact feature order the model was trained on ---
TRAINING_COLUMNS = [
    'age', 
    'days_since_last_donation', 
    'total_notifications', 
    'times_donated', 
    'response_rate'
]
# ---------------------------------------------------------------------

# 2. Define the prediction API endpoint
@app.route('/predict-availability', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model is not loaded.'}), 500

    try:
        # Get the JSON data sent from the Node.js server
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid input'}), 400
            
        # The model expects a DataFrame with specific column names, so we create one
        input_df = pd.DataFrame([data])
        
        # --- FIXED: Reorder the DataFrame columns to match the training order ---
        input_df_reordered = input_df[TRAINING_COLUMNS]
        
        # Predict the probability. predict_proba returns [[prob_of_0, prob_of_1]]
        # Use the reordered DataFrame for prediction
        probability = model.predict_proba(input_df_reordered)
        
        # We want the probability of the positive class ('will_respond' = 1)
        availability_score = probability[0][1]
        
        # Return the score as a JSON response
        return jsonify({'availability_score': round(availability_score, 4)})

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': 'Failed to make a prediction.'}), 400

# 3. Run the Flask app
if __name__ == '__main__':
    # Run on a different port (e.g., 5001) to avoid conflict with your other servers
    app.run(port=5001, debug=True)