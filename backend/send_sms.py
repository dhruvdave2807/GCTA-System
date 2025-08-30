import os
from dotenv import load_dotenv
from twilio.rest import Client

# Load environment variables from .env.local
load_dotenv(dotenv_path=".env.local")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def send_threat_alert_sms(recipient_number: str, threat_type: str, location: str, level: str, message: str):
    """
    Send an SMS alert about a coastal threat to a citizen using Twilio.
    """
    message_text = (
        f"Coastal Threat Alert!\n"
        f"Type: {threat_type}\n"
        f"Location: {location}\n"
        f"Level: {level}\n"
        f"Message: {message}\n"
        f"Stay safe and follow official instructions."
    )
    try:
        message_obj = client.messages.create(
            body=message_text,
            from_=TWILIO_PHONE_NUMBER,
            to=recipient_number
        )
        print(f"Message sent to {recipient_number}: {message_obj.sid}")
    except Exception as e:
        print(f"Error sending message to {recipient_number}: {e}")
        raise

# Example usage:
if __name__ == "__main__":
    # Example data, replace with real data from your app
    recipient = "+918734095603"  # Citizen's phone number
    threat_type = "Cyclone Alert"
    location = "Surat Coast"
    level = "Emergency"
    custom_message = "Heavy rains and strong winds expected. Evacuate if necessary."

    send_threat_alert_sms(recipient, threat_type, location, level, custom_message)