# train.py
import os
import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, ConfusionMatrixDisplay
)
import mlflow
import mlflow.sklearn

# Set working directory to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

print("--- Starting Model Training with MLflow Tracking ---")

# 1. Set MLflow Experiment
mlflow.set_experiment("Donor_Availability_Prediction")

# 2. Load dataset
data_path = os.path.join(SCRIPT_DIR, 'donors.csv')
print(f"Step 1: Loading data from {data_path}...")
try:
    df = pd.read_csv(data_path)
except FileNotFoundError:
    print("Error: donors.csv not found. Please run generate_data.py first.")
    exit(1)

df.fillna(0, inplace=True)

# 3. Select Features and Target
features = [
    'age', 
    'days_since_last_donation', 
    'total_notifications', 
    'times_donated', 
    'response_rate'
]
target = 'will_respond'

X = df[features]
y = df[target]

test_size = 0.2
random_state = 42

print("Step 2: Splitting data into training and testing sets...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=test_size, random_state=random_state, stratify=y
)

# 4. Hyperparameters
params = {
    "max_iter": 1000,
    "solver": "lbfgs",
    "C": 1.0,
    "random_state": random_state
}

# 5. MLflow Tracking Run
with mlflow.start_run(run_name="Logistic_Regression_Run"):
    print("Step 3: Logging parameters to MLflow...")
    mlflow.log_params(params)
    mlflow.log_param("test_size", test_size)
    mlflow.log_param("num_features", len(features))
    mlflow.log_param("feature_names", ",".join(features))
    mlflow.log_param("total_samples", len(df))

    # Train
    print("Step 4: Training Logistic Regression model...")
    model = LogisticRegression(**params)
    model.fit(X_train, y_train)

    # Evaluate
    print("Step 5: Evaluating model performance...")
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)

    # Log metrics
    mlflow.log_metric("accuracy", acc)
    mlflow.log_metric("precision", prec)
    mlflow.log_metric("recall", rec)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("roc_auc", roc_auc)

    print(f"   Accuracy:  {acc * 100:.2f}%")
    print(f"   Precision: {prec:.4f}")
    print(f"   Recall:    {rec:.4f}")
    print(f"   F1-Score:  {f1:.4f}")
    print(f"   ROC-AUC:   {roc_auc:.4f}")

    # Generate and log Confusion Matrix plot as an MLflow artifact
    print("Step 6: Generating and saving confusion matrix artifact...")
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Unavailable", "Available"])
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(cmap=plt.cm.Blues, ax=ax)
    plt.title("Confusion Matrix - Donor Availability")
    plt.tight_layout()
    cm_path = os.path.join(SCRIPT_DIR, "confusion_matrix.png")
    plt.savefig(cm_path)
    plt.close(fig)
    mlflow.log_artifact(cm_path, artifact_path="evaluation_plots")

    # Register Model in MLflow Model Registry
    print("Step 7: Logging model to MLflow Model Registry...")
    mlflow.sklearn.log_model(
        sk_model=model,
        name="donor_availability_model",
        registered_model_name="DonorAvailabilityModel"
    )

    # Save to local file for backward compatibility with Flask app
    model_file = os.path.join(SCRIPT_DIR, 'availability_model.joblib')
    joblib.dump(model, model_file)
    print(f"Step 8: Saved local model copy to {model_file}")

print("\n Model training, evaluation, and MLflow logging complete!")
