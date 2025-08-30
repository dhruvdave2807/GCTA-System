import React from 'react';
import SmartFormAssistant from './SmartFormAssistant';

const FormDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Smart Form Assistant Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This demo showcases a smart form assistant that validates contact numbers 
            and provides a step-by-step location picker restricted to Gujarat, India.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Features Demonstrated:
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Contact Number Validation</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Exactly 10 digits required</li>
                    <li>• Must start with 6, 7, 8, or 9</li>
                    <li>• Real-time validation feedback</li>
                    <li>• Rejects invalid numbers</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Location Picker</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Restricted to Gujarat, India</li>
                    <li>• Step-by-step selection process</li>
                                         <li>• District {'→'} City {'→'} Area {'→'} Society</li>
                    <li>• Structured location output</li>
                  </ul>
                </div>
              </div>
            </div>

            <SmartFormAssistant />
          </div>

          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              How It Works:
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Contact Number Input</h4>
                  <p className="text-gray-600 text-sm">
                    Enter a 10-digit mobile number. The form validates in real-time and only accepts 
                    valid Indian mobile numbers starting with 6, 7, 8, or 9.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">District Selection</h4>
                  <p className="text-gray-600 text-sm">
                    Choose from major districts in Gujarat including Ahmedabad, Surat, Rajkot, 
                    Vadodara, Bhavnagar, and more.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">City/Town/Village Selection</h4>
                  <p className="text-gray-600 text-sm">
                    Select from cities, towns, or villages within the chosen district. 
                    Each district has multiple options available.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Area/Colony Selection</h4>
                  <p className="text-gray-600 text-sm">
                    Choose specific areas or colonies within the selected city. 
                    Options include residential areas, industrial zones, beaches, and rural areas.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Society/Colony Final Selection</h4>
                  <p className="text-gray-600 text-sm">
                    Select the final society or colony name. Options are dynamically generated 
                    based on the area type (residential, industrial, beach, etc.).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Output Format:
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">The final location is structured as:</p>
                             <code className="text-blue-800 font-mono bg-blue-50 px-2 py-1 rounded">
                 District {'>'} City/Town/Village {'>'} Area {'>'} Society/Colony
               </code>
              <p className="text-sm text-gray-600 mt-2">
                                 Example: <span className="font-medium">Surat {'>'} Surat City {'>'} Dumas Beach Area {'>'} Beach View Society</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormDemo;
