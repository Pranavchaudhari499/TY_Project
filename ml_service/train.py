# train.py

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import joblib

print("--- Starting Model Training ---")

# 1. Load the dataset
print("Step 1: Loading data from donors.csv...")
try:
    df = pd.read_csv('donors.csv')
except FileNotFoundError:
    print("Error: donors.csv not found. Please run generate_data.py first.")
    exit()

# Handle potential missing values, just in case
df.fillna(0, inplace=True)

# 2. Select Features (X) and Target (y)
# These are the inputs our model will learn from.
print("Step 2: Selecting features for the model...")
features = [
    'age', 
    'days_since_last_donation', 
    'total_notifications', 
    'times_donated', 
    'response_rate'
]
target = 'will_respond' # This is what we want to predict (1 or 0)

X = df[features]
y = df[target]

# 3. Split data into Training and Testing sets
# We train the model on 80% of the data and test its performance on the unseen 20%.
print("Step 3: Splitting data into training and testing sets...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Initialize and Train the Model
print("Step 4: Training the Logistic Regression model...")
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# 5. Evaluate the Model (Optional but good practice)
accuracy = model.score(X_test, y_test)
print(f"Step 5: Model training complete. Accuracy on test data: {accuracy * 100:.2f}%")

# 6. Save the Trained Model to a file
print("Step 6: Saving the trained model to 'availability_model.joblib'...")
joblib.dump(model, 'availability_model.joblib')

print("\n✅ --- Model training and saving complete! ---")