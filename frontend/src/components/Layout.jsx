import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  LayoutDashboard, FileText, Upload, Truck, Menu, X, 
  Calendar, CalendarDays, Wrench, User, UserCog, LogOut, Database
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // --- AUTH0 INTEGRATION ---
  const { user, logout } = useAuth0();

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // --- DYNAMIC SIDEBAR MENU ---
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/maintenance', label: 'Maintenance', icon: Wrench },
    { path: '/upload', label: 'Data Upload', icon: Upload },
    { path: '/reports', label: 'Weekly Reports', icon: FileText },
    { path: '/monthly_reports', label: 'Monthly Reports', icon: Calendar },
    { path: '/custom_reports', label: 'Custom Reports', icon: CalendarDays },
    { path: '/trips', label: 'All Trips', icon: Truck },
    { path: '/capacity_manager', label: 'Fleet Settings', icon: Database },
 
    // SECRET INJECTION: Only add the Admin Panel if the user is authorized!
    ...(user?.email === 'solomon.d@vpc.com.ng' 
      ? [{ path: '/admin', label: 'Admin Page', icon: UserCog }] 
      : []
    ),
  ];

  // Find the current page to display in the header title
  const currentItem = menuItems.find(item => item.path === location.pathname) || { label: 'WatchTower' };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Mobile Responsiveness Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Truck className="text-white-500" size={30} />
            <h1 className="text-xl font-bold tracking-tight">
              WatchTower<span className="text-blue-500"> Report</span>
            </h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP HEADER (User Profile & Logout) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
            
            {/* Left Side: Menu Toggle & Page Title */}
            <div className="flex items-center">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="mr-4 lg:hidden text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <Menu size={24} />
                </button>
                <h2 className="text-lg font-black text-slate-700 tracking-tight">
                    {currentItem.label}
                </h2>
            </div>

            {/* Right Side: Global User Profile & Logout */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Profile Info (Hidden on tiny mobile screens to save space) */}
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 tracking-tight">
                    {user?.name || user?.email || 'Authorized User'}
                  </span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                   WatchTower
                  </span>
                </div>
                {user?.picture ? (
                  <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border border-slate-200 object-cover shadow-sm" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                    {user?.name?.charAt(0) || <User size={16} />}
                  </div>
                )}
              </div>

              {/* Mobile Only Avatar (Shows only when name is hidden) */}
              <div className="sm:hidden">
                {user?.picture ? (
                  <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0) || <User size={14} />}
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout} 
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                title="Sign Out"
              >
                <LogOut color='red' size={20} />
              </button>

            </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;