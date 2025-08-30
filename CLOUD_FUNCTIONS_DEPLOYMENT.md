# Firebase Cloud Functions Deployment Guide

## 🚀 SMS Notification System Setup

This guide will help you deploy the Firebase Cloud Functions that handle SMS notifications for the Gujarat Coastal Threat Alert System.

## 📋 Prerequisites

1. **Firebase CLI installed globally:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project initialized:**
   ```bash
   firebase login
   firebase use hackout25-8eebb
   ```

3. **Node.js version 18 or higher**

## 🔧 Setup Steps

### Step 1: Install Dependencies

Navigate to the functions directory and install dependencies:

```bash
cd functions
npm install
```

### Step 2: Configure Firebase Project

Make sure your Firebase project is properly configured:

```bash
firebase projects:list
firebase use hackout25-8eebb
```

### Step 3: Deploy Cloud Functions

Deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

Or deploy from the functions directory:

```bash
cd functions
npm run deploy
```

## 📊 What Gets Deployed

### 1. `sendSmsNotifications` Function
- **Trigger:** Firestore document creation in `/alerts` collection
- **Purpose:** Simulates SMS notifications to users in affected areas
- **Functionality:**
  - Reads alert data (location, message, threat level)
  - Queries users collection for matching locations
  - Simulates SMS sending with detailed logging
  - Returns summary of notifications sent

### 2. `logAlertCreation` Function
- **Trigger:** Firestore document creation in `/alerts` collection
- **Purpose:** Logs alert creation for monitoring
- **Functionality:**
  - Logs alert details to Cloud Function console
  - Provides audit trail for alert management

## 🔍 Monitoring and Testing

### View Function Logs

```bash
firebase functions:log
```

Or view in Firebase Console:
1. Go to Firebase Console
2. Navigate to Functions
3. Click on a function name
4. View logs in the "Logs" tab

### Test the SMS Notification System

1. **Create a test user:**
   - Register a user with location details in Gujarat
   - Ensure they have a phone number in their profile

2. **Create a test alert:**
   - Login as an Authority user
   - Click "Create Alert" button
   - Fill in alert details matching the user's location
   - Submit the alert

3. **Check the logs:**
   - The Cloud Function will automatically trigger
   - Check Firebase Console > Functions > Logs
   - You should see simulated SMS messages logged

## 📱 SMS Message Format

The system generates SMS messages in this format:

```
🚨 ALERT: Cyclone Warning - High winds expected. Location: Surat Take immediate action.
```

**Message components:**
- Emoji based on threat level (⚠️ Warning, 🚨 Alert, 🚨🚨 Emergency)
- Threat level in uppercase
- Alert type
- Short message (truncated if too long)
- Location information
- Action instruction based on threat level

## 🔧 Configuration Options

### Modify SMS Message Format

Edit the `constructSmsMessage` function in `functions/index.js`:

```javascript
function constructSmsMessage(level, type, message, location) {
  // Customize message format here
  // Ensure message stays under 160 characters for SMS
}
```

### Add Real SMS Provider

To integrate with a real SMS service (e.g., Twilio):

1. Install the provider SDK:
   ```bash
   cd functions
   npm install twilio
   ```

2. Add environment variables:
   ```bash
   firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
   firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
   firebase functions:config:set twilio.phone_number="YOUR_TWILIO_NUMBER"
   ```

3. Uncomment and modify the SMS sending code in `functions/index.js`:
   ```javascript
   // Replace simulation with real SMS
   const twilioClient = require('twilio')(
     functions.config().twilio.account_sid,
     functions.config().twilio.auth_token
   );
   
   await twilioClient.messages.create({
     body: smsMessage,
     from: functions.config().twilio.phone_number,
     to: phoneNumber
   });
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Function not triggering:**
   - Check Firestore security rules allow write access to `/alerts`
   - Verify the alert document structure matches expected format

2. **No users found for notifications:**
   - Ensure users have `structuredLocation` or `locationDetails` fields
   - Check that location data matches alert location format

3. **Deployment errors:**
   - Ensure Node.js version 18+ is installed
   - Check Firebase CLI is up to date: `firebase --version`
   - Verify project permissions

### Debug Mode

Enable debug logging by adding to `functions/index.js`:

```javascript
console.log('Debug: Alert data received:', JSON.stringify(alertData, null, 2));
console.log('Debug: Users query result:', matchingUsers.length);
```

## 📈 Performance Considerations

- **Query Optimization:** The function queries users by location using Firestore indexes
- **Rate Limiting:** Consider implementing rate limiting for SMS sending
- **Cost Management:** Monitor function execution costs in Firebase Console
- **Scalability:** Functions automatically scale based on demand

## 🔒 Security Notes

- **API Keys:** Never commit SMS provider API keys to version control
- **User Data:** Function only accesses user data necessary for notifications
- **Firestore Rules:** Ensure proper security rules are in place
- **Environment Variables:** Use Firebase Functions config for sensitive data

## 📞 Support

For issues with:
- **Firebase Functions:** Check Firebase documentation
- **SMS Integration:** Refer to your SMS provider's documentation
- **Application Logic:** Review the function code and logs

## 🎯 Next Steps

1. **Production Deployment:**
   - Set up proper SMS provider integration
   - Configure monitoring and alerting
   - Implement error handling and retry logic

2. **Advanced Features:**
   - Add SMS delivery confirmation
   - Implement notification preferences
   - Add message templates
   - Create notification history tracking

3. **Testing:**
   - Set up automated testing for functions
   - Create test scenarios for different alert types
   - Validate SMS message formatting


