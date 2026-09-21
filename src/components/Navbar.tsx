import React from 'react';
import { useAuth } from '../lib/authContext';
import { Shield, Heart, Award, LogOut, User as UserIcon, Settings, Compass, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'charities' | 'draws' | 'dashboard' | 'admin' | 'subscribe' | 'auth';
  onNavigate: (view: 'home' | 'charities' | 'draws' | 'dashboard' | 'admin' | 'subscribe' | 'auth') => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-[#121513]/95 backdrop-blur-md border-b border-[#28322b] text-[#E8EAE6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand */}
        <button 
          id="nav-brand-btn"
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-3 text-left group transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-[#223928] border border-[#37583f] flex items-center justify-center text-[#9ee4b2] group-hover:bg-[#2c4b34] transition-all">
            <Shield className="w-5 h-5 text-[#88dd9e]" />
          </div>
          <div>
            <div className="font-serif tracking-tight text-lg sm:text-xl font-bold text-[#F4F6F2] flex items-center gap-1.5">
              <span>digital</span>
              <span className="text-[#88dd9e] uppercase text-sm tracking-widest font-sans font-semibold">.Heroes</span>
            </div>
            <p className="text-[11px] text-[#8e9c91] hidden sm:block">Golf Performance · Charity · Monthly Draws</p>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            id="nav-link-home"
            onClick={() => onNavigate('home')}
            className={`px-3.5 py-2 rounded-md transition-colors ${
              currentView === 'home' ? 'text-[#88dd9e] bg-[#1a251e]' : 'text-[#abb5ad] hover:text-[#f4f6f2] hover:bg-[#1a251e]/50'
            }`}
          >
            Concept
          </button>
          <button
            id="nav-link-charities"
            onClick={() => onNavigate('charities')}
            className={`px-3.5 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'charities' ? 'text-[#88dd9e] bg-[#1a251e]' : 'text-[#abb5ad] hover:text-[#f4f6f2] hover:bg-[#1a251e]/50'
            }`}
          >
            <Heart className="w-4 h-4 text-[#88dd9e]" />
            Charities
          </button>
          <button
            id="nav-link-draws"
            onClick={() => onNavigate('draws')}
            className={`px-3.5 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
              currentView === 'draws' ? 'text-[#88dd9e] bg-[#1a251e]' : 'text-[#abb5ad] hover:text-[#f4f6f2] hover:bg-[#1a251e]/50'
            }`}
          >
            <Award className="w-4 h-4 text-[#88dd9e]" />
            Prize Draws
          </button>

          {currentUser && (
            <button
              id="nav-link-dashboard"
              onClick={() => onNavigate('dashboard')}
              className={`px-3.5 py-2 rounded-md transition-colors ${
                currentView === 'dashboard' ? 'text-[#88dd9e] bg-[#1a251e]' : 'text-[#abb5ad] hover:text-[#f4f6f2] hover:bg-[#1a251e]/50'
              }`}
            >
              My Dashboard
            </button>
          )}

          {isAdmin && (
            <button
              id="nav-link-admin"
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                currentView === 'admin' ? 'text-[#e6c172] bg-[#272317]' : 'text-[#d6bd88] hover:text-[#fff2d1] hover:bg-[#272317]/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          )}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                id="user-profile-btn"
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2d3b32] bg-[#1a251e] hover:border-[#415748] transition text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[#2a4533] text-[#a4ebb7] flex items-center justify-center text-xs font-semibold">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-xs">
                  <div className="font-semibold text-[#f1f4f0] leading-tight truncate max-w-[120px]">
                    {userProfile?.displayName || 'Subscriber'}
                  </div>
                  <div className="text-[10px] text-[#7d9283] flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${userProfile?.subscriptionStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {userProfile?.role === 'admin' ? 'Administrator' : userProfile?.subscriptionStatus || 'active'}
                  </div>
                </div>
              </button>
              <button
                id="logout-btn"
                onClick={logout}
                className="p-2 rounded-lg text-[#8f9f93] hover:text-[#e4a0a0] hover:bg-[#241a1a] transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="header-login-btn"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-sm text-[#b2bfb5] hover:text-[#ffffff] transition"
              >
                Sign In
              </button>
              <button
                id="header-join-btn"
                onClick={() => onNavigate('subscribe')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#274732] hover:bg-[#325a40] text-[#e8f7ed] border border-[#447754] transition shadow-sm"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden border-t border-[#232b25] px-4 py-2 flex items-center justify-around text-xs text-[#a2aba4]">
        <button 
          onClick={() => onNavigate('home')} 
          className={`py-1 ${currentView === 'home' ? 'text-[#88dd9e] font-semibold' : ''}`}
        >
          Concept
        </button>
        <button 
          onClick={() => onNavigate('charities')} 
          className={`py-1 flex items-center gap-1 ${currentView === 'charities' ? 'text-[#88dd9e] font-semibold' : ''}`}
        >
          <Heart className="w-3 h-3 text-[#88dd9e]" />
          Charities
        </button>
        <button 
          onClick={() => onNavigate('draws')} 
          className={`py-1 flex items-center gap-1 ${currentView === 'draws' ? 'text-[#88dd9e] font-semibold' : ''}`}
        >
          <Award className="w-3 h-3 text-[#88dd9e]" />
          Draws
        </button>
        {currentUser ? (
          <button 
            onClick={() => onNavigate('dashboard')} 
            className={`py-1 ${currentView === 'dashboard' ? 'text-[#88dd9e] font-semibold' : ''}`}
          >
            Dashboard
          </button>
        ) : (
          <button 
            onClick={() => onNavigate('subscribe')} 
            className="py-1 text-[#88dd9e] font-semibold"
          >
            Join
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => onNavigate('admin')} 
            className={`py-1 text-[#e6c172] ${currentView === 'admin' ? 'font-bold underline' : ''}`}
          >
            Admin
          </button>
        )}
      </div>
    </header>
  );
};
