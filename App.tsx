import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase';

// Import external components
import ReportForm from './src/components/ReportForm';
import AdminReportsDashboard from './src/components/AdminReportsDashboard';

// DECLARE GLOBAL VARIABLES FOR TYPESCRIPT
declare const L: any;
declare const Chart: any;

// Import SmartFormAssistant component
import SmartFormAssistant from './SmartFormAssistant';

// ========= TYPE DEFINITIONS =========

enum UserRole {
  Authority = 'Authority',
  Public = 'Public',
}

enum ThreatLevel {
  Warning = 'Warning',
  Alert = 'Alert',
  Emergency = 'Emergency',
}

enum Language {
  English = 'en',
  Hindi = 'hi',
  Gujarati = 'gu'
}

interface UserProfile {
  uid: string;
  email: string | null;
  name: string;
  phoneNumber: string;
  locationDetails: string;
  role: UserRole;
  contactNumber?: string; // From SmartFormAssistant
  structuredLocation?: string; // From SmartFormAssistant
  language?: Language; // User's preferred language
}

interface ThreatAlert {
  id: string;
  type: string;
  level: ThreatLevel;
  location: {
    type: 'circle' | 'polygon';
    coords: [number, number] | [number, number][];
    radius?: number;
  };
  timestamp: number;
  message?: string;
  createdBy?: string;
}

interface CitizenReport {
  id: string;
  type: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: number;
  reportedBy: string;
  contactNumber?: string;
  structuredLocation?: string;
}

interface BlueCarbonEvent {
  id: string;
  state: string;
  city: string;
  location: { lat: number; lng: number; name: string };
  reason: string;
  date: string; // YYYY-MM-DD
  reductionAmount: number; // A metric for the reduction
}

interface AppNotification {
    id: string;
    message: string;
    timestamp: number;
    level: ThreatLevel;
}


type LatLngTuple = [number, number];

// ========= CONSTANTS & CONFIG =========

const THREAT_LEVEL_COLORS = {
  [ThreatLevel.Warning]: { bg: 'rgba(250, 204, 21, 0.6)', border: '#FBBF24' },
  [ThreatLevel.Alert]: { bg: 'rgba(249, 115, 22, 0.6)', border: '#F97316' },
  [ThreatLevel.Emergency]: { bg: 'rgba(239, 68, 68, 0.6)', border: '#EF4444' },
};

const SIMULATED_THREAT_TYPES = ['Cyclone Alert', 'Algal Bloom', 'Illegal Dumping', 'Oil Spill', 'High Surf Advisory'];
const CITIZEN_REPORT_TYPES = ['Pollution', 'Mangrove Cutting', 'Illegal Sand Mining', 'Debris', 'Wildlife in Distress'];
const API_POLL_INTERVAL = 15000; // 15 seconds
const MAP_DEFAULT_CENTER: LatLngTuple = [21.5, 71.0]; // Centered on Gujarat Coast
const MAP_DEFAULT_ZOOM = 7;

// FIX: Expanded GUJARAT_CITIES list to include more cities for search autocomplete and alphabetized for maintainability.
const GUJARAT_CITIES: Record<string, { center: LatLngTuple, zoom: number }> = {
    "Ahmedabad": { center: [23.0225, 72.5714], zoom: 11 },
    "Amreli": { center: [21.603, 71.222], zoom: 13 },
    "Anand": { center: [22.5645, 72.9289], zoom: 13 },
    "Bharuch": { center: [21.7051, 72.9959], zoom: 13 },
    "Bhavnagar": { center: [21.7645, 72.1519], zoom: 12 },
    "Bhuj": { center: [23.242, 69.666], zoom: 12 },
    "Botad": { center: [22.170, 71.666], zoom: 13 },
    "Deesa": { center: [24.25, 72.18], zoom: 13 },
    "Gandhidham": { center: [23.0805, 70.1337], zoom: 12 },
    "Gandhinagar": { center: [23.2156, 72.6369], zoom: 12 },
    "Godhra": { center: [22.775, 73.618], zoom: 13 },
    "Gondal": { center: [21.961, 70.796], zoom: 13 },
    "Himmatnagar": { center: [23.595, 72.956], zoom: 13 },
    "Jamnagar": { center: [22.4707, 70.0577], zoom: 12 },
    "Jetpur": { center: [21.751, 70.627], zoom: 13 },
    "Junagadh": { center: [21.5222, 70.4579], zoom: 12 },
    "Kalol": { center: [23.238, 72.498], zoom: 13 },
    "Mandvi": { center: [22.8285, 69.3533], zoom: 13 },
    "Mehsana": { center: [23.588, 72.369], zoom: 13 },
    "Morbi": { center: [22.815, 70.8311], zoom: 13 },
    "Nadiad": { center: [22.694, 72.862], zoom: 13 },
    "Navsari": { center: [20.9529, 72.9307], zoom: 13 },
    "Okha": { center: [22.4697, 69.0753], zoom: 13 },
    "Palanpur": { center: [24.172, 72.433], zoom: 13 },
    "Patan": { center: [23.849, 72.127], zoom: 13 },
    "Porbandar": { center: [21.6417, 69.6293], zoom: 13 },
    "Rajkot": { center: [22.3039, 70.8022], zoom: 11 },
    "Surat": { center: [21.1702, 72.8311], zoom: 11 },
    "Surendranagar": { center: [22.7212, 71.6375], zoom: 13 },
    "Vadodara": { center: [22.3072, 73.1812], zoom: 11 },
    "Valsad": { center: [20.63, 72.93], zoom: 13 },
    "Vapi": { center: [20.370, 72.906], zoom: 13 },
    "Veraval": { center: [20.9202, 70.3637], zoom: 13 },
};

const GUJARAT_DISTRICTS: Record<string, string[]> = {
    'Ahmedabad': ['Ahmedabad City', 'Dholka', 'Sanand', 'Viramgam'],
    'Amreli': ['Amreli', 'Babra', 'Dhari', 'Savarkundla'],
    'Anand': ['Anand', 'Borsad', 'Khambhat', 'Petlad'],
    'Bhavnagar': ['Bhavnagar City', 'Palitana', 'Mahuva', 'Talaja'],
    'Jamnagar': ['Jamnagar City', 'Dhrol', 'Kalavad', 'Lalpur'],
    'Junagadh': ['Junagadh City', 'Keshod', 'Manavadar', 'Visavadar'],
    'Rajkot': ['Rajkot City', 'Gondal', 'Jetpur', 'Dhoraji'],
    'Surat': ['Surat City', 'Bardoli', 'Mandvi', 'Olpad'],
    'Vadodara': ['Vadodara City', 'Dabhoi', 'Padra', 'Savli'],
};

// ========= TRANSLATIONS =========

