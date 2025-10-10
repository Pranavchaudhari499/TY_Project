# generate_data.py

import pandas as pd
from faker import Faker
import random
from datetime import datetime, timedelta

# --- Configuration ---
NUM_DONORS = 15000
CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow']
BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
STATUS_OPTIONS = ['donated', 'accepted', 'unavailable', 'notified']

# Initialize Faker for realistic data
fake = Faker('en_IN')

# --- Main Data Generation ---
def generate_donor_data(num_donors):
    """Generates a list of fake donor profiles and their histories."""
    
    data = []
    print(f"Generating {num_donors} donor profiles... This may take a moment.")

    for i in range(num_donors):
        # 1. Create a basic profile
        age = random.randint(18, 60)
        blood_type = random.choice(BLOOD_TYPES)
        city = random.choice(CITIES)

        # 2. Assign a behavioral persona to influence their history
        persona = random.choices(['reliable', 'occasional', 'unresponsive'], weights=[0.25, 0.5, 0.25], k=1)[0]
        
        # 3. Simulate donation history based on the persona
        history = []
        num_events = random.randint(5, 50)
        
        for _ in range(num_events):
            event_date = datetime.now() - timedelta(days=random.randint(30, 1095)) # Events in the last 3 years
            
            if persona == 'reliable':
                status = random.choices(STATUS_OPTIONS, weights=[0.5, 0.2, 0.1, 0.2], k=1)[0]
            elif persona == 'occasional':
                status = random.choices(STATUS_OPTIONS, weights=[0.2, 0.2, 0.3, 0.3], k=1)[0]
            else: # unresponsive
                status = random.choices(STATUS_OPTIONS, weights=[0.05, 0.05, 0.4, 0.5], k=1)[0]
            
            history.append({'date': event_date, 'status': status})
        
        # 4. Engineer features from the generated history for the ML model
        donated_events = [event['date'] for event in history if event['status'] == 'donated']
        
        total_notifications = len(history)
        times_donated = len(donated_events)
        response_rate = times_donated / total_notifications if total_notifications > 0 else 0
        
        if donated_events:
            last_donation_date = max(donated_events)
            days_since_last_donation = (datetime.now() - last_donation_date).days
        else:
            last_donation_date = None
            days_since_last_donation = -1 # Use -1 to indicate never donated

        # 5. Create the target variable (what we want to predict)
        # A "reliable" donor is more likely to respond positively in the future
        will_respond = 1 if persona == 'reliable' or (persona == 'occasional' and random.random() > 0.5) else 0

        data.append({
            'user_id': f'user_{i+1}',
            'age': age,
            'city': city,
            'blood_type': blood_type,
            'days_since_last_donation': days_since_last_donation,
            'total_notifications': total_notifications,
            'times_donated': times_donated,
            'response_rate': round(response_rate, 2),
            'will_respond': will_respond
        })

    print("...Generation complete.")
    return data

# --- Script Execution ---
if __name__ == "__main__":
    donor_list = generate_donor_data(NUM_DONORS)
    
    # Convert to a pandas DataFrame and save as a CSV file
    df = pd.DataFrame(donor_list)
    df.to_csv('donors.csv', index=False)
    
    print(f"✅ Successfully created 'donors.csv' with {len(df)} records.")