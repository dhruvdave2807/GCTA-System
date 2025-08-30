import React, { useState, useEffect } from 'react';

// Type definitions
interface LocationData {
  district: string;
  city: string;
  area: string;
  society: string;
}

interface FormData {
  contactNumber: string;
  location: LocationData;
}

// Gujarat districts and their cities/towns
const GUJARAT_LOCATIONS: Record<string, Record<string, string[]>> = {
  'Ahmedabad': {
    'Ahmedabad City': ['Navrangpura', 'Satellite', 'Vastrapur', 'Bodakdev', 'Thaltej', 'Paldi', 'Ellisbridge', 'Gujarat College Area'],
    'Dholka': ['Dholka Town', 'Dholka Rural', 'Dholka Industrial Area'],
    'Sanand': ['Sanand Town', 'Sanand Industrial Estate', 'Sanand Rural'],
    'Viramgam': ['Viramgam Town', 'Viramgam Rural', 'Viramgam Industrial Area']
  },
  'Surat': {
    'Surat City': ['Adajan', 'Vesu', 'Athwa', 'Piplod', 'Althan', 'Pal', 'Tapi River Front', 'Dumas Beach Area'],
    'Bardoli': ['Bardoli Town', 'Bardoli Rural', 'Bardoli Industrial Area'],
    'Mandvi': ['Mandvi Beach', 'Mandvi Town', 'Mandvi Rural'],
    'Olpad': ['Olpad Town', 'Olpad Rural', 'Olpad Industrial Area']
  },
  'Rajkot': {
    'Rajkot City': ['Race Course', 'Kalawad Road', 'University Road', 'Gondal Road', '150 Feet Ring Road'],
    'Gondal': ['Gondal Town', 'Gondal Palace Area', 'Gondal Rural'],
    'Jetpur': ['Jetpur Town', 'Jetpur Industrial Area', 'Jetpur Rural'],
    'Dhoraji': ['Dhoraji Town', 'Dhoraji Rural', 'Dhoraji Market Area']
  },
  'Vadodara': {
    'Vadodara City': ['Alkapuri', 'Fatehgunj', 'Gotri', 'Akota', 'Manjalpur', 'Tandalja', 'Subhanpura'],
    'Dabhoi': ['Dabhoi Town', 'Dabhoi Fort Area', 'Dabhoi Rural'],
    'Padra': ['Padra Town', 'Padra Rural', 'Padra Industrial Area'],
    'Savli': ['Savli Town', 'Savli Industrial Estate', 'Savli Rural']
  },
  'Bhavnagar': {
    'Bhavnagar City': ['Waghawadi Road', 'Takhteshwar Temple Area', 'Victoria Park', 'Gaurishankar Lake'],
    'Palitana': ['Palitana Town', 'Shatrunjaya Hills', 'Palitana Temple Area'],
    'Mahuva': ['Mahuva Beach', 'Mahuva Town', 'Mahuva Rural'],
    'Talaja': ['Talaja Town', 'Talaja Beach', 'Talaja Rural']
  },
  'Jamnagar': {
    'Jamnagar City': ['Marine Drive', 'Lakhota Lake', 'Bedi Gate', 'Darbargadh Palace Area'],
    'Dhrol': ['Dhrol Town', 'Dhrol Palace Area', 'Dhrol Rural'],
    'Kalavad': ['Kalavad Town', 'Kalavad Rural', 'Kalavad Beach Area'],
    'Lalpur': ['Lalpur Town', 'Lalpur Rural', 'Lalpur Industrial Area']
  },
  'Junagadh': {
    'Junagadh City': ['Uparkot Fort', 'Girnar Hills', 'Mahabat Maqbara', 'Sakkarbaug Zoo'],
    'Keshod': ['Keshod Town', 'Keshod Airport Area', 'Keshod Rural'],
    'Manavadar': ['Manavadar Town', 'Manavadar Rural', 'Manavadar Market Area'],
    'Visavadar': ['Visavadar Town', 'Visavadar Rural', 'Visavadar Industrial Area']
  },
  'Amreli': {
    'Amreli': ['Amreli Town', 'Amreli Market', 'Amreli Rural'],
    'Babra': ['Babra Town', 'Babra Rural', 'Babra Industrial Area'],
    'Dhari': ['Dhari Town', 'Dhari Rural', 'Dhari Market Area'],
    'Savarkundla': ['Savarkundla Town', 'Savarkundla Rural', 'Savarkundla Industrial Area']
  },
  'Anand': {
    'Anand': ['Anand Town', 'Anand Dairy Area', 'Anand Rural'],
    'Borsad': ['Borsad Town', 'Borsad Rural', 'Borsad Market Area'],
    'Khambhat': ['Khambhat Town', 'Khambhat Beach', 'Khambhat Rural'],
    'Petlad': ['Petlad Town', 'Petlad Rural', 'Petlad Industrial Area']
  }
};