const translations = {
  [Language.English]: {
    appTitle: "Gujarat Coastal Threat Alert System",
    search: "Search",
    notifications: "Notifications",
    noNotifications: "No new notifications.",
    logout: "Logout",
    settings: "Settings",
    profile: "Profile",
    changePassword: "Change Password",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    fullName: "Full Name",
    email: "Email Address",
    phoneNumber: "Phone Number",
    location: "Location",
    role: "Role",
    updateProfile: "Update Profile",
    profileUpdated: "Profile updated successfully!",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    passwordChanged: "Password changed successfully!",
    passwordsNotMatch: "Passwords do not match!",
    selectLanguage: "Select Language",
    english: "English",
    hindi: "हिंदी",
    gujarati: "ગુજરાતી",
    languageChanged: "Language changed successfully!",
    welcome: "Welcome",
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account? Sign in",
    dontHaveAccount: "Don't have an account? Sign up",
    threatOverview: "Threat Overview",
    createAlert: "Create Alert",
    activeAlerts: "Active Alerts",
    citizenReports: "Citizen Reports",
    report: "Report",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    submit: "Submit",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    // Additional keys from the comprehensive translation system
    title: "Gujarat Coastal Threat Alert System",
    searchCity: "Search city in Gujarat...",
    reportFor: "Report for",
    downloadReport: "Download Report (CSV)",
    backToDashboard: "← Back to Dashboard",
    currentCoastalCondition: "Current Coastal Condition",
    noActiveAlerts: "No active alerts reported for this city.",
    historyData: "History Data: Blue Carbon Decrease",
    noHistoricalData: "No historical data available.",
    detailedHistory: "Detailed History for",
    noDetailedHistory: "No detailed history available for this city.",
    alertType: "Alert Type",
    threatLevel: "Threat Level",
    message: "Message",
    district: "District",
    city: "City/Town",
    area: "Area/Colony",
    description: "Description",
    contactNumber: "Contact Number (Optional)",
    locationDetailsRequired: "Location Details (Required)",
    selectDistrict: "Select District",
    selectCity: "Select City/Town",
    areaPlaceholder: "Area / Colony / Society Name",
    mapPinLocation: "Map Pin Location",
    submitReport: "Submit Report",
    alertCreated: "Alert created successfully! SMS notifications will be sent to affected users.",
    reportSubmitted: "Report submitted (demo mode)!",
    fillAllFields: "Please fill out all required fields.",
    fillAllFieldsWithLocation: "Please fill out all required fields, including description and full location details.",
    contactNumberError: "Contact number must be exactly 10 digits.",
    failedToCreateAlert: "Failed to create alert. Please try again.",
    failedToCreateAccount: "Failed to create account. Please try again.",
    userProfileNotFound: "User profile not found. Please contact support.",
    failedToSignIn: "Failed to sign in. Please check your credentials.",
    errorSavingForm: "Error saving form data:",
    confirmLanguageChange: "Confirm Language Change",
    languageChangeMessage: "Are you sure you want to change the language to",
    languageChangeDescription: "The entire application interface will be updated to display in",
    confirm: "Confirm",
    cancelLanguage: "Cancel",
    languageChangedMessage: "The application will now display in",
    back: "Back",
    locationDetails: "Location Details",
    signInButton: "Sign In",
    createAccountButton: "Create Account",
    completeProfile: "Complete Your Profile",
    contactDetails: "Please provide your contact details and location information",
    backToSignUp: "← Back to Sign Up"
  },
  [Language.Hindi]: {
    appTitle: "गुजरात तटीय खतरा अलर्ट सिस्टम",
    search: "खोजें",
    notifications: "सूचनाएं",
    noNotifications: "कोई नई सूचना नहीं।",
    logout: "लॉगआउट",
    settings: "सेटिंग्स",
    profile: "प्रोफाइल",
    changePassword: "पासवर्ड बदलें",
    language: "भाषा",
    save: "सहेजें",
    cancel: "रद्द करें",
    close: "बंद करें",
    fullName: "पूरा नाम",
    email: "ईमेल पता",
    phoneNumber: "फोन नंबर",
    location: "स्थान",
    role: "भूमिका",
    updateProfile: "प्रोफाइल अपडेट करें",
    profileUpdated: "प्रोफाइल सफलतापूर्वक अपडेट किया गया!",
    currentPassword: "वर्तमान पासवर्ड",
    newPassword: "नया पासवर्ड",
    confirmPassword: "नया पासवर्ड की पुष्टि करें",
    passwordChanged: "पासवर्ड सफलतापूर्वक बदला गया!",
    passwordsNotMatch: "पासवर्ड मेल नहीं खाते!",
    selectLanguage: "भाषा चुनें",
    english: "English",
    hindi: "हिंदी",
    gujarati: "ગુજરાતી",
    languageChanged: "भाषा सफलतापूर्वक बदली गई!",
    welcome: "स्वागत है",
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    createAccount: "खाता बनाएं",
    alreadyHaveAccount: "पहले से खाता है? साइन इन करें",
    dontHaveAccount: "खाता नहीं है? साइन अप करें",
    threatOverview: "खतरा अवलोकन",
    createAlert: "अलर्ट बनाएं",
    activeAlerts: "सक्रिय अलर्ट",
    citizenReports: "नागरिक रिपोर्ट",
    report: "रिपोर्ट",
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफल",
    submit: "सबमिट करें",
    delete: "हटाएं",
    edit: "संपादित करें",
    view: "देखें"
  },
  [Language.Gujarati]: {
    appTitle: "ગુજરાત તટીય ધમકી સતર્કતા સિસ્ટમ",
    search: "શોધો",
    notifications: "સૂચનો",
    noNotifications: "કોઈ નવી સૂચના નથી.",
    logout: "લૉગઆઉટ",
    settings: "સેટિંગ્સ",
    profile: "પ્રોફાઇલ",
    changePassword: "પાસવર્ડ બદલો",
    language: "ભાષા",
    save: "સાચવો",
    cancel: "રદ કરો",
    close: "બંધ કરો",
    fullName: "પૂરું નામ",
    email: "ઈમેલ સરનામું",
    phoneNumber: "ફોન નંબર",
    location: "સ્થાન",
    role: "ભૂમિકા",
    updateProfile: "પ્રોફાઇલ અપડેટ કરો",
    profileUpdated: "પ્રોફાઇલ સફળતાપૂર્વક અપડેટ કર્યું!",
    currentPassword: "વર્તમાન પાસવર્ડ",
    newPassword: "નવો પાસવર્ડ",
    confirmPassword: "નવા પાસવર્ડની પુષ્ટિ કરો",
    passwordChanged: "પાસવર્ડ સફળતાપૂર્વક બદલ્યું!",
    passwordsNotMatch: "પાસવર્ડ મેળ ખાતા નથી!",
    selectLanguage: "ભાષા પસંદ કરો",
    english: "English",
    hindi: "हिंदी",
    gujarati: "ગુજરાતી",
    languageChanged: "ભાષા સફળતાપૂર્વક બદલી!",
    welcome: "સ્વાગત છે",
    signIn: "સાઇન ઇન કરો",
    signUp: "સાઇન અપ કરો",
    createAccount: "એકાઉન્ટ બનાવો",
    alreadyHaveAccount: "પહેલાથી એકાઉન્ટ છે? સાઇન ઇન કરો",
    dontHaveAccount: "એકાઉન્ટ નથી? સાઇન અપ કરો",
    threatOverview: "ધમકીનો અવલોકન",
    createAlert: "અલર્ટ બનાવો",
    activeAlerts: "સક્રિય અલર્ટ",
    citizenReports: "નાગરિક રિપોર્ટ",
    report: "રિપોર્ટ",
    loading: "લોડ થઈ રહ્યું છે...",
    error: "ભૂલ",
    success: "સફળ",
    submit: "સબમિટ કરો",
    delete: "કાઢી નાખો",
    edit: "સંપાદિત કરો",
    view: "જુઓ"
  }
};

// ========= LANGUAGE MANAGEMENT =========

