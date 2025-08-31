import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models import db, Report

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reports.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/api/reports', methods=['POST'])
def submit_report():
    data = request.form
    files = request.files.getlist('images')
    image_urls = []
    for file in files:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        image_urls.append(f"/uploads/{filename}")
    report = Report(
        reporter_name=data.get('reporter_name', 'Anonymous'),
        location=data['location'],
        threat_type=data['threat_type'],
        message=data['message'],
        image_urls=','.join(image_urls)
    )
    db.session.add(report)
    db.session.commit()
    # Optionally emit WebSocket event here
    return jsonify({'success': True, 'report_id': report.id})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    reports = Report.query.order_by(Report.timestamp.desc()).all()
    return jsonify([{
        'id': r.id,
        'reporter_name': r.reporter_name,
        'location': r.location,
        'threat_type': r.threat_type,
        'message': r.message,
        'image_urls': r.image_urls.split(',') if r.image_urls else [],
        'status': r.status,
        'timestamp': r.timestamp.isoformat()
    } for r in reports])

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
