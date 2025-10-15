import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

// --- Type Definitions ---
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp?: Date;
  isError?: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  height_cm: number;
  weight_kg: number;
  allergies: string;
  diseases: string;
  diet_type: string;
}

interface NutritionistStatus {
    isOnline: boolean;
    nextAvailable: string;
    workingHours: string;
}

// --- Utility Functions ---

/**
 * Calculates BMI status based on height and weight.
 * @param heightCm - Height in centimeters.
 * @param weightKg - Weight in kilograms.
 * @returns The BMI status category.
 */
const getBmiStatus = (heightCm: number, weightKg: number): string => {
  if (!heightCm || !weightKg) return 'unknown';
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese';
  return 'extreme-obese';
};



/**
 * Fetch wrapper with exponential backoff for retries.
 */
const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                 // Check if it's a server error or rate limiting error that should be retried
                 if ((response.status >= 500 || response.status === 429) && i < maxRetries - 1) {
                    const nextDelay = delay * (2 ** i);
                    await new Promise(resolve => setTimeout(resolve, nextDelay));
                    continue;
                 }
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Details: ${errorText}`);
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const nextDelay = delay * (2 ** i);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
    // Should never reach here if maxRetries > 0
    throw new Error('Fetch failed after multiple retries.');
};


// --- Main Component ---
const App = () => {
    // --- State Management ---
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [currentDataLevel, setCurrentDataLevel] = useState(1);

    // Profile Edit States (Temporary state before commit)
    const [tempHeight, setTempHeight] = useState(0);
    const [tempWeight, setTempWeight] = useState(0);
    const [tempAllergies, setTempAllergies] = useState('');
    const [tempDiseases, setTempDiseases] = useState('');
    const [tempDietType, setTempDietType] = useState('Mediterranean');

    // Committed BMI Status
    const [committedBmiStatus, setCommittedBmiStatus] = useState('unknown');

    // Disclaimer State
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(false);

    // Plan Status (For the Download Button)
    const [planStatus, setPlanStatus] = useState('None'); // Options: 'None', 'Generating', 'Generated'
    
    // Nutritionist Chat States
    const [isNutritionistChatOpen, setIsNutritionistChatOpen] = useState(false);
    const [nutritionistMessages, setNutritionistMessages] = useState<Message[]>([]);
    const [currentNutritionistMessage, setCurrentNutritionistMessage] = useState('');
    const [isNutritionistOnline, setIsNutritionistOnline] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // USER-PROVIDED STATE
    const [nutritionistStatus, setNutritionistStatus] = useState<NutritionistStatus>({
        isOnline: false,
        nextAvailable: "Monday at 9:00 AM",
        workingHours: "Monday-Friday, 9:00 AM - 6:00 PM"
    });
    
    // Add with your other states in NutritionChat.tsx
const [confirmDelete, setConfirmDelete] = useState<{show: boolean, messageId: number | null}>({
  show: false,
  messageId: null
});

    // Chat scrolling reference
    const chatEndRef = useRef<HTMLDivElement>(null);
    const nutritionistChatEndRef = useRef<HTMLDivElement>(null);

    const [chatMode, setChatMode] = useState<'general' | 'plan'>('general'); // 'general' or 'plan'
    const [showModePopup, setShowModePopup] = useState(false);

    // --- User-Provided Status Check Function ---

    const checkNutritionistStatus = async () => {
        try {
            const response = await fetch('http://localhost:8000/nutritionist/status/1');
            if (response.ok) {
                const status = await response.json();
                setIsNutritionistOnline(status.is_online);
                
                // Update the status message in the UI if needed
                setNutritionistStatus({
                    isOnline: status.is_online,
                    nextAvailable: status.next_available,
                    workingHours: status.working_hours
                });
            } else {
                // Fallback to basic offline status if endpoint fails
                console.warn('Status endpoint failed, using fallback');
                setIsNutritionistOnline(false);
            }
        } catch (error) {
            console.error('Error checking nutritionist status:', error);
            setIsNutritionistOnline(false);
        }
    };


    // --- Core Data Fetching Functions (Initialization) ---

          const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const storedDisclaimer = localStorage.getItem('hasSeenDisclaimer');
            if (storedDisclaimer) {
                setHasSeenDisclaimer(true);
                setShowDisclaimer(false);
            }

            const userToken = localStorage.getItem('userToken'); 
            if (!userToken) {
                console.error("No user token found. Cannot fetch profile.");
                setUserProfile(null);
                setIsLoading(false);
                return;
            }

            const cleanToken = userToken.replace(/['"]/g, '');

            // 1. Fetch Profile Data
            const profileResponse = await fetchWithRetry(`http://localhost:8000/get-profile/${cleanToken}`);
            const data = await profileResponse.json();
            
            // Set main profile state
            const profile: UserProfile = {
                id: data.id,
                name: data.name,
                email: data.email,
                height_cm: data.height_cm || 0,
                weight_kg: data.weight_kg || 0,
                allergies: data.allergies || '',
                diseases: data.diseases || '',
                diet_type: data.diet_type || 'Mediterranean',
            };
            setUserProfile(profile);

            // Set temporary edit states
            setTempHeight(profile.height_cm);
            setTempWeight(profile.weight_kg);
            setTempAllergies(profile.allergies);
            setTempDiseases(profile.diseases);
            setTempDietType(profile.diet_type);
            
            // Calculate and set initial BMI status
            setCommittedBmiStatus(getBmiStatus(profile.height_cm, profile.weight_kg));

            // 2. Fetch ALL Chat History (Grouped by date)
            const historyResponse = await fetchWithRetry(`http://localhost:8000/chat/history-grouped/${cleanToken}`);
            const groupedHistory = await historyResponse.json();

            // Process AI chat messages
            const aiMessages = [];
            for (const date in groupedHistory) {
                if (groupedHistory[date].ai_chat) {
                    aiMessages.push(...groupedHistory[date].ai_chat);
                }
            }

            // Process nutritionist chat messages  
            const nutritionistMessages = [];
            for (const date in groupedHistory) {
                if (groupedHistory[date].nutritionist_chat) {
                    nutritionistMessages.push(...groupedHistory[date].nutritionist_chat);
                }
            }

            // Set AI messages - add welcome message if empty
            if (aiMessages.length === 0) {
                const welcomeMessage: Message = {
                    id: Date.now(),
                    text: "Hi! I'm Zayan, your AI nutrition assistant. I can help you with meal plans, recipes, and nutritional advice. What would you want to today?",
                    sender: 'bot',
                    timestamp: new Date()
                };
                setMessages([welcomeMessage]);
            } else {
                setMessages(aiMessages.map((m: any) => ({
                    id: m.id,
                    text: m.content,
                    sender: m.is_user ? 'user' : 'bot',
                    timestamp: new Date(m.timestamp)
                })));
            }

            // Set nutritionist messages
            setNutritionistMessages(nutritionistMessages.map((m: any) => ({
                id: m.id,
                text: m.content,
                sender: m.is_user ? 'user' : 'nutritionist',
                timestamp: new Date(m.timestamp)
            })));
            
        } catch (error) {
            console.error('Initial data fetch failed:', error);
            setUserProfile(null);
        } finally {
            setIsLoading(false);
            if (!hasSeenDisclaimer) {
                setShowDisclaimer(true);
            }
        }
    };

    // --- User-Provided Profile Update Function ---

    const handleUpdateProfile = async () => {
        try {
            const userToken = localStorage.getItem('userToken');
            if (!userToken) {
                console.error("No user token found");
                return;
            }

            const cleanToken = userToken.replace(/['"]/g, '');
            
            // Prepare updated data
            const updatedData = {
                height_cm: tempHeight,
                weight_kg: tempWeight,
                allergies: tempAllergies,
                diseases: tempDiseases,
                diet_type: tempDietType
            };

            // Send update request to backend
            const response = await fetchWithRetry(`http://localhost:8000/update-profile/${cleanToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();
            console.log('Profile update successful:', result);
            
            // Update local state with new data
            setUserProfile(prev => prev ? ({
                ...prev,
                height_cm: tempHeight,
                weight_kg: tempWeight,
                allergies: tempAllergies,
                diseases: tempDiseases,
                diet_type: tempDietType,
            }) : null);
            
            // Update BMI status
            setCommittedBmiStatus(getBmiStatus(tempHeight, tempWeight));
            
            // Close sidebar
            setIsSidebarOpen(false);
            
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    // --- Main AI Chat Functions ---

  const handleSendMessage = async () => {
  if (!currentMessage.trim() || !userProfile) return;

  const userMsg: Message = { 
      id: Date.now(), 
      text: currentMessage, 
      sender: 'user', 
      timestamp: new Date() 
  };
  setMessages(prev => [...prev, userMsg]);
  setCurrentMessage('');
  setPlanStatus('Generating');

  try {
      const userToken = localStorage.getItem('userToken')?.replace(/['"]/g, '') || 'guest';
      
      // 1. Save user message to database
      await fetchWithRetry(`http://localhost:8000/chat/save-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_token: userToken,
              message: currentMessage,
              is_user: true,
              chat_type: 'ai_chat'
          })
      });

      // 2. Get AI response from MULTI-AGENT SYSTEM
      // ✅ CHANGED: Only send minimal data, backend will fetch from DB
      const response = await fetchWithRetry(`http://localhost:8000/chat/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        user_token: userToken,
        message: currentMessage,
        data_level: currentDataLevel,  // ✅ Send current level
        plan_generated: false
    })
});

        // Update level from response
       
      const data = await response.json();
      const botResponseText = data.response; 

       if (data.updated_level) {
            setCurrentDataLevel(data.updated_level);
        }


      const botMsg: Message = { 
          id: Date.now() + 1, 
          text: botResponseText, 
          sender: 'bot', 
          timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMsg]);
      
      // 3. Save AI response to database
      await fetchWithRetry(`http://localhost:8000/chat/save-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_token: userToken,
              message: botResponseText,
              is_user: false,
              chat_type: 'ai_chat'
          })
      });

      // ✅ UPDATE PLAN STATUS
      if (data.plan_created) {
          setPlanStatus('Pending Approval');
      } else if (botResponseText.toLowerCase().includes('plan')) {
          setPlanStatus('Generating');
      } else {
          setPlanStatus('None');
      }

  } catch (error) {
      console.error('AI Chat failed:', error);
      setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "Sorry, I can't connect to the AI service right now.",
          sender: 'system',
          isError: true,
          timestamp: new Date()
      }]);
      setPlanStatus('None');
  }
};
    // --- Nutritionist Chat Functions ---
