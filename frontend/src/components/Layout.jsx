import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  LayoutDashboard, FileText, Upload, Truck, Menu, X, 
  Calendar, CalendarDays, Wrench, User, UserCog, LogOut, Database,
  ChevronRight, Bell
} from 'lucide-react';

// SAAS SIDEBAR ITEM COMPONENT ---
const SidebarItem = ({ icon: Icon, label, to, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => 
      `group flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-semibold' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className="flex items-center space-x-3">
          {/* Fix applied here: className is now a simple string, evaluating the isActive boolean */}
          <Icon 
            size={18} 
            className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} 
          />
          <span className="text-[13px] tracking-wide">{label}</span>
        </div>
        
        {/* Subtle active indicator arrow */}
        <ChevronRight 
          size={14} 
          className={`transition-all ${isActive ? 'opacity-100 text-blue-600 translate-x-0' : 'opacity-0 -translate-x-2 text-slate-300 group-hover:opacity-100 group-hover:translate-x-0'}`} 
        />
      </>
    )}
  </NavLink>
);

// --- SIDEBAR SECTION HEADER ---
const SectionHeader = ({ title }) => (
  <div className="px-3 pt-5 pb-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      {title}
    </span>
  </div>
);

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth0();

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // --- SAAS MENU STRUCTURE (Grouped for clarity) ---
  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/maintenance', label: 'Maintenance Logs', icon: Wrench },
        { path: '/trips', label: 'All Trips', icon: Truck },
      ]
    },
    {
      title: 'Analytics & Reporting',
      items: [
        { path: '/reports', label: 'Weekly Report', icon: FileText },
        { path: '/monthly_reports', label: 'Monthly Report', icon: Calendar },
        { path: '/custom_reports', label: 'Custom Report', icon: CalendarDays },
      ]
    },
    {
      title: 'System & Configuration',
      items: [
        { path: '/upload', label: 'Data Import', icon: Upload },
        { path: '/capacity_manager', label: 'Fleet Settings', icon: Database },
        // Admin injection
        ...(user?.email === 'solomon.d@vpc.com.ng' 
          ? [{ path: '/admin', label: 'Admin Portal', icon: UserCog }] 
          : []
        )
      ]
    }
  ];

  // Flatten array just to find the current page title for the header
  const allItems = menuGroups.flatMap(group => group.items);
  const currentItem = allItems.find(item => item.path === location.pathname) || { label: 'WatchTower' };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SAAS SIDEBAR (Light Mode/Clean Style) --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Logo Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Truck size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-[15px] font-extrabold text-slate-800 tracking-tight">
              Watch<span className="text-blue-600">Tower</span>
            </h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-2">
              <SectionHeader title={group.title} />
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Sidebar Footer (System Status) */}
        <div className="p-4 border-t border-slate-100">
           <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 flex items-start gap-3">
              <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-200 shrink-0">
                 <Truck size={14} className="text-blue-600" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-700">WatchTower</p>
                 <p className="text-[9px] text-slate-500 mt-0.5"> © {new Date().getFullYear()} Virgo Point Capital</p>
              </div>
           </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* SAAS TOP HEADER */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
            
            {/* Left: Mobile Toggle & Breadcrumb/Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors"
                >
                  <Menu size={20} />
                </button>
                <div className="flex flex-col truncate">
                   {/* Subtle Breadcrumb-style title */}
                  
                   <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
                       {currentItem.label}
                   </h2>
                </div>
            </div>

            {/* Right: Actions & User Profile */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              
                           <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
              
              {/* Profile Dropdown Area */}
              <div className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 py-1 px-2 rounded-lg transition-colors">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-[12px] font-bold text-slate-700 tracking-tight group-hover:text-blue-600 transition-colors">
                    {user?.name || user?.email || 'Authorized User'}
                  </span>
                 
                </div>
                
                <div className="relative">
                  {user?.picture ? (
                    <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                      {user?.name?.charAt(0) || <User size={14} />}
                    </div>
                  )}
                  {/* Online Status Dot */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
              </div>

              {/* Logout Button (Subtle styling) */}
              <button 
                onClick={handleLogout} 
                className="ml-1 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                title="Sign Out"
              >
                <LogOut size={18} strokeWidth={2} />
              </button>

            </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto w-full">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;