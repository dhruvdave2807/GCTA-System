const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function: sendSmsNotifications
 * 
 * Trigger: Firestore document creation in /alerts collection
 * Purpose: Simulate SMS notifications to users in affected areas
 * 
 * This function:
 * 1. Triggers when a new alert document is created
 * 2. Reads the alert data (location, message, threat level)
 * 3. Queries users collection to find users in the affected area
 * 4. Simulates sending SMS to matching users
 * 5. Logs the simulated SMS actions to Cloud Function console
 */
exports.sendSmsNotifications = functions.firestore
  .document('alerts/{alertId}')
  .onCreate(async (snap, context) => {
    try {
      // Get the alert data from the newly created document
      const alertData = snap.data();
      const alertId = context.params.alertId;
      
      console.log(`🚨 New alert created: ${alertId}`);
      console.log('Alert data:', JSON.stringify(alertData, null, 2));
      
      // Extract alert information
      const {
        type,
        level,
        message,
        location,
        timestamp,
        createdBy
      } = alertData;
      
      // Get location information for matching users
      let locationQuery = '';
      if (location && location.district) {
        locationQuery = location.district;
      } else if (location && location.city) {
        locationQuery = location.city;
      } else if (location && location.area) {
        locationQuery = location.area;
      }
      
      if (!locationQuery) {
        console.log('⚠️ No location information found in alert, skipping SMS notifications');
        return null;
      }
      
      console.log(`📍 Searching for users in location: ${locationQuery}`);
      
      // Query users collection to find users in the affected area
      // We'll search by structuredLocation field which contains the full location path
      const usersSnapshot = await db.collection('users')
        .where('structuredLocation', '>=', locationQuery)
        .where('structuredLocation', '<=', locationQuery + '\uf8ff')
        .get();
      
      // Also search by locationDetails field as fallback
      const usersSnapshot2 = await db.collection('users')
        .where('locationDetails', '>=', locationQuery)
        .where('locationDetails', '<=', locationQuery + '\uf8ff')
        .get();
      
      // Combine results and remove duplicates
      const allUsers = new Map();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.phoneNumber || userData.contactNumber) {
          allUsers.set(doc.id, userData);
        }
      });
      
      usersSnapshot2.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.phoneNumber || userData.contactNumber) {
          allUsers.set(doc.id, userData);
        }
      });
      
      const matchingUsers = Array.from(allUsers.values());
      
      console.log(`📱 Found ${matchingUsers.length} users to notify in ${locationQuery}`);
      
      if (matchingUsers.length === 0) {
        console.log('ℹ️ No users found in the affected area');
        return null;
      }
      
      // Construct SMS message
      const smsMessage = constructSmsMessage(level, type, message, locationQuery);
      
      // Simulate sending SMS to each matching user
      const smsPromises = matchingUsers.map(async (user) => {
        const phoneNumber = user.contactNumber || user.phoneNumber;
        const userName = user.name || 'User';
        
        // Simulate SMS sending (in real implementation, this would call Twilio or similar)
        console.log(`📨 SIMULATED SMS SENT:`);
        console.log(`   To: ${phoneNumber}`);
        console.log(`   User: ${userName}`);
        console.log(`   Message: ${smsMessage}`);
        console.log(`   ---`);
        
        // In a real implementation, you would call an SMS service here:
        // await twilioClient.messages.create({
        //   body: smsMessage,
        //   from: '+1234567890',
        //   to: phoneNumber
        // });
        
        return {
          userId: user.uid,
          phoneNumber,
          userName,
          message: smsMessage,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        };
      });
      
      // Wait for all SMS simulations to complete
      const smsResults = await Promise.all(smsPromises);
      
      // Log summary
      console.log(`✅ Successfully simulated ${smsResults.length} SMS notifications`);
      console.log(`📊 SMS Summary for Alert ${alertId}:`);
      smsResults.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.userName} (${result.phoneNumber})`);
      });
      
      return {
        alertId,
        usersNotified: smsResults.length,
        location: locationQuery,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
    } catch (error) {
      console.error('❌ Error in sendSmsNotifications function:', error);
      throw error;
    }
  });

/**
 * Helper function to construct SMS message
 * Creates a concise, informative SMS message with critical information
 */
function constructSmsMessage(level, type, message, location) {
  // Create a concise SMS message (SMS has 160 character limit)
  const levelEmoji = {
    'Warning': '⚠️',
    'Alert': '🚨', 
    'Emergency': '🚨🚨'
  };
  
  const emoji = levelEmoji[level] || '⚠️';
  const shortMessage = message && message.length > 50 ? message.substring(0, 50) + '...' : message;
  
  // Construct the SMS message
  let smsText = `${emoji} ${level.toUpperCase()}: ${type}`;
  
  if (shortMessage) {
    smsText += ` - ${shortMessage}`;
  }
  
  smsText += ` Location: ${location}`;
  
  // Add action instructions based on threat level
  if (level === 'Emergency') {
    smsText += ' EVACUATE IMMEDIATELY.';
  } else if (level === 'Alert') {
    smsText += ' Take immediate action.';
  } else if (level === 'Warning') {
    smsText += ' Stay alert.';
  }
  
  // Ensure message doesn't exceed SMS limits
  if (smsText.length > 160) {
    smsText = smsText.substring(0, 157) + '...';
  }
  
  return smsText;
}

/**
 * Additional Cloud Function: logAlertCreation
 * 
 * This function logs when alerts are created for monitoring purposes
 */
exports.logAlertCreation = functions.firestore
  .document('alerts/{alertId}')
  .onCreate((snap, context) => {
    const alertData = snap.data();
    const alertId = context.params.alertId;
    
    console.log(`📊 Alert Creation Log:`);
    console.log(`   Alert ID: ${alertId}`);
    console.log(`   Type: ${alertData.type}`);
    console.log(`   Level: ${alertData.level}`);
    console.log(`   Created By: ${alertData.createdBy || 'Unknown'}`);
    console.log(`   Timestamp: ${new Date(alertData.timestamp).toISOString()}`);
    
    return null;
  });