const handleSendToNutritionist = async () => {
    if (!currentNutritionistMessage.trim() || !userProfile) return;

    const userMsg: Message = { 
        id: Date.now(), 
        text: currentNutritionistMessage, 
        sender: 'user', 
        timestamp: new Date() 
    };
    setNutritionistMessages(prev => [...prev, userMsg]);
    setCurrentNutritionistMessage('');

    try {
        const userToken = localStorage.getItem('userToken')?.replace(/['"]/g, '') || 'guest';
        
        const response = await fetchWithRetry(`http://localhost:8000/chat/save-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_token: userToken,
                message: currentNutritionistMessage,
                is_user: true,
                chat_type: 'nutritionist_chat'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save message');
        }

        // Refresh messages after sending
        await fetchNutritionistMessages();

    } catch (error) {
        console.error('Failed to send message to nutritionist:', error);
        setNutritionistMessages(prev => [...prev.slice(0, -1), {
            ...userMsg,
            isError: true,
            text: userMsg.text + " (Send failed)"
        }]);
    }
};

    const handleNutritionistKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSendToNutritionist();
    }
    // Note: Input fields don't support multi-line, so no Shift+Enter needed here
    };

    // --- BMI Status Styling & Text Functions (User-Provided) ---

    const getBmiColor = () => {
        switch(committedBmiStatus) {
            case 'underweight':
                return 'bg-sky-400';
            case 'healthy':
                return 'bg-lime-400';
            case 'overweight':
                return 'bg-yellow-400';
            case 'obese':
                return 'bg-red-400';
            case 'extreme-obese':
                return 'bg-red-700';
            default:
                return 'bg-gray-500';
        }
    };

    const getBmiText = () => {
        switch(committedBmiStatus) {
            case 'underweight':
                return 'Underweight';
            case 'healthy':
                return 'Healthy';
            case 'overweight':
                return 'Overweight';
            case 'obese':
                return 'Obese';
            case 'extreme-obese':
                return 'Extreme Obese';
            default:
                return 'Unknown';
        }
    };

    const handleLogout = () => {
    // Clear user token from localStorage
    localStorage.removeItem('userToken');
    // Redirect to landing page
    window.location.href = 'http://localhost:5173/';
    };

    

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
    // Shift+Enter will naturally create a new line (default behavior)
    };

    // --- Effect Hooks ---

    // 1. Initial Load, Profile Fetch
    useEffect(() => {
        fetchUserProfile();
    }, []);

    // 2. Nutritionist Status Check Interval
    useEffect(() => {
        // Check status immediately
        checkNutritionistStatus();

        // Set up interval for repeated checks (every 30 seconds)
        const intervalId = setInterval(checkNutritionistStatus, 30000);

        // Cleanup function
        return () => clearInterval(intervalId);
    }, []);

    // 3. Auto-scroll chat windows
    useEffect(() => {
        // Main chat scroll
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Nutritionist chat scroll
        nutritionistChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // Reset unread count when the chat modal is opened
        if (isNutritionistChatOpen && unreadCount > 0) {
            setUnreadCount(0);
        }
    }, [nutritionistMessages, isNutritionistChatOpen]);

    // 4. Persistence for Disclaimer status
    useEffect(() => {
        if (hasSeenDisclaimer) {
            localStorage.setItem('hasSeenDisclaimer', 'true');
        }
    }, [hasSeenDisclaimer]);



    useEffect(() => {
  if (isNutritionistChatOpen) {
    // Refresh nutritionist messages when chat is opened
    fetchNutritionistMessages();
    
    // Set up interval to refresh every 3 seconds
    const interval = setInterval(fetchNutritionistMessages, 3000);
    
    return () => clearInterval(interval);
  }
}, [isNutritionistChatOpen]);


    const fetchNutritionistMessages = async () => {
  try {
    const userToken = localStorage.getItem('userToken')?.replace(/['"]/g, '') || 'guest';
    const response = await fetchWithRetry(`http://localhost:8000/messages/conversation/${userProfile?.id}/1`);
    
    if (response.ok) {
      const messages = await response.json();
      setNutritionistMessages(messages.map((m: any) => ({
        id: m.id,
        text: m.message,  // Use m.message instead of m.content
        sender: m.sender === 'nutritionist' ? 'nutritionist' : 'user',
        timestamp: new Date(m.created_at)
      })));
    }
  } catch (error) {
    console.error('Error fetching nutritionist messages:', error);
  }
};

const handleDeleteNutritionistMessage = async (messageId: number) => {
  setConfirmDelete({ show: true, messageId });
};

const confirmDeleteAction = async () => {
  if (!confirmDelete.messageId) return;

  try {
    const response = await fetch(`http://localhost:8000/messages/${confirmDelete.messageId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      setNutritionistMessages(prev => prev.filter(msg => msg.id !== confirmDelete.messageId));
      await fetchNutritionistMessages();
      setConfirmDelete({ show: false, messageId: null });
    } else {
      console.error('Failed to delete message');
      setConfirmDelete({ show: false, messageId: null });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    setConfirmDelete({ show: false, messageId: null });
  }
};

const cancelDelete = () => {
  setConfirmDelete({ show: false, messageId: null });
};

    // --- Render Logic ---

    // Render a loading state while fetching data
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-neutral-200 font-sans">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-sm font-medium">Loading user data...</p>
                </div>
            </div>
        );
    }

    // If data is loaded but userProfile is null, show a message
    if (!userProfile) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-neutral-200 font-sans">
                <p className="text-xl">User data not found. Please sign up or ensure your token is set.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-900 text-neutral-200 font-sans">
            
            {/* Sidebar - the sliding drawer component */}
            <div 
                className={`fixed top-0 left-0 h-full w-80 flex-shrink-0 flex flex-col shadow-xl z-30 transition-transform duration-300 bg-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-6 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="ml-4">
                                <h2 className="text-xl font-bold text-neutral-50">{userProfile.name}</h2>
                                <p className="text-sm text-neutral-400">{userProfile.email}</p>
                            </div>
                        </div>
                        {/* Close button for the drawer */}
                        <button 
                            onClick={() => setIsSidebarOpen(false)} 
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                            <span className="sr-only">Close menu</span>
                        </button>
                    </div>
                </div>

                {/* Profile Details Section */}
                <div className="p-6 flex-grow overflow-y-auto">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">Your Profile</h3>
                    <div className="space-y-4">
                        
                        {/* Height Field */}
                        <div>
                            <label htmlFor="height" className="block text-sm font-medium text-neutral-300 mb-1">Height (cm)</label>
                            <input 
                                type="number" 
                                id="height" 
                                value={tempHeight || ''} 
                                onChange={(e) => setTempHeight(parseFloat(e.target.value) || 0)}
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white"
                                min="1"
                            />
                        </div>

                        {/* Weight Field */}
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-neutral-300 mb-1">Weight (kg)</label>
                            <input 
                                type="number" 
                                id="weight" 
                                value={tempWeight || ''} 
                                onChange={(e) => setTempWeight(parseFloat(e.target.value) || 0)}
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white"
                                min="1"
                            />
                        </div>

                        {/* Diet Type Field */}
                        <div>
                            <label htmlFor="dietType" className="block text-sm font-medium text-neutral-300 mb-1">Diet Type</label>
                            <select 
                                id="dietType" 
                                value={tempDietType} 
                                onChange={(e) => setTempDietType(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white"
                            >
                                <option value="Mediterranean">Mediterranean</option>
                                <option value="Keto">Keto</option>
                                <option value="Vegan">Vegan</option>
                                <option value="Intermittent Fasting">Intermittent Fasting</option>
                                <option value="Paleo">Paleo</option>
                            </select>
                        </div>
                        
                        {/* Allergies Field */}
                        <div>
                            <label htmlFor="allergies" className="block text-sm font-medium text-neutral-300 mb-1">Allergies</label>
                            <textarea 
                                id="allergies" 
                                rows={3}
                                value={tempAllergies} 
                                onChange={(e) => setTempAllergies(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white resize-y"
                                placeholder="e.g., Peanuts, Lactose"
                            />
                        </div>

                        {/* Diseases Field */}
                        <div>
                            <label htmlFor="diseases" className="block text-sm font-medium text-neutral-300 mb-1">Diseases</label>
                            <textarea 
                                id="diseases" 
                                rows={3}
                                value={tempDiseases} 
                                onChange={(e) => setTempDiseases(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white resize-y"
                                placeholder="e.g., Type 2 Diabetes, High Blood Pressure"
                            />
                        </div>

                        <button 
                            onClick={handleUpdateProfile} 
                            disabled={tempHeight <= 0 || tempWeight <= 0}
                            className={`mt-6 px-6 py-3 w-full rounded-lg text-white font-semibold transition-colors shadow-md 
                                ${tempHeight <= 0 || tempWeight <= 0 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                        >
                            Update Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
<div className="flex flex-col flex-grow">
    {/* Top bar with drawer toggle and other info */}
    <header className="bg-slate-800 p-4 flex justify-between items-center shadow-lg rounded-b-lg">
        <div className="flex items-center space-x-4">
            {/* Menu button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg text-neutral-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
                <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path>
                </svg>
                <span className="sr-only">Open profile menu</span>
            </button>
            
            {/* BMI Status */}
            <div className="flex items-center space-x-2 text-sm font-medium text-neutral-400">
                <div 
                    className={`w-3 h-3 rounded-full 
                    ${getBmiColor()} 
                    ${['healthy', 'unknown'].includes(committedBmiStatus) ? '' : 'animate-pulse'}`}
                ></div>
                <span className="text-neutral-200">{getBmiText()}</span>
            </div>
        </div>

        {/* App Title */}
        <h1 className="text-xl font-bold text-emerald-400 hidden sm:block">Zayan </h1>

        {/* Right Side Buttons */}
        <div className="flex items-center space-x-4">
            {/* MODE TOGGLE - Replaces one button */}
            <div className="relative">
                <button
                    onClick={() => {
                        setChatMode(chatMode === 'general' ? 'plan' : 'general');
                        setShowModePopup(true);
                        setTimeout(() => setShowModePopup(false), 3000);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 border-2 ${
                        chatMode === 'general' 
                            ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white' 
                            : 'bg-orange-600 border-orange-500 hover:bg-orange-700 text-white'
                    }`}
                >
                    {chatMode === 'general' ? (
                        <>
                            <span>💬</span>
                            <span>General</span>
                        </>
                    ) : (
                        <>
                            <span>📋</span>
                            <span>Plan</span>
                        </>
                    )}
                </button>
                
                {/* Popup Message */}
                {showModePopup && (
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 border border-slate-600">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm whitespace-nowrap">
                                {chatMode === 'general' 
                                    ? '💬 Chat about nutrition questions' 
                                    : '📋 Create personalized plan'
                                }
                            </span>
                        </div>
                        {/* Arrow pointing to button */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-700 rotate-45 border-l border-t border-slate-600"></div>
                    </div>
                )}
            </div>

            {/* Nutritionist Chat Button */}
            <button 
                onClick={() => { setIsNutritionistChatOpen(true); setUnreadCount(0); }} 
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors shadow-md flex items-center"
            >
                <span className="hidden sm:inline">👨🏻‍⚕️  Nutri Chat</span>
                <span className="sm:hidden">Expert</span>
                {unreadCount > 0 && (
                    <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg animate-bounce">
                        {unreadCount}
                    </div>
                )}
            </button>

            {/* Logout Button */}
            <button 
                onClick={handleLogout}  
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-md"
            >
                Logout
            </button>
        </div>
    </header>

                

                {/* Chat window */}
                <div className="flex-grow p-6 overflow-y-auto flex flex-col space-y-4">
                    
                    {messages.map((msg, index) => (
                        <div key={msg.id || index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl px-4 py-3 rounded-xl shadow-md transition-all duration-300 
                                ${msg.sender === 'user' 
                                    ? 'bg-emerald-600 text-white rounded-br-none' 
                                    : 'bg-slate-800 text-neutral-200 rounded-bl-none'
                                } ${msg.isError ? 'border border-red-400 bg-red-900' : ''}`}
                            >
                                {msg.sender === 'bot' ? (
                                    <div className="markdown-body text-sm leading-relaxed">
  <ReactMarkdown>{msg.text}</ReactMarkdown>
</div>
                                ) : (
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                )}
                                <p className="text-xs opacity-60 mt-1 text-right">{msg.timestamp?.toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Message Input Area */}
                <div className="bg-slate-800 px-4 py-3 mx-4 mb-4 rounded-xl shadow-2xl flex items-end">
                    <textarea 
    className="flex-grow px-4 py-2 rounded-lg bg-slate-700 border-2 border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white resize-none"
    placeholder={
        chatMode === 'general' 
            ? "Ask for recipes, nutritional facts, or general advice..." 
            : "Describe your goals for a personalized nutrition plan..."
    } 
    value={currentMessage} 
    onChange={(e) => setCurrentMessage(e.target.value)} 
    onKeyDown={handleKeyPress}
    rows={1}
    style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
/>
                    <button 
                        onClick={handleSendMessage} 
                        disabled={!currentMessage.trim()}
                        className={`ml-4 px-6 py-2 rounded-lg text-white font-semibold transition-colors shadow-md h-11 flex items-center justify-center
                            ${!currentMessage.trim() 
                                ? 'bg-gray-500 cursor-not-allowed' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                    >
                        Send
                    </button>
                    <button 
                        className={`ml-2 p-3 rounded-lg font-semibold transition-colors shadow-md h-11 w-11 flex items-center justify-center
                            ${planStatus === 'Generated' 
                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                : 'bg-gray-700 cursor-not-allowed text-gray-400'
                            }`}
                        disabled={planStatus !== 'Generated'}
                        title={planStatus === 'Generated' ? 'Download Meal Plan' : 'Generate a plan first'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg> 
                    </button>
                </div>
            </div>

            {/* Disclaimer Modal */}
            {showDisclaimer && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 p-8 rounded-lg shadow-xl max-w-lg w-full text-center">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Disclaimer</h2>
                        <p className="text-neutral-300 mb-6">This is a personal nutrition assistant powered by AI. The advice provided is for informational purposes only and should not be considered a substitute for professional medical advice. Always consult with a qualified healthcare provider before making any changes to your diet or health regimen.</p>
                        <button onClick={() => { localStorage.setItem('hasSeenDisclaimer', 'true'); setHasSeenDisclaimer(true); setShowDisclaimer(false); }} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors">I Understand</button>
                    </div>
                </div>
            )}

            {/* Nutritionist Chat Modal */}
            {isNutritionistChatOpen && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-40 bg-black bg-opacity-50">
                    {confirmDelete.show && (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
          <h3 className="text-lg font-semibold text-white mb-4">Delete Message</h3>
          <p className="text-slate-300 mb-6">Are you sure you want to delete your message?</p>
          <div className="flex space-x-3">
            <button
              onClick={cancelDelete}
              className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAction}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full flex flex-col h-2/3">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${isNutritionistOnline ? 'bg-lime-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <h3 className="text-xl font-bold text-emerald-400">Nutritionist Chat</h3>
                                <span className="text-sm text-neutral-400 hidden sm:inline">
                                    {isNutritionistOnline ? 'Online • Ready to help' : 'Offline'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setIsNutritionistChatOpen(false)} 
                                className="p-2 rounded-lg text-neutral-400 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                                </svg>
                            </button>
                        </div>
                        
                       {/* Enhanced Messages Container */}
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 mb-4">
        {nutritionistMessages.length === 0 ? (
          <div className="text-center text-neutral-400 mt-10">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet</p>
            <p className="text-sm mt-2 text-emerald-300">
              They'll respond when available.
            </p>
          </div>
        ) : (
          nutritionistMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-3 rounded-xl shadow-md relative group ${
                msg.sender === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-none' 
                  : 'bg-slate-700 text-neutral-200 rounded-bl-none'
              } ${msg.isError ? 'border border-red-400' : ''}`}>
                
                {/* Delete button - ONLY show for user's own messages */}
                {msg.sender === 'user' && (
                  <button
                    onClick={() => handleDeleteNutritionistMessage(msg.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Delete your message"
                  >
                    ×
                  </button>
                )}
                
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {msg.timestamp?.toLocaleTimeString()}
                  {msg.sender === 'user' && !isNutritionistOnline && !msg.isError && (
                    <span className="ml-2 text-orange-300">✓ Sent (Offline)</span>
                  )}
                  {msg.isError && (
                    <span className="ml-2 text-red-300">✗ Failed</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={nutritionistChatEndRef} />
      </div>

                        {/* Enhanced Input Area - Always enabled */}
                        <div className="flex items-center mt-4">
                            <input 
                                type="text" 
                                className="flex-grow px-4 py-2 rounded-full bg-slate-700 border-2 border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white" 
                                placeholder={isNutritionistOnline ? "Type your message..." : `Nutritionist is offline (Next: ${nutritionistStatus.nextAvailable})`}
                                value={currentNutritionistMessage} 
                                onChange={(e) => setCurrentNutritionistMessage(e.target.value)} 
                                onKeyPress={handleNutritionistKeyPress}
                            />
                            <button 
                                onClick={handleSendToNutritionist} 
                                disabled={!currentNutritionistMessage.trim()}
                                className={`ml-2 p-3 rounded-full font-semibold transition-colors shadow-md ${
                                    !currentNutritionistMessage.trim()
                                        ? 'bg-gray-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
                                </svg>
                            </button>
                        </div>
                        
                        {!isNutritionistOnline && (
                            <div className="text-center text-sm text-neutral-400 mt-3 p-2 bg-slate-700 rounded-lg">
                                <div className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    <span>Nutritionist is currently offline</span>
                                </div>
                                <p className="text-xs mt-1 text-emerald-300">
                                    Working hours: {nutritionistStatus.workingHours}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Custom CSS for markdown styles */}
            <style jsx global>{`
                .markdown-body {
                    font-family: 'Inter', sans-serif;
                    color: inherit;
                    font-size: 0.875rem; /* text-sm */
                    line-height: 1.5;
                }
                .markdown-body p {
                    margin-bottom: 0.5rem;
                }
                .markdown-body ul, .markdown-body ol {
                    padding-left: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                .markdown-body li {
                    margin-bottom: 0.25rem;
                }
                .markdown-body h1, .markdown-body h2, .markdown-body h3 {
                    font-weight: bold;
                    margin-top: 0.75rem;
                    margin-bottom: 0.5rem;
                }
                .markdown-body h3 {
                    font-size: 1rem;
                    color: #4ade80; /* emerald-400 */
                }
                .markdown-body strong {
                    font-weight: 700;
                }
            `}</style>
        </div>
    );
}

export default App;
