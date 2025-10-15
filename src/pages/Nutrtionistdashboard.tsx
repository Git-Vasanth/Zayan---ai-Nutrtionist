import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  last_contact: string;
}

const NutritionistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'plans' | 'notes'>('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMainTab, setActiveMainTab] = useState<'profile' | 'users'>('users');
  const [confirmDelete, setConfirmDelete] = useState<{show: boolean, messageId: number | null}>({
  show: false,
  messageId: null
});
  const [activeUserTab, setActiveUserTab] = useState<'profile' | 'messages' | 'plans' | 'notes'>('profile');

  useEffect(() => {
    // Fetch users from backend
    fetchUsers();
  }, []);
  

  const fetchUsers = async () => {
  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch('http://localhost:8000/api/nutritionist/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    const data = await response.json();
    setUsers(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    // Set some demo data for testing
    setUsers([
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', last_contact: '2 hours ago' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'pending', last_contact: '1 day ago' }
    ]);
  }
};

  const handleLogout = () => {
    localStorage.removeItem('nutritionistToken');
    localStorage.removeItem('nutritionistName');
    localStorage.removeItem('nutritionistEmail');
    navigate('/nutritionist-login');
  };

interface PlanApproval {
  id: number;
  user_id: number;
  nutritionist_id: number;
  plan_content: string;
  status: string;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface UserDetails {
  id: number;
  name: string;
  email: string;
  allergies: string;
  diseases: string;
  diet_type: string;
}

// Add these states to your component
const [pendingPlans, setPendingPlans] = useState<PlanApproval[]>([]);
const [selectedPlan, setSelectedPlan] = useState<PlanApproval | null>(null);
const [userProfileData, setUserProfileData] = useState<any>(null);
const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
const [newNote, setNewNote] = useState('');
const [messages, setMessages] = useState<any[]>([]);
const [newMessage, setNewMessage] = useState('');
const [approvalFeedback, setApprovalFeedback] = useState('');
const [modifiedPlan, setModifiedPlan] = useState('');
const [isModifying, setIsModifying] = useState(false);
const [savedNote, setSavedNote] = useState(''); // Note from database
const [editingNote, setEditingNote] = useState(''); // What user is typing
const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

// Add these functions to fetch data
const fetchPendingPlans = async () => {
  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch('http://localhost:8000/nutritionist/plans/pending?nutritionist_id=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const plans = await response.json();
      setPendingPlans(plans);
    }
  } catch (error) {
    console.error('Error fetching pending plans:', error);
  }
};

const handleDeleteNote = async () => {
  if (!selectedUser || clinicalNotes.length === 0) return;

  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/nutritionist/clinical-notes/${selectedUser.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      setNewNote('');
      setClinicalNotes([]);
    }
  } catch (error) {
    console.error('Error deleting note:', error);
  }
};

const fetchMessages = async () => {
  if (!selectedUser) return;
  
  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/messages/conversation/${selectedUser.id}/1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('💬 Fetched messages:', data);
      setMessages(data);
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
};

const fetchPlanDetails = async (planId: number) => {
  try {
    const token = localStorage.getItem('nutritionistToken');
    
    // Fetch plan details
    const planResponse = await fetch(`http://localhost:8000/plans/${planId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (planResponse.ok) {
      const plan = await planResponse.json();
      setSelectedPlan(plan);
      
      // Fetch user details
      const userResponse = await fetch(`http://localhost:8000/plans/${planId}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        setUserDetails(user);
      }
    }
  } catch (error) {
    console.error('Error fetching plan details:', error);
  }
};

