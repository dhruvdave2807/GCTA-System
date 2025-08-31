# models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reporter_name = db.Column(db.String(80), nullable=True)
    location = db.Column(db.String(255), nullable=False)
    threat_type = db.Column(db.String(80), nullable=False)
    message = db.Column(db.Text, nullable=False)
    image_urls = db.Column(db.Text)  # Comma-separated or JSON string
    status = db.Column(db.String(20), default="New")
    timestamp = db.Column(db.DateTime, default=db.func.now())