const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(Language.English);

  const t = (key: string): string => {
    return translations[currentLanguage][key] || key;
  };

  const changeLanguage = (language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('preferredLanguage', language);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
    if (savedLanguage && Object.values(Language).includes(savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  return { 
    currentLanguage, 
    language: currentLanguage, // Add this for compatibility
    t, 
    changeLanguage,
    setLanguage: setCurrentLanguage // Add this for compatibility
  };
};

// ========= HELPER FUNCTIONS =========

/**
 * Checks if a given location is inside any of the provided threat alerts.
 * @param location The user's location as a LatLngTuple.
 * @param alerts An array of ThreatAlert objects to check against.
 * @returns The highest ThreatLevel if inside an alert zone, otherwise null.
 */
const getThreatLevelAtLocation = (location: LatLngTuple | null, alerts: ThreatAlert[]): ThreatLevel | null => {
    if (!location) return null;
    let highestLevel: ThreatLevel | null = null;
    
    for (const alert of alerts) {
        let isInside = false;
        if (alert.location.type === 'circle' && alert.location.radius) {
            const distance = L.latLng(location).distanceTo(alert.location.coords);
            if (distance <= alert.location.radius) {
                isInside = true;
            }
        } else if (alert.location.type === 'polygon') {
            // Basic bounding box check for polygon for performance
            const coords = alert.location.coords as LatLngTuple[];
            const bounds = L.latLngBounds(coords);
            if (bounds.contains(location)) {
               isInside = true;
            }
        }
        if (isInside) {
            const levelOrder = [ThreatLevel.Warning, ThreatLevel.Alert, ThreatLevel.Emergency];
            if (highestLevel === null || levelOrder.indexOf(alert.level) > levelOrder.indexOf(highestLevel)) {
                highestLevel = alert.level;
            }
        }
    }
    return highestLevel;
};


/**
 * Simulates sending an SMS notification by logging it to the console.
 * In a real application, this would integrate with an SMS gateway API (e.g., Twilio).
 * @param phoneNumber The recipient's phone number.
 * @param message The message to be sent.
 */
const sendSmsNotification = (phoneNumber: string, message: string) => {
    console.log(`
    ========================================
    SIMULATED SMS NOTIFICATION
    ----------------------------------------
    TO: ${phoneNumber}
    MESSAGE: ${message}
    ========================================
    `);
};


// ========= REACT HOOKS =========

const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import('firebase/firestore').then(({ collection, onSnapshot, query, orderBy, limit }) => {
        import('./src/firebase').then(({ db }) => {
            const alertsQuery = query(
                collection(db, 'alerts'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
                const alertsData: ThreatAlert[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    alertsData.push({
                        id: doc.id,
                        type: data.type,
                        level: data.level,
                        location: data.location,
                        timestamp: data.timestamp,
                        message: data.message,
                        createdBy: data.createdBy
                    });
                });
                setAlerts(alertsData);
                setLoading(false);
            }, (error) => {
                console.error('Error listening to alerts:', error);
                setLoading(false);
            });
        });
    });
    return () => {
        if (unsubscribe) unsubscribe();
    };
}, []);

  const createAlert = async (alertData: Omit<ThreatAlert, 'id' | 'timestamp'>, user: UserProfile) => {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('./src/firebase');

      const newAlert = {
        ...alertData,
        timestamp: Date.now(),
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'alerts'), newAlert);
      console.log('Alert created successfully');
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  };

  return { alerts, loading, createAlert };
};

const useCitizenReports = () => {
    const [reports, setReports] = useState<CitizenReport[]>([]);
    const [loading, setLoading] = useState(true);

    const generateRandomReport = useCallback((): CitizenReport => {
        const lat = 20 + Math.random() * 3; // Latitude range for Gujarat coast
        const lng = 68.5 + Math.random() * 4; // Longitude range for Gujarat coast
        return {
            id: `report-${Date.now()}-${Math.random()}`,
            type: CITIZEN_REPORT_TYPES[Math.floor(Math.random() * CITIZEN_REPORT_TYPES.length)],
            description: 'Mock report: A citizen has observed potential coastal issues in this area.',
            location: { lat, lng },
            timestamp: Date.now(),
            reportedBy: `mock-user-${Math.floor(Math.random() * 1000)}`,
            structuredLocation: 'Surat > Surat City > Dumas Beach'
        };
    }, []);

    useEffect(() => {
        // Generate initial mock data
        setReports(Array.from({ length: 3 }, generateRandomReport));
        setLoading(false);
    }, [generateRandomReport]);

    const addReport = (reportData: Omit<CitizenReport, 'id' | 'timestamp' | 'reportedBy'>, user: UserProfile) => {
        const newReport: CitizenReport = {
            id: `report-${Date.now()}`,
            timestamp: Date.now(),
            reportedBy: user.uid,
            ...reportData,
        };
        setReports(prev => [newReport, ...prev]);
        alert("Report submitted (demo mode)!\n" + JSON.stringify(reportData, null, 2));
    };

    return { reports, loading, addReport };
};

const useGeolocation = () => {
  const [location, setLocation] = useState<LatLngTuple | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    const success = (position: GeolocationPosition) => {
      setLocation([position.coords.latitude, position.coords.longitude]);
    };

    const err = () => {
      setError('Unable to retrieve your location.');
    };

    navigator.geolocation.getCurrentPosition(success, err);
  }, []);

  return { location, error };
};

const useBlueCarbonData = () => {
    // This is a mock hook to simulate fetching historical blue carbon data.
    const MOCK_BLUE_CARBON_DATA: BlueCarbonEvent[] = [
        { id: 'bc1', state: 'Gujarat', city: 'Jamnagar', location: { lat: 22.47, lng: 69.07, name: 'Gulf of Kutch' }, reason: 'Industrial Waste', date: '2023-01-15', reductionAmount: 120 },
        { id: 'bc6', state: 'Gujarat', city: 'Jamnagar', location: { lat: 22.48, lng: 69.15, name: 'Narara Marine Park' }, reason: 'Pollution', date: '2022-11-30', reductionAmount: 150 },
        { id: 'bc10', state: 'Gujarat', city: 'Jamnagar', location: { lat: 22.50, lng: 69.10, name: 'Rozi Port' }, reason: 'Oil Spill', date: '2023-08-05', reductionAmount: 300 },
        { id: 'bc2', state: 'Gujarat', city: 'Veraval', location: { lat: 20.91, lng: 70.36, name: 'Veraval Coast' }, reason: 'Illegal Dumping', date: '2023-03-22', reductionAmount: 85 },
        { id: 'bc11', state: 'Gujarat', city: 'Veraval', location: { lat: 20.90, lng: 70.38, name: 'Fishing Harbour' }, reason: 'Plastic Waste', date: '2023-06-12', reductionAmount: 60 },
        { id: 'bc3', state: 'Gujarat', city: 'Bhavnagar', location: { lat: 21.78, lng: 72.2, name: 'Ghogha Coast' }, reason: 'Algal Bloom', date: '2023-05-10', reductionAmount: 210 },
        { id: 'bc4', state: 'Gujarat', city: 'Porbandar', location: { lat: 21.63, lng: 69.59, name: 'Porbandar Coast' }, reason: 'High Surf Damage', date: '2023-07-02', reductionAmount: 50 },
        { id: 'bc12', state: 'Gujarat', city: 'Surat', location: { lat: 21.10, lng: 72.75, name: 'Dumas Beach' }, reason: 'Industrial Waste', date: '2023-04-20', reductionAmount: 180 },
        { id: 'bc13', state: 'Gujarat', city: 'Surat', location: { lat: 21.15, lng: 72.78, name: 'Tapi Estuary' }, reason: 'Chemical Runoff', date: '2023-09-01', reductionAmount: 250 },
        { id: 'bc5', state: 'Goa', city: 'Panaji', location: { lat: 15.49, lng: 73.82, name: 'Mandovi Estuary' }, reason: 'Illegal Sand Mining', date: '2023-04-18', reductionAmount: 95 },
        { id: 'bc7', state: 'Maharashtra', city: 'Mumbai', location: { lat: 18.92, lng: 72.83, name: 'Mumbai Coast' }, reason: 'Industrial Waste', date: '2023-02-28', reductionAmount: 180 },
    ];
    return MOCK_BLUE_CARBON_DATA;
};

