import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCog, Check, X, Clock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); 
  const [message, setMessage] = useState(null);

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5173' 
    : 'https://fleet-report.onrender.com';

  // 1. Fetch ALL users belonging to the company domain
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/pending-users`);
      
      const userData = response.data.users;
      
      if (Array.isArray(userData)) {
        setUsers(userData);
      } else if (userData && Array.isArray(userData.users)) {
        setUsers(userData.users);
      } else {
        setUsers([]); 
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load user directory.' });
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleAccept = async (email, userId) => {
    setProcessingId(userId);
    setMessage(null);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/approve`, { email, userId });
      setMessage({ type: 'success', text: `${email} has been approved!` });
      // Update local state to show them as approved immediately
      setUsers(users.map(u => u.user_id === userId ? { ...u, app_metadata: { is_approved: true } } : u));
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to approve ${email}.` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (email, userId) => {
    if (!window.confirm(`Permanently delete account for ${email}?`)) return;
    setProcessingId(userId);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/reject`, { userId });
      setMessage({ type: 'success', text: `Account for ${email} deleted.` });
      setUsers(users.filter(user => user.user_id !== userId));
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to remove ${email}.` });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 sm:p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-2xl">
              <UserCog className="text-blue-400" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">User Management</h2>
              <p className="text-slate-400 text-sm font-medium">Manage access and authorization for WatchTower.</p>
            </div>
          </div>
          <button onClick={fetchAllUsers} className="text-slate-400 hover:text-white transition-colors">
            <Clock size={20} />
          </button>
        </div>

        {message && (
          <div className={`m-6 p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-bold text-sm uppercase tracking-widest">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">No users found on the @vpc.com.ng domain.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => {
                const isApproved = user.app_metadata?.is_approved === true;
                
                return (
                  <div key={user.user_id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all gap-4">
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className={`p-3 rounded-xl ${isApproved ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                        {isApproved ? <ShieldCheck className="text-emerald-600" size={20} /> : <Clock className="text-orange-500" size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{user.email}</p>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isApproved ? 'Authorized' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!isApproved && (
                        <button
                          onClick={() => handleAccept(user.email, user.user_id)}
                          disabled={processingId !== null}
                          className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          {processingId === user.user_id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(user.email, user.user_id)}
                        disabled={processingId !== null}
                        className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                      >
                        <X size={14} /> {isApproved ? 'Revoke' : 'Reject'}
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