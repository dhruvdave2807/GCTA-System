from flask import Flask, request, jsonify
from send_sms import send_threat_alert_sms
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/send-alert', methods=['POST'])
def send_alert():
    data = request.json
    recipient = data.get('recipient')
    threat_type = data.get('threat_type')
    location = data.get('location')
    level = data.get('level')
    message = data.get('message')  # <-- Add this line
    print("Received message from frontend:", message)  # Debug print
    if not all([recipient, threat_type, location, level, message]):
        return jsonify({'error': 'Missing required fields'}), 400
    send_threat_alert_sms(recipient, threat_type, location, level, message)  # <-- Pass message
    return jsonify({'status': 'SMS sent'})

if __name__ == "__main__":
    app.run(port=5000)