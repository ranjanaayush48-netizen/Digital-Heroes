import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { CharitiesView } from './components/CharitiesView';
import { DrawsView } from './components/DrawsView';
import { SubscriptionView } from './components/SubscriptionView';
import { DashboardView } from './components/DashboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { Charity, MonthlyDraw } from './types';
import { getCharities } from './lib/charityService';
import { getPublishedDraws } from './lib/drawService';
import { INITIAL_CHARITIES, INITIAL_DRAWS } from './lib/demoData';

type ViewMode = 'home' | 'charities' | 'draws' | 'dashboard' | 'admin' | 'subscribe' | 'auth';

function MainApp() {
  const { currentUser, userProfile, isAdmin, isSubscriber, loading } = useAuth();
  
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [charities, setCharities] = useState<Charity[]>(INITIAL_CHARITIES);
  const [draws, setDraws] = useState<MonthlyDraw[]>(INITIAL_DRAWS);
  
  // Auth Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Prompt onboarding if user authenticated with Google but lacks Firestore profile
  useEffect(() => {
    if (currentUser && !loading && !userProfile) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
    }
  }, [currentUser, loading, userProfile]);

  const loadData = async () => {
    try {
      const fetchedCharities = await getCharities();
      if (fetchedCharities.length > 0) {
        setCharities(fetchedCharities);
      }
      const fetchedDraws = await getPublishedDraws();
      if (fetchedDraws.length > 0) {
        setDraws(fetchedDraws);
      }
    } catch (err) {
      console.warn('Initial data load note (using resilient seed data):', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1411] text-[#E8EAE6] flex flex-col font-sans selection:bg-[#2b4c34] selection:text-[#a8ebb9]">
      
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'dashboard' && !currentUser) {
            handleOpenAuth('login');
          } else if (view === 'admin' && !isAdmin) {
            handleOpenAuth('login');
          } else {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            charities={charities}
            latestDraw={draws[0]}
            onOpenSubscribe={() => setCurrentView('subscribe')}
            onOpenCharities={() => setCurrentView('charities')}
            onOpenDraws={() => setCurrentView('draws')}
            onOpenAuth={() => handleOpenAuth('signup')}
          />
        )}

        {currentView === 'charities' && (
          <CharitiesView
            charities={charities}
            onSelectCharity={(id) => {
              if (!currentUser) {
                handleOpenAuth('signup');
              }
            }}
            onRefresh={loadData}
          />
        )}

        {currentView === 'draws' && (
          <DrawsView
            draws={draws}
            onOpenSubscribe={() => setCurrentView('subscribe')}
          />
        )}

        {currentView === 'subscribe' && (
          <SubscriptionView
            charities={charities}
            onSuccess={() => setCurrentView('dashboard')}
            onOpenAuth={() => handleOpenAuth('signup')}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            charities={charities}
            draws={draws}
            onOpenSubscribe={() => setCurrentView('subscribe')}
            onOpenCharities={() => setCurrentView('charities')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            charities={charities}
            draws={draws}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        charities={charities}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
