import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Utility to calculate BMI
const calculateBMI = (weight, height, heightUnit, weightUnit) => {
  const weightInKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;
  let heightInMeters = 0;
  if (heightUnit === 'cm') {
    heightInMeters = height / 100;
  } else if (heightUnit === 'm') {
    heightInMeters = height;
  } else if (heightUnit === 'inches') {
    heightInMeters = height * 0.0254;
  }
  if (heightInMeters > 0) {
    return (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
  }
  return '';
};

// Reusable Progress Bar Component
const ProgressBar = ({ progress }) => (
  <div className="w-full bg-neutral-200 rounded-full h-2.5 dark:bg-slate-700">
    <div
      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

// Dialog component to hold the form content
const Dialog = ({ children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-2xl w-full mx-auto">
      {children}
    </div>
  </div>
);

// A simple function to generate a 6-digit numeric token
const generateToken = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

const NewUserDetails = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [generatedToken, setGeneratedToken] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    country: '',
    city: '',
    bmi: '',
    dietType: '',
    dietDuration: '',
    servingsPerDay: '',
    mainGoal: '',
    allergies: '',
    diseases: ''
  });

  // The modified handleChange function ensures numeric inputs are treated as numbers in state
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    let newValue = value;
    // If the input is type="number", convert the value to a float 
    // unless it's an empty string (to allow users to clear the field).
    if (type === 'number') {
        newValue = value === '' ? '' : parseFloat(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setValidationErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change

    // Auto-calculate BMI using the potentially new value
    // Spread the existing state and override the field being changed with newValue
    const { height, weight, heightUnit, weightUnit } = { ...formData, [name]: newValue };
    
    // Convert back to string for the calculateBMI helper which handles float conversion internally
    if (height !== '' && weight !== '') { 
      // Important: Use String() conversion here because the `calculateBMI` function
      // expects strings for its internal parseFloat operations.
      const newBmi = calculateBMI(String(weight), String(height), heightUnit, weightUnit);
      setFormData(prev => ({ ...prev, bmi: newBmi }));
    } else {
      setFormData(prev => ({ ...prev, bmi: '' }));
    }
  };

  const validateStep = () => {
    const errors = {};
    let hasErrors = false;

    // Validation for Step 1
    if (currentStep === 1) {
      if (!formData.name) { errors.name = 'Name is required.'; hasErrors = true; }
      if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
        errors.email = 'A valid email is required.'; hasErrors = true;
      }
      if (!formData.dob) {
        errors.dob = 'Date of birth is required.'; hasErrors = true;
      } else {
        const dob = new Date(formData.dob);
        const dobYear = dob.getFullYear();
        if (dob > new Date()) {
          errors.dob = 'Date cannot be in the future.'; hasErrors = true;
        } else if (dobYear < 1950) {
          errors.dob = 'Year should be from 1950 to present.'; hasErrors = true;
        }
      }
      if (!formData.height || parseFloat(formData.height) <= 0) { errors.height = 'Height is required.'; hasErrors = true; }
      if (!formData.weight || parseFloat(formData.weight) <= 0) { errors.weight = 'Weight is required.'; hasErrors = true; }
      if (!formData.country) { errors.country = 'Country is required.'; hasErrors = true; }
    }

    // Validation for Step 2
    if (currentStep === 2) {
      if (!formData.dietType) { errors.dietType = 'Diet type is required.'; hasErrors = true; }
      const dietDuration = parseInt(formData.dietDuration);
      if (isNaN(dietDuration) || dietDuration < 1 || dietDuration > 7) {
        errors.dietDuration = 'Duration must be between 1 and 7 days.'; hasErrors = true;
      }
      const servings = parseInt(formData.servingsPerDay);
      if (isNaN(servings) || servings < 1 || servings > 10) {
        errors.servingsPerDay = 'Servings must be between 1 and 10.'; hasErrors = true;
      }
      if (!formData.mainGoal) { errors.mainGoal = 'Main goal is required.'; hasErrors = true; }
    }

    setValidationErrors(errors);
    return !hasErrors;
  };

  const isStep1Valid = formData.name && formData.email && formData.dob && formData.height && formData.weight && formData.country && Object.values(validationErrors).every(err => !err);
  const isStep2Valid = formData.dietType && formData.dietDuration && formData.servingsPerDay && formData.mainGoal && Object.values(validationErrors).every(err => !err);

  // --- REPLACE YOUR EXISTING handleNext FUNCTION WITH THIS ---
  const handleNext = () => {
    if (validateStep()) {
        if (currentStep === 1) {
            setProgress(33);
        } else if (currentStep === 2) {
            setProgress(66);
        } else if (currentStep === 3) {
            setProgress(100); // Set progress to 100% when starting the final stage
            setGeneratedToken(generateToken()); // Generate the token right before submission
            // CRITICAL: We call handleSubmit immediately, but we don't wait for it here.
            // We just let the next step render the timer.
            
            // To ensure the state is fully set before handleSubmit uses it, we'll
            // move the handleSubmit call inside an effect, or better yet,
            // we will combine it with the final step render.
        }
        setCurrentStep(prev => prev + 1);
    }
 };
// ---------------------------------------------------------
  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        setProgress(0);
      } else if (currentStep === 3) {
        setProgress(33);
      } else if (currentStep === 4) {
        setProgress(66);
      }
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProgress(100);

    // Password validation
    if (formData.password !== formData.confirm_password) {
      // NOTE: Replace alert() with a custom modal or message box in a final app!
      alert("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      // NOTE: Replace alert() with a custom modal or message box in a final app!
      alert("Password must be at least 8 characters");
      return;
    }

    // --- START CORRECTED UNIT CONVERSION LOGIC ---

    // 1. Convert height to centimeters (cm)
    let heightInCm = parseFloat(formData.height); 

    if (formData.heightUnit === 'm') {
      // User entered meters, multiply by 100 to get cm
      heightInCm = heightInCm * 100; 
    } else if (formData.heightUnit === 'inches') {
      // User entered inches, multiply by 2.54 to get cm
      heightInCm = heightInCm * 2.54; 
    }
    // If unit is 'cm', the value is used as is (correctly).

    // 2. Convert weight to kilograms (kg)
    let weightInKg = parseFloat(formData.weight); 

    if (formData.weightUnit === 'lbs') {
      // User entered pounds (lbs), multiply by 0.453592 to get kg
      weightInKg = weightInKg * 0.453592; 
    }
    // If unit is 'kg', the value is used as is (correctly).
    
    // --- END CORRECTED UNIT CONVERSION LOGIC ---

    const dataToSave = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirm_password,
      dob: formData.dob,
      token: generatedToken,
      height_cm: heightInCm, // Using the correctly converted value
      weight_kg: weightInKg, // Using the correctly converted value
      country: formData.country,
      city: formData.city,
      diet_type: formData.dietType,
      diet_duration_days: parseInt(formData.dietDuration),
      servings_per_day: parseInt(formData.servingsPerDay),
      main_goal: formData.mainGoal,
      allergies: formData.allergies,
      diseases: formData.diseases,
    };
    
    console.log("Final data to send:", dataToSave);

    try {
      const response = await fetch('http://localhost:8000/auth/process-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Server response:", result);
        
        // Store the token in localStorage for future use
        localStorage.setItem('userToken', generatedToken.toString());
        console.log("Token stored:", generatedToken);
        
        navigate('/nutrition_chat');
      } else {
        const errorData = await response.json();
        console.error('Server responded with an error:', errorData);
        // NOTE: Replace alert() with a custom modal or message box in a final app!
        alert(`Failed to save profile: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Network or unexpected error:', error);
      // NOTE: Replace alert() with a custom modal or message box in a final app!
      alert('An unexpected error occurred. Please check the server connection and ensure it is running.');
    }
  };

  // --- ADD THIS NEW COMPONENT INSIDE NewUserDetails, OR BEFORE IT (RECOMMENDED) ---
 const RedirectTimer = ({ generatedToken, formData, navigate, handleSubmit }) => {
    const [seconds, setSeconds] = useState(5);
    const hasSubmitted = React.useRef(false);

    // 1. Handle Submit Logic (runs once on mount)
    useEffect(() => {
        if (!hasSubmitted.current) {
            hasSubmitted.current = true;
            // The actual handleSubmit function now manages the save, token storage, and navigation
            handleSubmit(); 
        }
    }, [handleSubmit]); // Pass handleSubmit as a dependency (even though it's wrapped in a useCallback, it's safer)

    // 2. Handle Countdown Timer Logic
    useEffect(() => {
        if (seconds === 0) return;
        
        const interval = setInterval(() => {
            setSeconds(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [seconds]);

    return (
        <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4 text-emerald-600 dark:text-emerald-400">
                Profile Complete!
            </h2>
            <p className="text-lg mb-6">
                We're analyzing your details and preparing your chat environment.
            </p>
            <p className="text-4xl font-mono text-neutral-800 dark:text-neutral-200">
                {seconds === 0 ? 'GO!' : seconds}
            </p>
            <p className="text-sm mt-4 text-neutral-500">
                You will be redirected to the Nutrition Chat shortly.
            </p>
        </div>
    );
  };
// -------------------------------------------------------------------------------

  const renderFormStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center text-neutral-800 dark:text-neutral-200">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.dob && <p className="text-red-500 text-xs mt-1">{validationErrors.dob}</p>}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium mb-1">Height</label>
                <div className="flex">
                  <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-l-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <select name="heightUnit" value={formData.heightUnit} onChange={handleChange} className="border border-neutral-300 rounded-r-md dark:bg-slate-700 dark:border-slate-600">
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="inches">inches</option>
                  </select>
                </div>
                {validationErrors.height && <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium mb-1">Weight</label>
                <div className="flex">
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-l-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <select name="weightUnit" value={formData.weightUnit} onChange={handleChange} className="border border-neutral-300 rounded-r-md dark:bg-slate-700 dark:border-slate-600">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
                {validationErrors.weight && <p className="text-red-500 text-xs mt-1">{validationErrors.weight}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.country && <p className="text-red-500 text-xs mt-1">{validationErrors.country}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City (Optional)</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current BMI</label>
                <div className="w-full px-3 py-2 bg-neutral-100 rounded-md dark:bg-slate-700 dark:text-neutral-400">{formData.bmi}</div>
              </div>
<div>
    <label className="block text-sm font-medium mb-1">Password</label>
    <input 
        type="password" 
        name="password" 
        value={formData.password} 
        onChange={handleChange} 
        className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
        required
    />
</div>
<div>
    <label className="block text-sm font-medium mb-1">Confirm Password</label>
    <input 
        type="password" 
        name="confirm_password" 
        value={formData.confirm_password} 
        onChange={handleChange} 
        className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
        required
    />
</div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center text-neutral-800 dark:text-neutral-200">Diet and Goal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Diet Type</label>
                <select name="dietType" value={formData.dietType} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Select...</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Paleo">Paleo</option>
                  <option value="Keto">Keto</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="intermittent fasting">intermittent fasting</option>
                </select>
                {validationErrors.dietType && <p className="text-red-500 text-xs mt-1">{validationErrors.dietType}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Diet Duration (days)</label>
                <input type="number" name="dietDuration" value={formData.dietDuration} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.dietDuration && <p className="text-red-500 text-xs mt-1">{validationErrors.dietDuration}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Servings per day</label>
                <input type="number" name="servingsPerDay" value={formData.servingsPerDay} onChange={handleChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {validationErrors.servingsPerDay && <p className="text-red-500 text-xs mt-1">{validationErrors.servingsPerDay}</p>}
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Your Main Goal</label>
                <textarea name="mainGoal" value={formData.mainGoal} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
                {validationErrors.mainGoal && <p className="text-red-500 text-xs mt-1">{validationErrors.mainGoal}</p>}
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center text-neutral-800 dark:text-neutral-200">Health Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Allergies</label>
                <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Peanuts, dairy, gluten"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Diseases (e.g., Diabetes, Hypertension)</label>
                <textarea name="diseases" value={formData.diseases} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Type 2 Diabetes, Celiac disease"></textarea>
              </div>
            </div>
          </>
        );
      case 4:
        return (
                <RedirectTimer 
                    generatedToken={generatedToken} 
                    formData={formData} 
                    navigate={navigate} 
                    handleSubmit={handleSubmit}
                />
            );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 text-neutral-800 dark:text-neutral-200 font-sans flex items-center justify-center">
      <Dialog>
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mb-2">
            Zayan
          </h1>
          <ProgressBar progress={progress} />
        </div>
        <div className="flex-grow">
          <form className="mt-8 space-y-6" onSubmit={e => e.preventDefault()}>
            {renderFormStep()}
          </form>
        </div>
        <div className="flex justify-between mt-8">
          {currentStep > 1 && currentStep < 4 && ( // Hide 'Back' on the final step
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-neutral-200 text-neutral-800 font-semibold rounded-lg shadow-sm hover:bg-neutral-300 transition-colors duration-200 dark:bg-slate-700 dark:text-neutral-200 dark:hover:bg-slate-600"
            >
              Back
            </button>
          )}
          {currentStep < 3 && (
            <button
              onClick={handleNext}
              className={`px-6 py-2 ml-auto font-semibold rounded-lg shadow-sm transition-colors duration-200 ${
                (currentStep === 1 && !formData.name) || (currentStep === 2 && !formData.dietType)
                  ? 'bg-emerald-300 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              Next
            </button>
          )}
          {currentStep === 3 && (
            <button
              onClick={handleNext}
              className="px-6 py-2 ml-auto font-semibold rounded-lg shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200"
            >
              Next
            </button>
          )}
          {currentStep === 4 && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 ml-auto font-semibold rounded-lg shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200"
            >
              I'm ready for my personal diet
            </button>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default NewUserDetails;
