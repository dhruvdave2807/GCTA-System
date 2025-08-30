# Firebase Setup Guide - Gujarat Coastal Threat Alert System

## ✅ Firebase Project Configured
Your Firebase project is already set up with the following configuration:
- **Project ID:** `hackout25-8eebb`
- **Project Name:** Gujarat Coastal Threat Alert System
- **Authentication:** Email/Password enabled
- **Firestore:** Database ready

## 🔧 Complete Setup Steps

### Step 1: Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hackout25-8eebb`
3. Navigate to **Authentication** > **Sign-in method**
4. Enable **Email/Password** authentication
5. Add your domain `localhost` to authorized domains for development

### Step 2: Set up Firestore Database
1. Go to **Firestore Database** in Firebase Console
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location close to India (e.g., `asia-south1`)
5. Click **Done**

### Step 3: Configure Firestore Security Rules
1. Go to **Firestore Database** > **Rules**
2. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow public read access to alerts and reports (for demo)
    match /alerts/{alertId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /reports/{reportId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### Step 4: Test the Application
1. Open your browser and go to: `http://localhost:5175`
2. Click **"Create an Account"**
3. Fill in the registration form:
   - **Full Name:** Your name
   - **Email:** Your email address
   - **Password:** At least 6 characters
   - **Phone Number:** Include country code (e.g., +91 9876543210)
   - **Location Details:** Your village/city/area
   - **Role:** Choose Authority or Public/Fisherfolk
4. Click **"Create Account"**
5. Complete the Smart Form Assistant for detailed location
6. Test login with your credentials

## 🎯 Features Ready to Use

### ✅ User Registration
- Complete user profile creation
- Smart Form Assistant integration
- Data stored securely in Firestore

### ✅ User Authentication
- Email/password login
- Automatic session management
- Secure logout

### ✅ Data Storage
- User profiles in `users` collection
- Structured location data
- Contact information management

### ✅ Security
- Firebase Authentication
- Firestore security rules
- User data isolation

## 📊 Database Structure

### Users Collection (`users/{uid}`)
```json
{
  "uid": "firebase-auth-uid",
  "name": "User Full Name",
  "email": "user@example.com",
  "phoneNumber": "+91 9876543210",
  "locationDetails": "Village/City/Area",
  "role": "Authority" | "Public",
  "contactNumber": "9876543210",
  "structuredLocation": "Ahmedabad > Ahmedabad City > Satellite > Shanti Niketan",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 Next Steps

### For Development:
1. Test user registration and login
2. Verify data is stored in Firestore
3. Test Smart Form Assistant functionality
4. Check authentication state persistence

### For Production:
1. Update security rules for production
2. Add email verification
3. Implement password reset functionality
4. Add user profile management
5. Set up proper domain restrictions

## 🔍 Troubleshooting

### Common Issues:
1. **"Firebase: Error (auth/user-not-found)"** - User doesn't exist, try registration first
2. **"Firebase: Error (auth/wrong-password)"** - Check password spelling
3. **"Firebase: Error (auth/email-already-in-use)"** - Email already registered, try login
4. **"Firebase: Error (auth/weak-password)"** - Password must be at least 6 characters

### Development Server:
- If port 5173 is busy, the server will automatically use the next available port
- Check terminal output for the correct URL (e.g., `http://localhost:5175`)

## 📈 Free Tier Monitoring
Monitor your usage in Firebase Console:
- **Authentication:** Users created
- **Firestore:** Read/write operations
- **Storage:** Data usage

Your current setup should handle thousands of users within the free tier limits!
