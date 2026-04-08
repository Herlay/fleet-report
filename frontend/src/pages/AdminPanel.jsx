import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserCog, Check, X, Clock, AlertCircle, Loader2, 
  ShieldCheck, RefreshCw, Users, ShieldAlert, Trash2, UserPlus 
} from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://fleet-report.onrender.com';

  // --- API CALLS ---
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/pending-users`);
      const actualUsers = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.users || []);
        
      setUsers(actualUsers);
    } catch (error) {
      console.error("API Error:", error);
      setMessage({ type: 'error', text: 'Failed to load user directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllUsers(); }, []);

  const handleAccept = async (email, userId) => {
    setProcessingId(userId);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/approve`, { email, userId });
      setMessage({ type: 'success', text: `Access granted to ${email}` });
      setUsers(users.map(u => u.user_id === userId ? { ...u, app_metadata: { is_approved: true } } : u));
    } catch (error) {
      setMessage({ type: 'error', text: `Approval failed.` });
    } finally { setProcessingId(null); }
  };

  const handleReject = async (email, userId) => {
    if (!window.confirm(`Permanently remove ${email}?`)) return;
    setProcessingId(userId);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/reject`, { userId });
      setMessage({ type: 'success', text: `Account deleted.` });
      setUsers(users.filter(user => user.user_id !== userId));
    } catch (error) {
      setMessage({ type: 'error', text: `Removal failed.` });
    } finally { setProcessingId(null); }
  };

  // ARCHITECT FIX: Updated to read the REAL backend response
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    
    setIsAddingUser(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin/invite`, { email: newEmail });
      
      const serverMessage = response.data.message;
      
      // If the backend warns us that the email failed (Render Port issue), show orange!
      if (serverMessage.includes("failed")) {
          setMessage({ type: 'warning', text: serverMessage });
      } else {
          setMessage({ type: 'success', text: serverMessage });
      }

      setIsModalOpen(false);
      setNewEmail('');
      fetchAllUsers(); // Refresh the list
    } catch (error) {
      console.error("Invite Error:", error);
      // Catch specific errors (like 409 User Already Exists)
      const errorMsg = error.response?.data?.message || `Failed to add user.`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsAddingUser(false);
    }
  };

  // --- DERIVED STATS ---
  const pendingCount = users.filter(u => !u.app_metadata?.is_approved).length;
  const authorizedCount = users.filter(u => u.app_metadata?.is_approved).length;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans relative">
      
      {/* --- ADD USER MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Add New User</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddUser} className="p-6">
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium" 
                  placeholder="colleague@vpc.com.ng" 
                  required 
                  autoFocus
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isAddingUser} 
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAddingUser ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {isAddingUser ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- END MODAL --- */}

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <UserCog className="text-blue-800" size={32} />
              Access Control
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              Manage WatchTower authorization for <span className="text-blue-800 font-bold">@vpc.com.ng</span> domain.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex"
            >
              <UserPlus size={16} />
              Add User
            </button>

            <button 
              onClick={fetchAllUsers}
              className="flex-1 sm:flex-none items-center justify-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm flex"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Users</p>
            <p className="text-2xl font-black text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Authorized</p>
            <p className="text-2xl font-black text-emerald-600">{authorizedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hidden sm:block">
            <p className="text-xs font-black text-orange-400 uppercase tracking-widest">Pending</p>
            <p className="text-2xl font-black text-orange-500">{pendingCount}</p>
          </div>
        </div>

        {/* ARCHITECT FIX: Notification Toast with Warning styling */}
        {message && (
          <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-4 duration-300 flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
            message.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-800' : 
            'bg-red-50 border-red-100 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="font-bold text-sm">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[400px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
              <p className="text-slate-400 font-bold uppercase tracking-tighter">Loading Users Account...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Users size={48} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Directory Empty</h3>
              <p className="text-slate-500 text-sm max-w-xs mt-1">No user accounts found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => {
                const isApproved = user.app_metadata?.is_approved === true;
                const isProcessing = processingId === user.user_id;

                return (
                  <div key={user.user_id} className="group p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    
                    <div className="flex items-center gap-4 w-full">
                      <div className={`relative shrink-0 p-3 rounded-2xl transition-transform group-hover:scale-110 ${
                        isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'
                      }`}>
                        {isApproved ? <ShieldCheck size={24} /> : <Clock size={24} />}
                        {!isApproved && (
                          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 border-2 border-white rounded-full animate-pulse"></span>
                        )}
                      </div>
                      
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {isApproved ? 'Access Active' : 'Waiting for Review'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      {!isApproved && (
                        <button
                          onClick={() => handleAccept(user.email, user.user_id)}
                          disabled={processingId !== null}
                          className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          Approve
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleReject(user.email, user.user_id)}
                        disabled={processingId !== null}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                          isApproved 
                            ? 'bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {isApproved ? <ShieldAlert size={16} /> : <Trash2 size={16} />}
                        {isApproved ? 'Revoke' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;