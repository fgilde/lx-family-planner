import React, { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import PersonalDashboard from './components/Dashboard/PersonalDashboard';
import KitchenTabletView from './components/Dashboard/KitchenTabletView';
import CalendarView from './components/Calendar/CalendarView';
import TrashCalendarView from './components/Calendar/TrashCalendarView';
import BringShoppingList from './components/Shopping/BringShoppingList';
import MealPlanner from './components/Meals/MealPlanner';
import ChoreRewardsPlanner from './components/Tasks/ChoreRewardsPlanner';
import FamilyPinboard from './components/Board/FamilyPinboard';
import FamilyChatView from './components/Chat/FamilyChatView';
import FamilyTreeModal from './components/FamilyTree/FamilyTreeModal';
import ProfileModal from './components/ProfileModal';
import QuickAddModal from './components/QuickAddModal';
import ToastNotification from './components/ToastNotification';
import FamilyLoginScreen from './components/Auth/FamilyLoginScreen';
import OnboardingWizard from './components/Auth/OnboardingWizard';
import BringAccountModal from './components/Shopping/BringAccountModal';
import ParentAdmin from './components/Admin/ParentAdmin';
import FamilyLifeHub from './components/FamilyLife/FamilyLifeHub';
import NotificationPermissionBanner from './components/Notifications/NotificationPermissionBanner';
import ProblemReportButton from './components/ProblemReportButton';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { isPetProfile } from './constants/roles';

function MainContent() {
  const {
    activeTab,
    authStatus,
    logout,
    setActiveTab,
    activeMember,
    toast,
    setToast
  } = useFamily();
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(false);
  const [isFamilyTreeOpen, setIsFamilyTreeOpen] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const url = new URL(window.location.href);
    const requestedView = url.searchParams.get('view');
    const allowedViews = new Set([
      'dashboard',
      'chat',
      'calendar',
      'tasks',
      'board',
      'shopping',
      'meals',
      'family-life'
    ]);
    if (allowedViews.has(requestedView)) {
      if (
        !isPetProfile(activeMember) ||
        ['dashboard', 'calendar'].includes(requestedView)
      ) {
        setActiveTab(requestedView);
      }
      url.searchParams.delete('view');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [activeMember, authStatus, setActiveTab]);

  useEffect(() => {
    if (
      authStatus === 'authenticated' &&
      isPetProfile(activeMember) &&
      !['dashboard', 'calendar'].includes(activeTab)
    ) {
      setActiveTab('dashboard');
    }
  }, [activeMember, activeTab, authStatus, setActiveTab]);

  if (authStatus === 'loading') {
    return (
      <div className="app-loading">
        <div className="app-loading-mark">LX</div>
        <LoaderCircle className="spin" size={28} />
        <strong>Dein Familienraum wird vorbereitet …</strong>
      </div>
    );
  }

  if (isCreatingNewFamily && authStatus !== 'authenticated') {
    return (
      <OnboardingWizard
        onComplete={() => setIsCreatingNewFamily(false)}
        onBack={() => setIsCreatingNewFamily(false)}
      />
    );
  }

  if (authStatus !== 'authenticated') {
    return (
      <FamilyLoginScreen
        onStartOnboarding={() => setIsCreatingNewFamily(true)}
      />
    );
  }

  return (
    <div className={`app-container ${activeTab === 'kitchen' ? 'tablet-mode-active' : ''}`}>
      <div className="theme-atmosphere" aria-hidden="true">
        <span className="theme-spark">✦</span>
        <span className="theme-spark">✧</span>
        <span className="theme-spark">•</span>
      </div>
      <Header onLogout={logout} />
      <Navigation onOpenFamilyTree={() => setIsFamilyTreeOpen(true)} />
      <NotificationPermissionBanner />

      <main className="content-wrapper">
        {activeTab === 'dashboard' && <PersonalDashboard />}
        {activeTab === 'chat' && <FamilyChatView />}
        {activeTab === 'kitchen' && <KitchenTabletView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'trash' && <TrashCalendarView />}
        {activeTab === 'shopping' && <BringShoppingList />}
        {activeTab === 'meals' && <MealPlanner />}
        {activeTab === 'tasks' && <ChoreRewardsPlanner />}
        {activeTab === 'board' && <FamilyPinboard />}
        {activeTab === 'family-life' && <FamilyLifeHub />}
        {activeTab === 'admin' && (
          <ParentAdmin onOpenFamilyTree={() => setIsFamilyTreeOpen(true)} />
        )}
      </main>

      <FamilyTreeModal
        isOpen={isFamilyTreeOpen}
        onClose={() => setIsFamilyTreeOpen(false)}
      />
      <ProfileModal />
      <QuickAddModal />
      <BringAccountModal />
      <ReleaseNotesModal />
      <ProblemReportButton />
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <FamilyProvider>
      <MainContent />
    </FamilyProvider>
  );
}