// Common societies/colonies for each area
const COMMON_SOCIETIES: Record<string, string[]> = {
  'Residential': ['Shanti Niketan', 'Gandhi Nagar', 'Sardar Patel Society', 'Nehru Colony', 'Tagore Society'],
  'Industrial': ['Industrial Estate', 'SEZ Area', 'Export Zone', 'Manufacturing Hub'],
  'Beach': ['Beach View Society', 'Coastal Colony', 'Marine Drive Society', 'Seaside Residency'],
  'Market': ['Market Area', 'Commercial Hub', 'Business District', 'Trade Center'],
  'Rural': ['Village Center', 'Gram Panchayat Area', 'Rural Settlement', 'Agricultural Zone']
};

interface SmartFormAssistantProps {
  onComplete?: (formData: FormData) => void;
}

const SmartFormAssistant: React.FC<SmartFormAssistantProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<FormData>({
    contactNumber: '',
    location: {
      district: '',
      city: '',
      area: '',
      society: ''
    }
  });

  const [currentStep, setCurrentStep] = useState<'contact' | 'location'>('contact');
  const [locationStep, setLocationStep] = useState<1 | 2 | 3 | 4>(1);
  const [contactError, setContactError] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');

  // Contact number validation
  const validateContactNumber = (number: string): boolean => {
    const cleanNumber = number.replace(/\D/g, '');
    return cleanNumber.length === 10 && /^[6-9]\d{9}$/.test(cleanNumber);
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, contactNumber: value }));
    setContactError('');
  };

  const handleContactSubmit = () => {
    if (!validateContactNumber(formData.contactNumber)) {
      setContactError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }
    setCurrentStep('location');
    setLocationStep(1);
  };

  // Location handling
  const handleDistrictSelect = (district: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        district,
        city: '',
        area: '',
        society: ''
      }
    }));
    setLocationStep(2);
    setLocationError('');
  };

  const handleCitySelect = (city: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        city,
        area: '',
        society: ''
      }
    }));
    setLocationStep(3);
    setLocationError('');
  };

  const handleAreaSelect = (area: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        area,
        society: ''
      }
    }));
    setLocationStep(4);
    setLocationError('');
  };

  const handleSocietySelect = (society: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        society
      }
    }));
  };

  const getSocietyOptions = (): string[] => {
    const { area } = formData.location;
    if (!area) return [];

    // Determine the type of area and return appropriate societies
    if (area.toLowerCase().includes('beach')) {
      return COMMON_SOCIETIES['Beach'];
    } else if (area.toLowerCase().includes('industrial')) {
      return COMMON_SOCIETIES['Industrial'];
    } else if (area.toLowerCase().includes('market')) {
      return COMMON_SOCIETIES['Market'];
    } else if (area.toLowerCase().includes('rural')) {
      return COMMON_SOCIETIES['Rural'];
    } else {
      return COMMON_SOCIETIES['Residential'];
    }
  };

  const getStructuredLocation = (): string => {
    const { district, city, area, society } = formData.location;
    return `${district} > ${city} > ${area} > ${society}`;
  };

  const handleLocationSubmit = () => {
    if (!formData.location.society) {
      setLocationError('Please select a society/colony');
      return;
    }
    // Form is complete
    console.log('Form Data:', formData);
    console.log('Structured Location:', getStructuredLocation());
    
    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      contactNumber: '',
      location: {
        district: '',
        city: '',
        area: '',
        society: ''
      }
    });
    setCurrentStep('contact');
    setLocationStep(1);
    setContactError('');
    setLocationError('');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
             <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
         Contact & Location Details
       </h2>

      {/* Contact Number Step */}
      {currentStep === 'contact' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number *
            </label>
            <input
              type="tel"
              value={formData.contactNumber}
              onChange={handleContactNumberChange}
              placeholder="Enter 10-digit mobile number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={10}
            />
            {contactError && (
              <p className="text-red-500 text-sm mt-1">{contactError}</p>
            )}
          </div>
          <button
            onClick={handleContactSubmit}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue to Location
          </button>
        </div>
      )}

      {/* Location Selection Steps */}
      {currentStep === 'location' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Location Selection</h3>
            <span className="text-sm text-gray-500">Step {locationStep}/4</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(locationStep / 4) * 100}%` }}
            ></div>
          </div>

          {/* Step 1: District Selection */}
          {locationStep === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Select District
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {Object.keys(GUJARAT_LOCATIONS).map((district) => (
                  <button
                    key={district}
                    onClick={() => handleDistrictSelect(district)}
                    className="p-3 text-left border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {district}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: City Selection */}
          {locationStep === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select City/Town/Village
              </label>
              <div className="mb-2">
                <span className="text-sm text-gray-500">
                  District: <span className="font-medium">{formData.location.district}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {GUJARAT_LOCATIONS[formData.location.district] && 
                  Object.keys(GUJARAT_LOCATIONS[formData.location.district]).map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className="p-3 text-left border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {city}
                    </button>
                  ))
                }
              </div>
              <button
                onClick={() => setLocationStep(1)}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to District
              </button>
            </div>
          )}

          {/* Step 3: Area Selection */}
          {locationStep === 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Select Area/Colony
              </label>
              <div className="mb-2">
                <span className="text-sm text-gray-500">
                                     {formData.location.district} {'>'} <span className="font-medium">{formData.location.city}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {GUJARAT_LOCATIONS[formData.location.district]?.[formData.location.city]?.map((area) => (
                  <button
                    key={area}
                    onClick={() => handleAreaSelect(area)}
                    className="p-3 text-left border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setLocationStep(2)}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to City
              </button>
            </div>
          )}

          {/* Step 4: Society Selection */}
          {locationStep === 4 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. Select Society/Colony
              </label>
              <div className="mb-2">
                <span className="text-sm text-gray-500">
                                     {formData.location.district} {'>'} {formData.location.city} {'>'} <span className="font-medium">{formData.location.area}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {getSocietyOptions().map((society) => (
                  <button
                    key={society}
                    onClick={() => handleSocietySelect(society)}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      formData.location.society === society
                        ? 'bg-blue-100 border-blue-500 text-blue-800'
                        : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    {society}
                  </button>
                ))}
              </div>
              {locationError && (
                <p className="text-red-500 text-sm mt-1">{locationError}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setLocationStep(3)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back to Area
                </button>
                {formData.location.society && (
                                     <button
                     onClick={handleLocationSubmit}
                     className="ml-auto bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                   >
                     Complete Registration
                   </button>
                )}
              </div>
            </div>
          )}

          {/* Final Location Display */}
          {formData.location.society && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-800 mb-2">Selected Location:</h4>
              <p className="text-sm text-gray-600">{getStructuredLocation()}</p>
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      <div className="mt-6 text-center">
        <button
          onClick={resetForm}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

export default SmartFormAssistant;