/**
 * A hook to manage real-time notifications based on incoming threat alerts.
 * In a real app, this would use a Firestore onSnapshot listener instead of polling.
 */
const useNotifications = (user: UserProfile | null, userLocation: LatLngTuple | null) => {
    const { alerts } = useRealTimeAlerts();
    const prevAlertsRef = useRef<ThreatAlert[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [currentToast, setCurrentToast] = useState<AppNotification | null>(null);

    useEffect(() => {
        // On component mount, initialize prevAlertsRef with the initial alerts
        prevAlertsRef.current = alerts;
    }, []); // This effect runs only once on mount

    useEffect(() => {
        if (alerts.length > 0 && prevAlertsRef.current.length > 0) {
            // Find alerts that are in the new list but not in the old one
            const newAlerts = alerts.filter(alert => 
                !prevAlertsRef.current.some(prev => prev.id === alert.id)
            );

            newAlerts.forEach(alert => {
                let isRelevant = false;
                // Authority role gets notified for all new alerts
                if (user?.role === UserRole.Authority) {
                    isRelevant = true;
                }
                // Public role notifications are based on their current location
                if (user?.role === UserRole.Public && userLocation) {
                    if (getThreatLevelAtLocation(userLocation, [alert]) !== null) {
                        isRelevant = true;
                    }
                }

                if (isRelevant) {
                    const newNotification: AppNotification = {
                        id: `notif-${alert.id}`,
                        message: `${alert.type}`,
                        timestamp: Date.now(),
                        level: alert.level,
                    };

                    // Set the toast for the new notification
                    setCurrentToast(newNotification);
                    // Add to the persistent list of notifications (capped at 10)
                    setNotifications(prev => [newNotification, ...prev].slice(0, 10));

                    // Simulate sending an SMS
                    if (user?.phoneNumber) {
                        sendSmsNotification(user.phoneNumber, `${newNotification.level}: ${newNotification.message}`);
                    }
                }
            });
        }
        // Update the ref to the current alerts for the next comparison
        prevAlertsRef.current = alerts;
    }, [alerts, user, userLocation]);

    const dismissToast = () => {
        setCurrentToast(null);
    };

    return { notifications, currentToast, dismissToast };
};


// ========= ICONS (SVG Components) =========

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ExclamationTriangleIcon: React.FC<{ className?: string; level: ThreatLevel }> = ({ className, level }) => {
    const color = {
        [ThreatLevel.Warning]: 'text-yellow-400',
        [ThreatLevel.Alert]: 'text-orange-500',
        [ThreatLevel.Emergency]: 'text-red-500',
    }[level];
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${className} ${color}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    );
}

// ========= UI & HELPER COMPONENTS =========