const handlePlanAction = async (action: 'approve' | 'reject' | 'modify') => {
  if (!selectedPlan) return;

  try {
    const token = localStorage.getItem('nutritionistToken');
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified';

    const response = await fetch(`http://localhost:8000/plans/${selectedPlan.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status,
        feedback: approvalFeedback,
        modified_plan: action === 'modify' ? modifiedPlan : undefined
      })
    });

    if (response.ok) {
      // Refresh the plans list
      await fetchPendingPlans();
      setSelectedPlan(null);
      setUserDetails(null);
      setApprovalFeedback('');
      setModifiedPlan('');
      setIsModifying(false);
    }
  } catch (error) {
    console.error('Error updating plan:', error);
  }
};

useEffect(() => {
  if (activeTab === 'plans') {
    fetchPendingPlans();
  }
}, [activeTab]);

// Add this useEffect to fetch data when user is selected
useEffect(() => {
  if (selectedUser) {
    fetchUserProfileData();
    fetchClinicalNotes();
  }
}, [selectedUser]);

useEffect(() => {
  if (selectedUser && activeTab === 'messages') {
    // Refresh messages immediately when tab is selected
    fetchMessages();
    
    // Set up interval to refresh every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    
    // Cleanup interval when component unmounts or user changes
    return () => clearInterval(interval);
  }
}, [selectedUser, activeTab]);

const fetchUserProfileData = async () => {
  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/nutritionist/user-profile/${selectedUser.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setUserProfileData(data);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
};

const fetchClinicalNotes = async () => {
  if (!selectedUser) return;
  
  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/nutritionist/clinical-notes/${selectedUser.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('📖 Fetched note:', data);
      
      // Handle both response formats
      const noteText = data.notes || '';
      setSavedNote(noteText);
      setEditingNote(noteText);
    } else {
      console.error('❌ Error fetching notes');
    }
  } catch (error) {
    console.error('❌ Network error fetching notes:', error);
  }
};

const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedUser) return;

  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch('http://localhost:8000/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: newMessage,
        user_id: selectedUser.id,
        nutritionist_id: 1
      })
    });

    if (response.ok) {
      setNewMessage('');
      // Refresh messages immediately after sending
      await fetchMessages();
    } else {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

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
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save message');
        }

        console.log('✅ User message saved to nutritionist');

    } catch (error) {
        console.error('❌ Failed to send message to nutritionist:', error);
        setNutritionistMessages(prev => [...prev.slice(0, -1), {
            ...userMsg,
            isError: true,
            text: userMsg.text + " (Send failed)"
        }]);
    }
};

const handleDeleteMessage = async (messageId: number) => {
  setConfirmDelete({ show: true, messageId });
};

const confirmDeleteAction = async () => {
  if (!confirmDelete.messageId) return;

  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/messages/${confirmDelete.messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      setMessages(prev => prev.filter(msg => msg.id !== confirmDelete.messageId));
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

const handleAddNote = async () => {
  if (!selectedUser) return;

  try {
    const token = localStorage.getItem('nutritionistToken');
    const response = await fetch(`http://localhost:8000/nutritionist/clinical-notes/${selectedUser.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nutritionist_id: 1,
        notes: editingNote
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Note saved:', result);
      
      // Update the saved note with what was just saved
      setSavedNote(result.note.notes);
      
      setNotification({
        message: `Notes ${result.action} successfully!`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } else {
      // Handle error response
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      setNotification({
        message: `Error: ${errorData.detail || 'Failed to save notes'}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    setNotification({
      message: 'Network error saving notes',
      type: 'error'
    });
    setTimeout(() => setNotification(null), 3000);
  }
};

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

return (
  <div className="flex h-screen bg-slate-900 text-neutral-200">
    {/* Sidebar - Everything integrated */}
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header integrated into sidebar */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-emerald-400">Zayan</h1>
          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Vertical Navigation Tabs */}
      <div className="flex flex-col p-4 space-y-2">
        {/* My Profile Tab */}
        <button
          onClick={() => setActiveMainTab('profile')}
          className={`flex items-center space-x-3 px-4 py-4 text-left rounded-lg transition-all ${
            activeMainTab === 'profile' 
              ? 'bg-emerald-600 text-white shadow-lg' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
          }`}
        >
          <span className="text-xl">👤</span>
          <div className="text-left">
            <div className="font-semibold">My Profile</div>
            <div className="text-xs opacity-80">Personal details & settings</div>
          </div>
        </button>

        {/* Users Tab */}
        <button
          onClick={() => setActiveMainTab('users')}
          className={`flex items-center space-x-3 px-4 py-4 text-left rounded-lg transition-all ${
            activeMainTab === 'users' 
              ? 'bg-emerald-600 text-white shadow-lg' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
          }`}
        >
          <span className="text-xl">👥</span>
          <div className="text-left">
            <div className="font-semibold">Users</div>
            <div className="text-xs opacity-80">Manage client users</div>
          </div>
        </button>
      </div>

{/* Users List Section - Only show when Users tab is active */}
      {activeMainTab === 'users' && (
        <>
          {/* Search Bar */}
          <div className="px-4 pb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-750 rounded-lg mb-2 ${
                  selectedUser?.id === user.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{user.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.status === 'active' ? 'bg-green-500' : 
                    user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{user.email}</p>
                <p className="text-xs text-slate-500 mt-1">Last contact: {user.last_contact}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>


    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      {/* Show different content based on active main tab */}
      {activeMainTab === 'profile' ? (
        /* Nutritionist Profile Content */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">My Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-slate-800 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-emerald-400 mb-4">Personal Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">Full Name</label>
                    <p className="text-white">Nutritionist Name</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Email</label>
                    <p className="text-white">nutritionist@example.com</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Specialization</label>
                    <p className="text-white">Clinical Nutrition</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Experience</label>
                    <p className="text-white">5+ years</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-slate-800 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-emerald-400 mb-4">Professional Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">License Number</label>
                    <p className="text-white">LN-123456</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Qualifications</label>
                    <p className="text-white">MSc in Nutrition and Dietetics</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Total Clients</label>
                    <p className="text-white">{users.length} active clients</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Member Since</label>
                    <p className="text-white">January 2023</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Users Management Content */
        <>
          {/* Header Tabs - Only show when a user is selected */}
          {selectedUser && (
            <div className="bg-slate-800 border-b border-slate-700">
              <div className="flex items-center px-6 py-4">
                <h2 className="text-lg font-semibold mr-6">{selectedUser.name}</h2>
                <div className="flex space-x-1">
                  {(['profile', 'messages', 'plans', 'notes'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        activeTab === tab
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedUser ? (
              <div className="text-center text-slate-400 mt-20">
                <div className="text-6xl mb-4">🥗</div>
                <h3 className="text-xl font-semibold mb-2">Welcome to Nutritionist Dashboard</h3>
                <p>Select a user from the sidebar to get started</p>
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="bg-slate-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-emerald-400 mb-4">Personal Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-400">Full Name</label>
                          <p className="text-white">{userProfileData?.name || 'Loading...'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Email</label>
                          <p className="text-white">{userProfileData?.email || 'Loading...'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Date of Birth</label>
                          <p className="text-white">{userProfileData?.dob || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Location</label>
                          <p className="text-white">{userProfileData?.city}, {userProfileData?.country}</p>
                        </div>
                      </div>
                    </div>

                    {/* Health Information */}
                    <div className="bg-slate-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-emerald-400 mb-4">Health Profile</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-400">Height</label>
                          <p className="text-white">{userProfileData?.height_cm || '0'} cm</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Weight</label>
                          <p className="text-white">{userProfileData?.weight_kg || '0'} kg</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Diet Type</label>
                          <p className="text-white">{userProfileData?.diet_type || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Diet Duration</label>
                          <p className="text-white">{userProfileData?.diet_duration_days || '0'} days</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Servings per Day</label>
                          <p className="text-white">{userProfileData?.servings_per_day || '0'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Main Goal</label>
                          <p className="text-white">{userProfileData?.main_goal || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Allergies</label>
                          <p className="text-white">{userProfileData?.allergies || 'None reported'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Health Conditions</label>
                          <p className="text-white">{userProfileData?.diseases || 'None reported'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'messages' && (
                  <div className="h-full flex flex-col">
                    {/* Delete Confirmation Modal */}
                    {confirmDelete.show && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                    <div className="flex-1 bg-slate-800 rounded-lg p-4 mb-4 overflow-y-auto">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <div className="text-4xl mb-2">💬</div>
                          <p>No messages yet</p>
                          <p className="text-sm">Start a conversation with {selectedUser.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.sender === 'nutritionist' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs px-4 py-2 rounded-lg relative group ${
                                message.sender === 'nutritionist' 
                                  ? 'bg-emerald-600 text-white rounded-br-none' 
                                  : 'bg-slate-700 text-white rounded-bl-none'
                              }`}>
                                {message.sender === 'nutritionist' && (
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title={`Delete your message (ID: ${message.id})`}
                                  >
                                    ×
                                  </button>
                                )}
                                
                                <p className="text-sm">{message.message}</p>
                                <p className="text-xs opacity-70 mt-1 text-right">
                                  {new Date(message.created_at).toLocaleTimeString()}
                                  {message.sender === 'user'}
                                  {message.sender === 'nutritionist'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder={`Type a message to ${selectedUser.name}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'plans' && (
                  <div className="h-full flex">
                    {/* Plans List Sidebar */}
                    <div className="w-1/3 border-r border-slate-700 pr-4">
                      <h3 className="text-lg font-semibold mb-4">Pending Plans ({pendingPlans.length})</h3>
                      
                      {pendingPlans.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10">
                          <div className="text-4xl mb-2">📋</div>
                          <p>No pending plans</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pendingPlans.map((plan) => (
                            <div
                              key={plan.id}
                              onClick={() => fetchPlanDetails(plan.id)}
                              className={`p-3 rounded-lg cursor-pointer hover:bg-slate-750 ${
                                selectedPlan?.id === plan.id ? 'bg-slate-700 border border-emerald-500' : 'bg-slate-800'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Plan #{plan.id}</span>
                                <span className="text-xs text-yellow-400">Pending</span>
                              </div>
                              <p className="text-sm text-slate-400">
                                Created: {new Date(plan.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Plan Details */}
                    <div className="flex-1 pl-4">
                      {selectedPlan ? (
                        <div className="h-full flex flex-col">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Plan Review</h3>
                            <button
                              onClick={() => {
                                setSelectedPlan(null);
                                setUserDetails(null);
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              ×
                            </button>
                          </div>

                          {/* User Info */}
                          {userDetails && (
                            <div className="bg-slate-800 p-4 rounded-lg mb-4">
                              <h4 className="font-semibold text-emerald-400 mb-2">User Information</h4>
                              <p><strong>Name:</strong> {userDetails.name}</p>
                              <p><strong>Email:</strong> {userDetails.email}</p>
                              <p><strong>Diet Type:</strong> {userDetails.diet_type}</p>
                              <p><strong>Allergies:</strong> {userDetails.allergies || 'None'}</p>
                              <p><strong>Health Conditions:</strong> {userDetails.diseases || 'None'}</p>
                            </div>
                          )}

                          {/* Plan Content */}
                          <div className="bg-slate-800 p-4 rounded-lg mb-4 flex-1 overflow-y-auto">
                            <h4 className="font-semibold text-emerald-400 mb-2">AI-Generated Plan</h4>
                            <div className="whitespace-pre-wrap text-sm">
                              {selectedPlan.plan_content}
                            </div>
                          </div>

                          {/* Action Section */}
                          <div className="bg-slate-800 p-4 rounded-lg">
                            {!isModifying ? (
                              <>
                                <textarea
                                  placeholder="Add feedback or modifications..."
                                  value={approvalFeedback}
                                  onChange={(e) => setApprovalFeedback(e.target.value)}
                                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white mb-3"
                                  rows={3}
                                />
                                
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handlePlanAction('approve')}
                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setIsModifying(true)}
                                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                                  >
                                    Modify
                                  </button>
                                  <button
                                    onClick={() => handlePlanAction('reject')}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <textarea
                                  placeholder="Modify the plan content..."
                                  value={modifiedPlan}
                                  onChange={(e) => setModifiedPlan(e.target.value)}
                                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white mb-3"
                                  rows={6}
                                  defaultValue={selectedPlan.plan_content}
                                />
                                
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handlePlanAction('modify')}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                  >
                                    Save Modified Plan
                                  </button>
                                  <button
                                    onClick={() => setIsModifying(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 mt-20">
                          <div className="text-6xl mb-4">📝</div>
                          <h3 className="text-xl font-semibold mb-2">Plan Review</h3>
                          <p>Select a plan from the sidebar to review and approve</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="h-full flex flex-col">
                    {/* Notification */}
                    {notification && (
                      <div className={`mb-4 p-3 rounded-lg ${
                        notification.type === 'success' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-red-600 text-white'
                      }`}>
                        {notification.message}
                      </div>
                    )}
                    
                    <div className="flex-1 bg-slate-800 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-emerald-400 mb-4">Clinical Notes</h4>
                      
                      {/* Note Editor */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-slate-400">Notes for {selectedUser.name}</label>
                          <span className="text-xs text-slate-500">
                            {editingNote.length} characters
                          </span>
                        </div>
                        <textarea
                          placeholder="Add clinical notes for this user..."
                          value={editingNote}
                          onChange={(e) => setEditingNote(e.target.value)}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          rows={6}
                        />
                        <button 
                          onClick={handleAddNote}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                        >
                          Save Notes
                        </button>
                        
                        {/* Show if note has been modified */}
                        {editingNote !== savedNote && (
                          <p className="text-xs text-yellow-400 mt-2">
                            ⚠️ You have unsaved changes
                          </p>
                        )}
                      </div>

                      {/* Saved Note Preview */}
                      <div className="border-l-4 border-emerald-500 bg-slate-750 p-4 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-emerald-400">Saved Note</span>
                          <span className="text-xs text-slate-400">
                            {savedNote.split(/\s+/).filter(word => word.length > 0).length} words
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap bg-slate-800 p-3 rounded min-h-[100px]">
                          {savedNote || <span className="text-slate-500 italic">No notes saved yet</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  </div>
);
};

export default NutritionistDashboard;