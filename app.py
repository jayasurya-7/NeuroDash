
from flask import Flask, render_template, request, jsonify
import csv
import os
import json
import pandas as pd

path_r= 'D:/DEMO/DESTINATION'


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_suggestions', methods=['POST'])
def get_suggestions():
    search_term = request.form['search_term']
    suggestions = []

    with open('D:/DEMO/DESTINATION/patients.csv', mode='r') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            if search_term.lower() in row['uniqueid'].lower():
                suggestions.append({'UniCode': row['uniqueid'], 'Name': row['name']})

    return jsonify({'suggestions': suggestions})



@app.route('/get_json_data', methods=['POST'])
def get_json_data():
    unicode_code = request.form['unicode']
    print(unicode_code)
    json_path = os.path.join(path_r, unicode_code, unicode_code + '.json')  # Adjust the path to include the unicode folder
    json_data = []

    print("JSON Path:", json_path)  # Check the JSON file path
    if os.path.exists(json_path):
        print("File exists")
        with open(json_path, 'r') as json_file:
            print("File opened successfully")
            json_data.append(json.load(json_file))
            print(json_data)  # Log the loaded JSON data
    else:
        print("File does not exist")

    return jsonify({'json_data': json_data})

@app.route('/get_individual_dates', methods=['POST'])
def get_individual_dates():
    unicode_code = request.form['unicode']
    device = request.form['device']
    unicode_path = os.path.join(path_r, unicode_code, device)  # Path to device folder

    individual_dates = []

    if os.path.exists(unicode_path):
        # List all files in the device folder (assuming each file represents a date)
        individual_dates = os.listdir(unicode_path)

    return jsonify({'individual_dates': individual_dates})  

from datetime import datetime


@app.route('/fetch_summary_csv', methods=['POST'])
def fetch_summary_csv():
    unicode_code = request.form['unicode']
    start_date = request.form.get('start_date')  # Get optional start date parameter
    end_date = request.form.get('end_date')      # Get optional end date parameter

    summary_csv_path = os.path.join(path_r, unicode_code, 'summary.csv')

    if os.path.exists(summary_csv_path):
        # Read the summary CSV file
        df = pd.read_csv(summary_csv_path)

     
             # Filter data based on optional start and end dates if provided
        if start_date and end_date:
            filtered_data = []
            for index, row in df.iterrows():
                date_str = row['date']
                date_obj = datetime.strptime(date_str, '%d-%m-%Y')
                if start_date <= date_obj.strftime('%Y-%m-%d') <= end_date:
                    filtered_data.append(row)

            # total_points = filtered_data.sum().sum()
            # Convert the filtered data to JSON
            json_data = pd.DataFrame(filtered_data).to_json(orient='records')
        else:
            # Convert the DataFrame to JSON
            json_data = df.to_json(orient='records')
            # total_points = df.sum().sum()  

        # Convert DataFrame to list of dictionaries
        # json_data = df.to_dict(orient='records')
        # json_data = df.to_json(orient='records')
        print(df.head())

        return jsonify({'summary_data': json_data})
    else:
        return jsonify({'error': 'Summary CSV file not found'})


@app.route('/fetch_data_from_date_folder', methods=['POST'])
def fetch_data_from_date_folder():
    unicode_code = request.form['unicode']
    device = request.form['device']
    print(device)
    date = request.form['date']
    print(date)
    date_folder_path = os.path.join(path_r, unicode_code, device,"Dates",date+'.csv')
    print(date_folder_path)
    if os.path.exists(date_folder_path):
        # Read the summary CSV file
        df = pd.read_csv(date_folder_path)
        data= df.to_dict(orient='records')
    # Example: Read data from files in the date folder and return as JSON response
   # Modify this to read data from the date folder
        return jsonify({'data': data})
        
    else:
        return jsonify({'error': 'date CSV file not found'})

@app.route('/fetch_data_for_device', methods=['POST'])
def fetch_data_for_device():
    # Get device name and Unicode from the request
    device = request.form['device']
    unicode_code = request.form['unicode']
    start_date = request.form.get('start_date')  # Get optional start date parameter
    end_date = request.form.get('end_date')
    device_csv_path = os.path.join(path_r, unicode_code,device, device + '.csv')
    print(device_csv_path)
    if os.path.exists(device_csv_path):
        # Read the summary CSV file
        df = pd.read_csv(device_csv_path)
        print(df)


        if start_date and end_date:
            print(start_date, end_date)
            filtered_data = []
            for index, row in df.iterrows():
                date_str = row['Date']
                date_obj = datetime.strptime(date_str, '%d-%m-%Y')
                if start_date <= date_obj.strftime('%Y-%m-%d') <= end_date:
                    filtered_data.append(row)

            # total_points = filtered_data.sum().sum()
            # Convert the filtered data to JSON
            json_data = pd.DataFrame(filtered_data).to_json(orient='records')
        else:
            # Convert the DataFrame to JSON
            json_data = df.to_json(orient='records')
            print(json_data)
    
        return jsonify({'device_data': json_data})
    else:
        return jsonify({'error': 'Summary CSV file not found'})
    
    
   

if __name__ == '__main__':
    app.run(debug=True)