const Spinner: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => (
  <div className={`flex justify-center items-center ${fullScreen ? 'h-screen w-screen' : 'h-full w-full'}`}>
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">&times;</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// ========= SETTINGS COMPONENTS =========

const ProfileModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  user: UserProfile; 
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
  t: (key: string) => string;
}> = ({ isOpen, onClose, user, onUpdateProfile, t }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phoneNumber: user.phoneNumber,
    locationDetails: user.locationDetails
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await onUpdateProfile(formData);
      setMessage({ type: 'success', text: t('profileUpdated') });
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: t('error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('fullName')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('email')}</label>
          <input
            type="email"
            value={user.email || ''}
            disabled
            className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-md text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('phoneNumber')}</label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('location')}</label>
          <input
            type="text"
            value={formData.locationDetails}
            onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('role')}</label>
          <input
            type="text"
            value={user.role}
            disabled
            className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-md text-gray-400"
          />
        </div>
        {message && (
          <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner /> : t('updateProfile')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const PasswordModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  t: (key: string) => string;
}> = ({ isOpen, onClose, t }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: t('passwordsNotMatch') });
      setLoading(false);
      return;
    }

    try {
      const { updatePassword } = await import('firebase/auth');
      const { auth } = await import('./src/firebase');
      
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, formData.newPassword);
        setMessage({ type: 'success', text: t('passwordChanged') });
        setTimeout(() => onClose(), 2000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('changePassword')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('currentPassword')}</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('newPassword')}</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('confirmPassword')}</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>
        {message && (
          <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner /> : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const LanguageModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  t: (key: string) => string;
}> = ({ isOpen, onClose, currentLanguage, onLanguageChange, t }) => {
  const [message, setMessage] = useState<{ type: 'success', text: string } | null>(null);

  const handleLanguageChange = (language: Language) => {
    onLanguageChange(language);
    setMessage({ type: 'success', text: t('languageChanged') });
    setTimeout(() => onClose(), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('selectLanguage')}>
      <div className="space-y-4">
        <div className="grid gap-3">
          <button
            onClick={() => handleLanguageChange(Language.English)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              currentLanguage === Language.English 
                ? 'border-blue-500 bg-blue-600 text-white' 
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold">{t('english')}</div>
            <div className="text-sm opacity-75">English</div>
          </button>
          <button
            onClick={() => handleLanguageChange(Language.Hindi)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              currentLanguage === Language.Hindi 
                ? 'border-blue-500 bg-blue-600 text-white' 
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold">{t('hindi')}</div>
            <div className="text-sm opacity-75">हिंदी</div>
          </button>
          <button
            onClick={() => handleLanguageChange(Language.Gujarati)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              currentLanguage === Language.Gujarati 
                ? 'border-blue-500 bg-blue-600 text-white' 
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold">{t('gujarati')}</div>
            <div className="text-sm opacity-75">ગુજરાતી</div>
          </button>
        </div>
        {message && (
          <div className="p-3 rounded-md bg-green-600">
            {message.text}
          </div>
        )}
        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ========= UI & HELPER COMPONENTS =========

const Header: React.FC<{ 
    user: UserProfile | null; 
    onLogout: () => void; 
    onSearch: (query: string) => void; 
    notifications: AppNotification[];
    onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
}> = ({ user, onLogout, onSearch, notifications, onUpdateProfile }) => {
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isNotifVisible, setIsNotifVisible] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const notifContainerRef = useRef<HTMLDivElement>(null);
    const settingsContainerRef = useRef<HTMLDivElement>(null);
    const blueCarbonData = useBlueCarbonData();
    const citiesWithData = new Set(blueCarbonData.filter(d => d.state === 'Gujarat').map(event => event.city));
    
    // Settings modals state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    
    // Language management
    const { currentLanguage, t, changeLanguage } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchVisible(false);
            }
            if (notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
                setIsNotifVisible(false);
            }
            if (settingsContainerRef.current && !settingsContainerRef.current.contains(event.target as Node)) {
                setIsSettingsVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value) {
            const filteredCities = Object.keys(GUJARAT_CITIES).filter(city =>
                city.toLowerCase().startsWith(value.toLowerCase())
            );

            // Sort cities: those with data come first, then alphabetically
            filteredCities.sort((a, b) => {
                const aHasData = citiesWithData.has(a);
                const bHasData = citiesWithData.has(b);
                if (aHasData && !bHasData) return -1;
                if (!aHasData && bHasData) return 1;
                return a.localeCompare(b); // Alphabetical for same-group cities
            });
            
            setSuggestions(filteredCities);
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (city: string) => {
        setSearchTerm(city);
        setSuggestions([]);
        onSearch(city);
        setIsSearchVisible(false);
    };
    
    return (
        <header className="absolute top-0 left-0 right-0 z-20 bg-gray-900 bg-opacity-80 backdrop-blur-sm p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-400">{t('appTitle')}</h1>
            <div className="flex items-center space-x-2">
                {user && (
                    <>
                    <div ref={searchContainerRef} className="relative">
                        <button
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            title={t('search')}
                        >
                            <SearchIcon className="h-6 w-6 text-gray-300" />
                        </button>
                        {isSearchVisible && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="Search city in Gujarat..."
                                    className="w-full px-4 py-2 bg-gray-700 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                {suggestions.length > 0 && (
                                    <ul className="max-h-60 overflow-y-auto">
                                        {suggestions.map(city => (
                                            <li
                                                key={city}
                                                onClick={() => handleSelectSuggestion(city)}
                                                className="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                                            >
                                                {city} {citiesWithData.has(city) && <span className="text-xs text-red-400 ml-2">(Alert)</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    <div ref={notifContainerRef} className="relative">
                        <button
                            onClick={() => setIsNotifVisible(!isNotifVisible)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            title={t('notifications')}
                        >
                            <BellIcon className="h-6 w-6 text-gray-300" />
                            {notifications.length > 0 && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>}
                        </button>
                        {isNotifVisible && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                               <div className="p-3 border-b border-gray-700">
                                   <h4 className="font-semibold text-white">{t('notifications')}</h4>
                               </div>
                                {notifications.length > 0 ? (
                                    <ul>
                                        {notifications.map(notif => (
                                            <li key={notif.id} className="border-b border-gray-700 last:border-b-0 p-3 flex items-start space-x-3">
                                                <ExclamationTriangleIcon level={notif.level} className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-sm" style={{color: THREAT_LEVEL_COLORS[notif.level].border}}>{notif.level}</p>
                                                    <p className="text-sm text-gray-300">{notif.message}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="p-4 text-center text-gray-400 text-sm">{t('noNotifications')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div ref={settingsContainerRef} className="relative">
                        <button
                            onClick={() => setIsSettingsVisible(!isSettingsVisible)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            title={t('settings')}
                        >
                            <SettingsIcon className="h-6 w-6 text-gray-300" />
                        </button>
                        {isSettingsVisible && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowProfileModal(true);
                                            setIsSettingsVisible(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors"
                                    >
                                        {t('profile')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPasswordModal(true);
                                            setIsSettingsVisible(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors"
                                    >
                                        {t('changePassword')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowLanguageModal(true);
                                            setIsSettingsVisible(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors"
                                    >
                                        {t('language')}
                                    </button>
                                    <hr className="border-gray-700 my-1" />
                                    <button
                                        onClick={onLogout}
                                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors"
                                    >
                                        {t('logout')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                )}
                {user && (
                    <div className="flex items-center space-x-4 pl-2">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">{user.email}</p>
                            <p className="text-xs text-blue-300">{user.role}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Settings Modals */}
            {user && (
                <>
                    <ProfileModal
                        isOpen={showProfileModal}
                        onClose={() => setShowProfileModal(false)}
                        user={user}
                        onUpdateProfile={onUpdateProfile}
                        t={t}
                    />
                    <PasswordModal
                        isOpen={showPasswordModal}
                        onClose={() => setShowPasswordModal(false)}
                        t={t}
                    />
                    <LanguageModal
                        isOpen={showLanguageModal}
                        onClose={() => setShowLanguageModal(false)}
                        currentLanguage={currentLanguage}
                        onLanguageChange={changeLanguage}
                        t={t}
                    />
                </>
            )}
        </header>
    );
};

const NotificationToast: React.FC<{ notification: AppNotification | null, onDismiss: () => void }> = ({ notification, onDismiss }) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                onDismiss();
            }, 8000); // Auto-dismiss after 8 seconds
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    if (!notification) return null;

    const {bg, border} = THREAT_LEVEL_COLORS[notification.level];

    return (
        <div className="fixed top-20 right-4 z-50 w-full max-w-sm" style={{ animation: 'fadeInDown 0.5s' }}>
            <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden" style={{borderColor: border, borderLeftWidth: '4px'}}>
                 <div className="p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                             <ExclamationTriangleIcon level={notification.level} className="h-6 w-6" />
                        </div>
                        <div className="ml-3 w-0 flex-1 pt-0.5">
                            <p className="text-sm font-bold" style={{color: border}}>{notification.level} Alert</p>
                            <p className="mt-1 text-sm text-gray-300">{notification.message}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button onClick={onDismiss} className="inline-flex text-gray-400 hover:text-gray-200">
                                <span className="sr-only">Close</span>
                                &times;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes fadeInDown {
                    0% { opacity: 0; transform: translateY(-20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ========= AUTHENTICATION COMPONENTS (MOCK DEMO VERSION) =========

const AuthScreen: React.FC<{ onLogin: (userProfile: UserProfile) => void; }> = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [showFormAssistant, setShowFormAssistant] = useState(false);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
            {!showFormAssistant ? (
            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-2xl p-8 space-y-6">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-blue-400">Welcome</h2>
                    <p className="text-gray-400 mt-2">
                        {isLoginView ? 'Sign in to your account' : 'Create an Account'}
                    </p>
                </div>
                    {isLoginView ? <Login onLogin={onLogin} /> : <Signup onLogin={onLogin} setShowFormAssistant={setShowFormAssistant} />}
                <div className="text-center">
                    <button
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="text-sm text-blue-400 hover:underline"
                    >
                        {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
            ) : (
                <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-extrabold text-blue-400">Complete Your Profile</h2>
                        <p className="text-gray-400 mt-2">
                            Please provide your contact details and location information
                        </p>
                        <button
                            onClick={() => setShowFormAssistant(false)}
                            className="text-sm text-blue-400 hover:underline mt-4"
                        >
                            ← Back to Sign Up
                        </button>
                    </div>
                    <SmartFormAssistant onComplete={async (formData) => {
                        try {
                            const { doc, updateDoc } = await import('firebase/firestore');
                            const { auth, db } = await import('./src/firebase');
                            
                            // Update the user document with SmartFormAssistant data
                            const userDocRef = doc(db, 'users', auth.currentUser?.uid || '');
                            await updateDoc(userDocRef, {
                                contactNumber: formData.contactNumber,
                                structuredLocation: `${formData.location.district} > ${formData.location.city} > ${formData.location.area} > ${formData.location.society}`
                            });

                            // Fetch the complete user profile
                            const { getDoc } = await import('firebase/firestore');
                            const userDoc = await getDoc(userDocRef);
                            
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const userProfile: UserProfile = {
                                    uid: auth.currentUser?.uid || '',
                                    email: auth.currentUser?.email,
                                    name: userData.name,
                                    phoneNumber: userData.phoneNumber,
                                    locationDetails: userData.locationDetails,
                                    role: userData.role,
                                    contactNumber: formData.contactNumber,
                                    structuredLocation: `${formData.location.district} > ${formData.location.city} > ${formData.location.area} > ${formData.location.society}`
                                };
                                onLogin(userProfile);
                            }
                        } catch (error) {
                            console.error('Error saving form data:', error);
                            // Still proceed with login even if form data save fails
                            setShowFormAssistant(false);
                        }
                    }} />
                </div>
            )}
        </div>
    );
};

const Login: React.FC<{ onLogin: (userProfile: UserProfile) => void; }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { doc, getDoc } = await import('firebase/firestore');
            const { auth, db } = await import('./src/firebase');

            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email,
                    name: userData.name,
                    phoneNumber: userData.phoneNumber,
                    locationDetails: userData.locationDetails,
                    role: userData.role,
                    contactNumber: userData.contactNumber,
                    structuredLocation: userData.structuredLocation
                };
                onLogin(userProfile);
            } else {
                setError('User profile not found. Please contact support.');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-6">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
                <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {loading ? <Spinner /> : 'Sign In'}
            </button>
        </form>
    );
};

const Signup: React.FC<{ onLogin: (userProfile: UserProfile) => void; setShowFormAssistant: (show: boolean) => void; }> = ({ onLogin, setShowFormAssistant }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [locationDetails, setLocationDetails] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Public);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const { doc, setDoc } = await import('firebase/firestore');
            const { auth, db } = await import('./src/firebase');

            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                name,
                email,
                phoneNumber,
                locationDetails,
                role,
                createdAt: new Date().toISOString()
            });

            // Show form assistant for additional details
            setShowFormAssistant(true);
        } catch (error: any) {
            console.error('Signup error:', error);
            setError(error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSignup} className="space-y-6">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
             <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                required
                minLength={6}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone Number (include country code)"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Location Details (village/city/area)"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value={UserRole.Public}>Public / Fisherfolk</option>
                <option value={UserRole.Authority}>Authority</option>
            </select>
            {error && (
                <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {loading ? <Spinner /> : 'Create Account'}
            </button>
        </form>
    );
};

// ========= MAP & CHART COMPONENTS =========

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

const InteractiveMap: React.FC<{
    center: LatLngTuple;
    zoom: number;
    alerts: ThreatAlert[];
    reports: CitizenReport[];
    blueCarbonEvents?: BlueCarbonEvent[];
    onMapClick?: (latlng: { lat: number, lng: number }) => void;
    onViewItem?: (item: ThreatAlert | CitizenReport) => void;
    searchedCity?: { name: string, center: LatLngTuple };
}> = ({ center, zoom, alerts, reports, blueCarbonEvents = [], onMapClick, onViewItem, searchedCity }) => {
    const mapRef = useRef<any>(null);
    const layersRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapRef.current) {
            // Always use Satellite map everywhere
            mapRef.current = L.map('map').setView(center, zoom);
            L.tileLayer(SATELLITE_TILE_URL, {
                attribution: SATELLITE_ATTRIBUTION,
                maxZoom: 19,
            }).addTo(mapRef.current);

            if (onMapClick) {
                mapRef.current.on('click', (e: any) => onMapClick(e.latlng));
            }
        } else {
            // Only set view if not in a searched city context with events, as fitBounds will handle it
            if (!(searchedCity && blueCarbonEvents.length > 0)) {
                mapRef.current.setView(center, zoom);
            }
        }
    }, [center, zoom, onMapClick, searchedCity, blueCarbonEvents.length]);

    useEffect(() => {
        // Clear previous layers
        layersRef.current.forEach(layer => mapRef.current.removeLayer(layer));
        layersRef.current = [];

        // Add alert layers
        alerts.forEach(alert => {
            const { bg, border } = THREAT_LEVEL_COLORS[alert.level];
            let layer;
            if (alert.location.type === 'circle' && alert.location.radius) {
                layer = L.circle(alert.location.coords, {
                    color: border,
                    fillColor: bg,
                    fillOpacity: 0.5,
                    radius: alert.location.radius,
                });
            } else if (alert.location.type === 'polygon') {
                layer = L.polygon(alert.location.coords, {
                    color: border,
                    fillColor: bg,
                    fillOpacity: 0.5,
                });
            }
            if (layer) {
                layer.bindPopup(`<b>${alert.type}</b><br>Level: ${alert.level}`);
                if (onViewItem) {
                    layer.on('click', () => onViewItem(alert));
                }
                layer.addTo(mapRef.current);
                layersRef.current.push(layer);
            }
        });

        // Add citizen report markers
        reports.forEach(report => {
            const icon = L.divIcon({
                html: `<div class="p-1 bg-blue-500 rounded-full border-2 border-white"><svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg></div>`,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([report.location.lat, report.location.lng], { icon });
            marker.bindPopup(`<b>${report.type}</b><br>${report.description.substring(0, 50)}...<br><small>${report.structuredLocation || ''}</small>`);
            if (onViewItem) {
                marker.on('click', () => onViewItem(report));
            }
            marker.addTo(mapRef.current);
            layersRef.current.push(marker);
        });
        
        // Add Blue Carbon event markers and handle map bounds
        const blueCarbonMarkers: any[] = [];
        blueCarbonEvents.forEach(event => {
             const icon = L.divIcon({
                html: `<div class="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg></div>`,
                className: 'pulsing-red-pin',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });
            const marker = L.marker([event.location.lat, event.location.lng], { icon });
            marker.bindPopup(`<b>${event.reason}</b><br>Location: ${event.location.name}<br>Date: ${event.date}`);
            marker.addTo(mapRef.current);
            layersRef.current.push(marker);
            blueCarbonMarkers.push(marker);
        });
        
        // Auto-zoom to fit the blue carbon event markers if they exist
        if (blueCarbonMarkers.length > 0) {
            const featureGroup = L.featureGroup(blueCarbonMarkers);
            requestAnimationFrame(() => {
                if (mapRef.current) {
                    mapRef.current.fitBounds(featureGroup.getBounds().pad(0.2));
                }
            });
        }


    }, [alerts, reports, blueCarbonEvents, onViewItem, searchedCity]);

    return <div id="map" className="h-full w-full z-0"></div>;
};

const ThreatChart: React.FC<{ alerts: ThreatAlert[] }> = ({ alerts }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current && alerts.length > 0) {
            const threatCounts = alerts.reduce((acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                if(chartInstanceRef.current) {
                    chartInstanceRef.current.destroy();
                }
                chartInstanceRef.current = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(threatCounts),
                        datasets: [{
                            label: 'Threats by Type',
                            data: Object.values(threatCounts),
                            backgroundColor: [
                                'rgba(239, 68, 68, 0.7)',
                                'rgba(249, 115, 22, 0.7)',
                                'rgba(250, 204, 21, 0.7)',
                                'rgba(59, 130, 246, 0.7)',
                                'rgba(168, 85, 247, 0.7)',
                            ],
                            borderColor: '#4B5563',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: '#D1D5DB',
                                    padding: 10,
                                }
                            }
                        }
                    }
                });
            }
        }
        return () => {
             if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        }
    }, [alerts]);

    return (
        <div className="h-64 relative">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

const BlueCarbonTrendChart: React.FC<{ data: BlueCarbonEvent[]; city: string }> = ({ data, city }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current && data.length > 0) {
            // Process data for chart: aggregate reduction by month
            const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const monthlyReduction: Record<string, number> = {};
            sortedData.forEach(event => {
                const month = event.date.substring(0, 7); // YYYY-MM
                monthlyReduction[month] = (monthlyReduction[month] || 0) + event.reductionAmount;
            });

            const labels = Object.keys(monthlyReduction);
            const chartData = Object.values(monthlyReduction);

            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.destroy();
                }
                chartInstanceRef.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Blue Carbon Reduction Index',
                            data: chartData,
                            fill: true,
                            backgroundColor: 'rgba(239, 68, 68, 0.3)',
                            borderColor: 'rgb(239, 68, 68)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                           y: { ticks: { color: '#D1D5DB' } },
                           x: { ticks: { color: '#D1D5DB' } }
                        },
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: `Blue Carbon Reduction Trend in ${city}`,
                                color: '#D1D5DB',
                                font: { size: 16 }
                            }
                        }
                    }
                });
            }
        }
    }, [data, city]);

    if (data.length === 0) {
        return <div className="h-full flex items-center justify-center text-gray-400">No historical data available for this city.</div>;
    }

    return <div className="h-full relative"><canvas ref={chartRef}></canvas></div>;
};


// ========= DASHBOARD COMPONENTS =========

const AlertCreationForm: React.FC<{
    onSubmit: (alertData: Omit<ThreatAlert, 'id' | 'timestamp'>) => void;
    onCancel: () => void;
    user: UserProfile;
}> = ({ onSubmit, onCancel, user }) => {
    const [type, setType] = useState(SIMULATED_THREAT_TYPES[0]);
    const [level, setLevel] = useState<ThreatLevel>(ThreatLevel.Warning);
    const [message, setMessage] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!type || !level || !message.trim() || !district || !city || !area.trim()) {
            alert('Please fill out all required fields.');
            return;
        }

        setSubmitting(true);
        
        try {
            // Create location object for the alert
            const location = {
                district,
                city,
                area,
                // For now, use a default coordinate for the selected district
                coords: GUJARAT_CITIES[district]?.center || [21.5, 71.0]
            };

            await onSubmit({
                type,
                level,
                message: message.trim(),
                location,
            });
            
            // Reset form
            setType(SIMULATED_THREAT_TYPES[0]);
            setLevel(ThreatLevel.Warning);
            setMessage('');
            setDistrict('');
            setCity('');
            setArea('');
        } catch (error) {
            console.error('Error creating alert:', error);
            alert('Failed to create alert. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-white mb-4">Create New Alert</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Alert Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {SIMULATED_THREAT_TYPES.map(threatType => (
                                <option key={threatType} value={threatType}>{threatType}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Threat Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as ThreatLevel)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value={ThreatLevel.Warning}>Warning</option>
                            <option value={ThreatLevel.Alert}>Alert</option>
                            <option value={ThreatLevel.Emergency}>Emergency</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the threat and required actions..."
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">District</label>
                        <select
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select District</option>
                            {Object.keys(GUJARAT_CITIES).map(districtName => (
                                <option key={districtName} value={districtName}>{districtName}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">City/Town</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Enter city or town name"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Area/Colony</label>
                        <input
                            type="text"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="Enter specific area or colony"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Spinner /> : 'Create Alert'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AuthorityDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
    const { alerts, loading: loadingAlerts, createAlert } = useRealTimeAlerts();
    const { reports, loading: loadingReports } = useCitizenReports();
    const [activeAlerts, setActiveAlerts] = useState<ThreatAlert[]>(alerts);
    const [mapCenter, setMapCenter] = useState<LatLngTuple>(MAP_DEFAULT_CENTER);
    const [mapZoom, setMapZoom] = useState(MAP_DEFAULT_ZOOM);
    const [showCreateAlert, setShowCreateAlert] = useState(false);

    useEffect(() => {
        setActiveAlerts(alerts);
    }, [alerts]);

    const handleViewItem = (item: ThreatAlert | CitizenReport) => {
      let coords: LatLngTuple;
      if ('type' in item.location && (item.location.type === 'circle' || item.location.type === 'polygon')) { // It's an Alert
        const alert = item as ThreatAlert;
        if(alert.location.type === 'circle') {
            coords = alert.location.coords as LatLngTuple;
        } else {
            coords = (alert.location.coords as LatLngTuple[])[0];
        }
      } else { // It's a Report
        const report = item as CitizenReport;
        coords = [report.location.lat, report.location.lng];
      }
      setMapCenter(coords);
      setMapZoom(12);
    };

    const dismissAlert = (alertId: string) => {
        setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    // Instead, use the form data passed from AlertCreationForm:
    const handleCreateAlert = async (alertData: Omit<ThreatAlert, 'id' | 'timestamp'>) => {
        const recipient = user.phoneNumber || "+918734095603";
        const { type, level, location, message } = alertData;
        const district = location.district || "";
        const city = location.city || "";
        const area = location.area || "";

        try {
            const response = await fetch('http://127.0.0.1:5000/api/send-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient,
                    threat_type: type,
                    location: `${district}, ${city}, ${area}`,
                    level,
                    message // <-- Add this
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to send SMS');
            }

            await createAlert(alertData, user);
            // Optionally show feedback/UI updates here
        } catch (error: any) {
            alert(error.message || 'Failed to create alert. Please try again.');
        }
    };

    return (
        <>
            {showCreateAlert && (
                <AlertCreationForm
                    onSubmit={handleCreateAlert}
                    onCancel={() => setShowCreateAlert(false)}
                    user={user}
                />
            )}
        <div className="h-screen w-screen flex pt-16">
            <aside className="w-1/3 max-w-sm bg-gray-800 p-4 overflow-y-auto flex flex-col space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-blue-300">Threat Overview</h3>
                    <button 
                        onClick={() => setShowCreateAlert(true)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                    >
                        Create Alert
                    </button>
                </div>
                <ThreatChart alerts={activeAlerts} />
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-blue-300 mb-2">Active Alerts ({activeAlerts.length})</h3>
                    <ul className="space-y-2">
                        {activeAlerts.map(alert => (
                            <li key={alert.id} className="bg-gray-700 rounded-md p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold">{alert.type}</p>
                                        <p className={`text-sm font-bold`} style={{ color: THREAT_LEVEL_COLORS[alert.level].border }}>{alert.level}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleViewItem(alert)} className="p-1 rounded-full hover:bg-gray-600">
                                            <EyeIcon className="h-5 w-5 text-gray-300" />
                                        </button>
                                        <button onClick={() => dismissAlert(alert.id)} className="p-1 rounded-full hover:bg-gray-600 text-red-400 font-bold">&times;</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-blue-300 mb-2">Citizen Reports ({reports.length})</h3>
                    {loadingReports ? <Spinner /> : (
                        <ul className="space-y-2">
                            {reports.map(report => (
                                <li key={report.id} className="bg-gray-700 rounded-md p-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-blue-400">{report.type}</p>
                                            <p className="text-sm text-gray-300">{report.description.substring(0, 40)}...</p>
                                            {report.structuredLocation && <p className="text-xs text-gray-400 mt-1">{report.structuredLocation}</p>}
                                        </div>
                                         <button onClick={() => handleViewItem(report)} className="p-1 rounded-full hover:bg-gray-600">
                                            <EyeIcon className="h-5 w-5 text-gray-300" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
            <main className="flex-grow">
                <InteractiveMap center={mapCenter} zoom={mapZoom} alerts={activeAlerts} reports={reports} onViewItem={handleViewItem}/>
            </main>
        </div>
        </>
    );
};

const PublicDashboard: React.FC<{ user: UserProfile, userLocation: LatLngTuple | null, locationError: string | null }> = ({ user, userLocation, locationError }) => {
    const { alerts } = useRealTimeAlerts();
    const { reports, addReport } = useCitizenReports();

    const [isReporting, setIsReporting] = useState(false);
    const [reportLocation, setReportLocation] = useState<{ lat: number; lng: number } | null>(null);

    const mapCenter = userLocation || MAP_DEFAULT_CENTER;

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        setReportLocation(latlng);
        setIsReporting(true);
    };

    const handleStartReport = () => {
        if (userLocation) {
            setReportLocation({ lat: userLocation[0], lng: userLocation[1] });
        }
        setIsReporting(true);
    };

    const submitReport = (reportData: Omit<CitizenReport, 'id' | 'timestamp' | 'reportedBy'>) => {
        addReport(reportData, user);
        setIsReporting(false);
        setReportLocation(null);
    };
    
    const currentThreatLevel = getThreatLevelAtLocation(userLocation, alerts);

    return (
        <div className="h-screen w-screen relative pt-16">
            <main className="h-full w-full">
                <InteractiveMap center={mapCenter} zoom={userLocation ? 13 : MAP_DEFAULT_ZOOM} alerts={alerts} reports={reports} onMapClick={handleMapClick} />
            </main>
            
            {userLocation && currentThreatLevel && (
                 <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-10 p-3 rounded-lg shadow-lg flex items-center space-x-3`} style={{backgroundColor: THREAT_LEVEL_COLORS[currentThreatLevel].bg, borderColor: THREAT_LEVEL_COLORS[currentThreatLevel].border, borderWidth: 1}}>
                    <ExclamationTriangleIcon level={currentThreatLevel} className="h-6 w-6" />
                    <span className="font-bold text-white">Current Threat Level: {currentThreatLevel}</span>
                </div>
            )}
            
            <button onClick={handleStartReport} className="absolute bottom-8 right-8 z-10 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform hover:scale-110">
                <PlusIcon className="h-8 w-8" />
                <span className="sr-only">Report an Incident</span>
            </button>

            <Modal isOpen={isReporting} onClose={() => setIsReporting(false)} title="Report an Incident">
                {reportLocation ? (
                    <ReportForm location={reportLocation} onSubmit={submitReport} />
                ) : (
                    <div className="text-center space-y-4">
                        <p className="text-gray-300">Click a location on the map to place your report pin, or allow location access for your current position.</p>
                        {locationError && <p className="text-red-400">{locationError}</p>}
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ========= SEARCH RESULTS COMPONENT =========

const SearchResultsView: React.FC<{ city: string; onClearSearch: () => void; }> = ({ city, onClearSearch }) => {
    const allBlueCarbonData = useBlueCarbonData();
    const { alerts: allAlerts } = useRealTimeAlerts();

    const historicalData = allBlueCarbonData
        .filter(d => d.city === city)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by most recent
        
    const cityConfig = GUJARAT_CITIES[city];

    const currentAlerts = allAlerts.filter(alert => {
        if (!cityConfig) return false;
        let alertCoords: LatLngTuple | null = null;
        if (alert.location.type === 'circle') {
            alertCoords = alert.location.coords as LatLngTuple;
        } else if (alert.location.type === 'polygon') {
            alertCoords = (alert.location.coords as LatLngTuple[])[0]; // Use first point for approximation
        }
        if (!alertCoords) return false;
        
        const cityLatLng = L.latLng(cityConfig.center);
        const alertLatLng = L.latLng(alertCoords);
        const distance = cityLatLng.distanceTo(alertLatLng); // distance in meters
        return distance < 30000; // 30km radius for simulation
    });


    const mapConfig = cityConfig || { center: MAP_DEFAULT_CENTER, zoom: MAP_DEFAULT_ZOOM };

    const downloadReport = () => {
        const headers = ['Location', 'Reason', 'Date', 'Reduction Amount'];
        const rows = historicalData.map(item => [item.location.name, item.reason, item.date, item.reductionAmount].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${city}_blue_carbon_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-screen w-screen flex flex-col pt-16">
            <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Report for: <span className="text-blue-400">{city}</span></h2>
                <div>
                    <button onClick={downloadReport} className="mr-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold text-white transition-colors">
                        Download Report (CSV)
                    </button>
                    <button onClick={onClearSearch} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white transition-colors">
                        &larr; Back to Dashboard
                    </button>
                </div>
            </div>
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-1/3 max-w-md bg-gray-800 p-4 overflow-y-auto flex flex-col space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-blue-300 mb-2">Current Coastal Condition</h3>
                        {currentAlerts.length > 0 ? (
                             <ul className="space-y-2">
                                {currentAlerts.map(alert => (
                                    <li key={alert.id} className="text-sm">
                                        <span className="font-semibold">{alert.type}</span> - <span style={{ color: THREAT_LEVEL_COLORS[alert.level].border }}>{alert.level}</span>
                                    </li>
                                ))}
                             </ul>
                        ) : <p className="text-gray-400">No active alerts reported for this city.</p>}
                    </div>
                     <div className="flex-grow">
                        <h3 className="text-lg font-bold text-blue-300 mb-2">History Data: Blue Carbon Decrease</h3>
                        {historicalData.length > 0 ? (
                            <ul className="space-y-2">
                                {historicalData.map(item => (
                                    <li key={item.id} className="bg-gray-700 rounded-md p-3 text-sm">
                                        <p className="font-bold text-red-400">{item.reason}</p>
                                        <p className="text-gray-300">Location: {item.location.name}</p>
                                        <p className="text-gray-400">Date: {item.date}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-400">No historical data available.</p>}
                    </div>
                </aside>
                 <main className="flex-grow flex flex-col">
                    <div className="flex-grow h-3/5">
                        <InteractiveMap 
                            center={mapConfig.center} 
                            zoom={mapConfig.zoom} 
                            alerts={[]} 
                            reports={[]} 
                            blueCarbonEvents={historicalData}
                            searchedCity={{ name: city, center: mapConfig.center }}
                        />
                    </div>
                    <div className="flex-shrink-0 h-2/5 bg-gray-800 p-4 border-t border-gray-700">
                        <BlueCarbonTrendChart data={historicalData} city={city}/>
                    </div>
                </main>
            </div>
        </div>
    );
};


// ========= MAIN APP COMPONENT =========

const App = () => {
    return (
        <MainApp />
    );
}

const MainApp = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true); // Start as true
    const [searchCity, setSearchCity] = useState<string | null>(null);

    // Lift state for user's location to be used by notifications hook
    const { location: userLocation, error: locationError } = useGeolocation();
    
    // Notification system hook
    const { notifications, currentToast, dismissToast } = useNotifications(user, userLocation);

    // Firebase authentication state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch user data from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userProfile: UserProfile = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            name: userData.name,
                            phoneNumber: userData.phoneNumber,
                            locationDetails: userData.locationDetails,
                            role: userData.role,
                            contactNumber: userData.contactNumber,
                            structuredLocation: userData.structuredLocation,
                            language: userData.language
                        };
                        setUser(userProfile);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                setUser(null);
            }
            setLoading(false); // <-- Set loading to false after auth check
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Spinner fullScreen={true} />;
    }

    const handleLogin = (userProfile: UserProfile) => {
        setLoading(true);
        setUser(userProfile);
        setLoading(false);
    };

    const handleLogout = async () => {
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('./src/firebase');
            await signOut(auth);
            setUser(null);
            setSearchCity(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    
    const handleSearch = (city: string) => {
        setSearchCity(city);
    }
    
    const clearSearch = () => {
        setSearchCity(null);
    }

    const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
        if (!user) return;
        
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('./src/firebase');
            
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, updatedProfile);
            
            // Update local state
            setUser({ ...user, ...updatedProfile });
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen">
            <NotificationToast notification={currentToast} onDismiss={dismissToast} />
            {!user ? (
                <AuthScreen onLogin={handleLogin} />
            ) : (
                <>
                    <Header 
                        user={user} 
                        onLogout={handleLogout} 
                        onSearch={handleSearch} 
                        notifications={notifications} 
                        onUpdateProfile={handleUpdateProfile}
                    />
                    {searchCity ? (
                        <SearchResultsView city={searchCity} onClearSearch={clearSearch} />
                    ) : user.role === UserRole.Authority ? (
                        <AuthorityDashboard user={user} />
                    ) : (
                        <PublicDashboard user={user} userLocation={userLocation} locationError={locationError} />
                    )}
                </>
            )}
        </div>
    );
}

export default App;

