import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { exportEventsToICS, parseICSContent } from '../utils/icsUtils';
import { canManageFamily } from '../constants/roles';
import {
  currentBrowserSubscription,
  friendlyDeviceName,
  notificationPermission,
  subscribeBrowser,
  webPushCapability
} from '../hooks/useWebNotifications';

const FamilyContext = createContext(null);

const EMPTY_RESOURCES = {
  events: [],
  shoppingItems: [],
  tasks: [],
  notes: [],
  meals: [],
  savedRecipes: [],
  rewards: [],
  chatMessages: [],
  familyTree: [],
  dashboardLinks: [],
  trashEvents: [],
  moodCheckins: []
};
const EMPTY_INTEGRATIONS = {
  bring: { connected: false },
  gotify: {
    connected: false,
    rules: {
      groupChat: true,
      directMessages: false,
      taskCompleted: true,
      moodHelp: true,
      includeMessageText: false
    }
  }
};

function initialWebPushState() {
  const capability = webPushCapability();
  return {
    ...capability,
    permission: notificationPermission(),
    loading: true,
    busy: '',
    publicKey: '',
    defaults: {},
    currentDeviceId: '',
    devices: []
  };
}

export const FUNNY_COMIC_AVATARS = [
  {
    id: 'av-1',
    name: 'Mutiger Löwe',
    url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=240&q=80'
  },
  {
    id: 'av-2',
    name: 'Schlauer Fuchs',
    url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=240&q=80'
  },
  {
    id: 'av-3',
    name: 'Abenteuer-Hund',
    url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=240&q=80'
  },
  {
    id: 'av-4',
    name: 'Ninja-Katze',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=240&q=80'
  },
  {
    id: 'av-5',
    name: 'Roter Panda',
    url: 'https://images.unsplash.com/photo-1625859043880-56acbcb6a6ac?auto=format&fit=crop&w=240&q=80'
  },
  {
    id: 'av-6',
    name: 'Weltraum-Buddy',
    url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=240&q=80'
  }
];

async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(
      data?.error || 'Die Anfrage konnte nicht verarbeitet werden.'
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function resourceWithDefaults(resources) {
  return Object.fromEntries(
    Object.keys(EMPTY_RESOURCES).map(key => [
      key,
      Array.isArray(resources?.[key]) ? resources[key] : []
    ])
  );
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FamilyProvider({ children }) {
  const [authStatus, setAuthStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeHouseholdState, setActiveHouseholdState] = useState(
    () => localStorage.getItem('lx_active_household') || 'familie'
  );
  const [familiesList, setFamiliesList] = useState([]);
  const [familyAccount, setFamilyAccount] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeMemberIdState, setActiveMemberIdState] = useState('');
  const [resources, setResources] = useState(EMPTY_RESOURCES);
  const [familyRelationships, setFamilyRelationships] = useState([]);
  const [integrations, setIntegrations] = useState(EMPTY_INTEGRATIONS);
  const [webPush, setWebPush] = useState(initialWebPushState);
  const [bringCatalog, setBringCatalog] = useState({
    sections: [],
    total: 0,
    source: 'loading'
  });
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('lx_theme') || 'light'
  );
  const [toast, setToast] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultType, setQuickAddDefaultType] = useState('event');
  const [isBringModalOpen, setIsBringModalOpen] = useState(false);
  const versionRef = useRef(0);
  const toastTimerRef = useRef(null);
  const liveRefreshRef = useRef(false);

  const showToast = useCallback((title, message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshPublicFamilies = useCallback(async () => {
    try {
      const data = await apiRequest('/api/public/families');
      setFamiliesList(data.families || []);
      return data.families || [];
    } catch (error) {
      showToast('Verbindung fehlt', error.message, 'error');
      return [];
    }
  }, [showToast]);

  const applyBootstrap = useCallback(data => {
    setFamilyAccount(data.family || null);
    setMembers(data.members || []);
    setResources(resourceWithDefaults(data.resources));
    setFamilyRelationships(data.familyRelationships || []);
    setIntegrations(data.integrations || EMPTY_INTEGRATIONS);
    setActiveMemberIdState(data.activeMemberId || '');
    versionRef.current = Number(data.version || 0);
  }, []);

  const refreshBootstrap = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await apiRequest('/api/bootstrap');
      applyBootstrap(data);
      setAuthStatus(data.activeMemberId ? 'authenticated' : 'profile-required');
      return data;
    } catch (error) {
      if (error.status === 401) {
        setAuthStatus('anonymous');
        setFamilyAccount(null);
        setMembers([]);
        setResources(EMPTY_RESOURCES);
        setFamilyRelationships([]);
        setIntegrations(EMPTY_INTEGRATIONS);
        setWebPush(initialWebPushState());
      } else if (!silent) {
        showToast('Aktualisierung fehlgeschlagen', error.message, 'error');
      }
      return null;
    }
  }, [applyBootstrap, showToast]);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      await refreshPublicFamilies();
      if (cancelled) return;
      await refreshBootstrap({ silent: true });
      if (cancelled) return;
      setAuthStatus(current => (current === 'loading' ? 'anonymous' : current));
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, [refreshBootstrap, refreshPublicFamilies]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;
    const checkVersion = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await apiRequest('/api/family/version');
        if (Number(data.version) !== versionRef.current) {
          await refreshBootstrap({ silent: true });
        }
      } catch (error) {
        if (error.status === 401) setAuthStatus('anonymous');
      }
    };
    const interval = window.setInterval(checkVersion, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authStatus, refreshBootstrap]);

  const activeMember = useMemo(
    () =>
      members.find(member => member.id === activeMemberIdState) ||
      members[0] ||
      null,
    [activeMemberIdState, members]
  );

  const refreshWebPushStatus = useCallback(async ({ silent = false } = {}) => {
    const capability = webPushCapability();
    setWebPush(previous => ({
      ...previous,
      ...capability,
      permission: notificationPermission(),
      loading: !silent
    }));
    if (authStatus !== 'authenticated' || !activeMemberIdState) {
      setWebPush(previous => ({
        ...previous,
        loading: false,
        publicKey: '',
        currentDeviceId: '',
        devices: []
      }));
      return null;
    }
    try {
      let currentEndpoint = '';
      if (
        capability.supported &&
        notificationPermission() === 'granted'
      ) {
        try {
          currentEndpoint =
            (await currentBrowserSubscription())?.endpoint || '';
        } catch {
          currentEndpoint = '';
        }
      }
      const data = await apiRequest(
        `/api/push/status${
          currentEndpoint
            ? `?endpoint=${encodeURIComponent(currentEndpoint)}`
            : ''
        }`
      );
      setWebPush(previous => ({
        ...previous,
        ...capability,
        permission: notificationPermission(),
        loading: false,
        publicKey: data.publicKey || '',
        defaults: data.defaults || {},
        currentDeviceId: data.currentDeviceId || '',
        devices: data.devices || []
      }));
      return data;
    } catch (error) {
      setWebPush(previous => ({ ...previous, loading: false }));
      if (!silent) {
        showToast(
          'Benachrichtigungen nicht erreichbar',
          error.message,
          'warning'
        );
      }
      return null;
    }
  }, [activeMemberIdState, authStatus, showToast]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeMemberIdState) return undefined;
    refreshWebPushStatus({ silent: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshWebPushStatus({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activeMemberIdState, authStatus, refreshWebPushStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;
    const source = new EventSource('/api/live');
    const onFamilyUpdate = async event => {
      let nextVersion = 0;
      try {
        nextVersion = Number(JSON.parse(event.data)?.version || 0);
      } catch {
        nextVersion = 0;
      }
      if (
        !nextVersion ||
        nextVersion === versionRef.current ||
        liveRefreshRef.current
      ) {
        return;
      }
      liveRefreshRef.current = true;
      try {
        await refreshBootstrap({ silent: true });
      } finally {
        liveRefreshRef.current = false;
      }
    };
    source.addEventListener('family-update', onFamilyUpdate);
    return () => {
      source.removeEventListener('family-update', onFamilyUpdate);
      source.close();
    };
  }, [authStatus, refreshBootstrap]);

  useEffect(() => {
    const nextTheme = activeMember?.theme || theme || 'light';
    setThemeState(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.setAttribute(
      'data-profile-mode',
      activeMember?.role === 'child' ? 'child' : 'adult'
    );
  }, [activeMember?.id, activeMember?.role, activeMember?.theme]);

  const setActiveHousehold = useCallback(value => {
    setActiveHouseholdState(value);
    localStorage.setItem('lx_active_household', value);
  }, []);

  useEffect(() => {
    if (
      familyAccount?.grandparentsHouseholdEnabled === false &&
      activeHouseholdState !== 'familie'
    ) {
      setActiveHouseholdState('familie');
      localStorage.setItem('lx_active_household', 'familie');
    }
  }, [
    activeHouseholdState,
    familyAccount?.grandparentsHouseholdEnabled
  ]);

  const loginFamily = useCallback(async (familyId, password) => {
    const data = await apiRequest('/api/auth/family', {
      method: 'POST',
      body: JSON.stringify({ familyId, password })
    });
    setFamilyAccount(data.family);
    setMembers(data.members || []);
    setActiveMemberIdState('');
    setAuthStatus('profile-required');
    return data;
  }, []);

  const selectMemberProfile = useCallback(async (
    memberId,
    pin = '',
    familyPassword = ''
  ) => {
    const data = await apiRequest('/api/auth/member', {
      method: 'POST',
      body: JSON.stringify({ memberId, pin, familyPassword })
    });
    setActiveMemberIdState(memberId);
    setMembers(previous =>
      previous.map(member => (member.id === memberId ? data.member : member))
    );
    localStorage.setItem('lx_active_member', memberId);
    setAuthStatus('authenticated');
    await refreshBootstrap({ silent: true });
    return data.member;
  }, [refreshBootstrap]);

  const registerFamily = useCallback(async payload => {
    const data = await apiRequest('/api/public/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setFamilyAccount(data.family);
    setMembers(data.members || []);
    setActiveMemberIdState(data.activeMemberId || '');
    setResources(EMPTY_RESOURCES);
    setFamilyRelationships([]);
    setIntegrations(EMPTY_INTEGRATIONS);
    setWebPush(initialWebPushState());
    setAuthStatus('authenticated');
    await refreshPublicFamilies();
    await refreshBootstrap({ silent: true });
    return data;
  }, [refreshBootstrap, refreshPublicFamilies]);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Local sign-out still succeeds if the server is temporarily unreachable.
    }
    setAuthStatus('anonymous');
    setFamilyAccount(null);
    setMembers([]);
    setActiveMemberIdState('');
    setResources(EMPTY_RESOURCES);
    setFamilyRelationships([]);
    setIntegrations(EMPTY_INTEGRATIONS);
    setWebPush(initialWebPushState());
    setActiveTab('dashboard');
    localStorage.removeItem('lx_active_member');
  }, []);

  const setTheme = useCallback(async nextTheme => {
    setThemeState(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('lx_theme', nextTheme);
    if (!activeMember?.id) return;
    try {
      const data = await apiRequest(`/api/members/${activeMember.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme: nextTheme })
      });
      setMembers(previous =>
        previous.map(member => (member.id === data.member.id ? data.member : member))
      );
      versionRef.current = Number(data.version || versionRef.current);
    } catch (error) {
      showToast('Design nicht gespeichert', error.message, 'error');
    }
  }, [activeMember?.id, showToast]);

  const updateResourceState = useCallback((type, record) => {
    setResources(previous => ({
      ...previous,
      [type]: previous[type].some(item => item.id === record.id)
        ? previous[type].map(item => (item.id === record.id ? record : item))
        : [record, ...previous[type]]
    }));
  }, []);

  const createResource = useCallback(async (type, record) => {
    const data = await apiRequest(`/api/resources/${type}`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
    updateResourceState(type, data.record);
    versionRef.current = Number(data.version || versionRef.current);
    return data.record;
  }, [updateResourceState]);

  const patchResource = useCallback(async (type, id, changes) => {
    const data = await apiRequest(`/api/resources/${type}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });
    updateResourceState(type, data.record);
    versionRef.current = Number(data.version || versionRef.current);
    return data.record;
  }, [updateResourceState]);

  const removeResource = useCallback(async (type, id) => {
    const data = await apiRequest(`/api/resources/${type}/${id}`, {
      method: 'DELETE'
    });
    setResources(previous => ({
      ...previous,
      [type]: previous[type].filter(item => item.id !== id)
    }));
    versionRef.current = Number(data.version || versionRef.current);
  }, []);

  const bulkCreateResources = useCallback(async (type, records) => {
    const data = await apiRequest(`/api/resources/${type}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ records })
    });
    setResources(previous => ({
      ...previous,
      [type]: [...data.records, ...previous[type].filter(
        existing => !data.records.some(record => record.id === existing.id)
      )]
    }));
    versionRef.current = Number(data.version || versionRef.current);
    return data.records;
  }, []);

  const applyShoppingRecords = useCallback(data => {
    const records = Array.isArray(data?.records) ? data.records : [];
    setResources(previous => ({ ...previous, shoppingItems: records }));
    versionRef.current = Number(data?.version || versionRef.current);
    return records;
  }, []);

  const withActionError = useCallback(async (action, title = 'Änderung fehlgeschlagen') => {
    try {
      return await action();
    } catch (error) {
      showToast(title, error.message, 'error');
      return null;
    }
  }, [showToast]);

  const enableWebPush = useCallback(async (preferences = {}) => {
    const capability = webPushCapability();
    if (!capability.supported) {
      showToast(
        'Benachrichtigungen noch nicht möglich',
        capability.message,
        'warning'
      );
      return null;
    }
    setWebPush(previous => ({ ...previous, busy: 'enable' }));
    try {
      const status = webPush.publicKey
        ? webPush
        : await apiRequest('/api/push/status');
      const subscription = await subscribeBrowser(status.publicKey);
      const data = await apiRequest('/api/push/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: friendlyDeviceName(),
          preferences: {
            ...(status.defaults || {}),
            ...preferences
          }
        })
      });
      setWebPush(previous => ({
        ...previous,
        ...capability,
        permission: notificationPermission(),
        busy: '',
        publicKey: status.publicKey,
        defaults: status.defaults || previous.defaults,
        currentDeviceId: data.device.id,
        devices: [
          data.device,
          ...previous.devices.filter(device => device.id !== data.device.id)
        ]
      }));
      showToast(
        'Benachrichtigungen sind an',
        `Dieses Gerät meldet sich jetzt für ${activeMember?.name || 'dich'}.`,
        'success'
      );
      return data.device;
    } catch (error) {
      setWebPush(previous => ({
        ...previous,
        permission: notificationPermission(),
        busy: ''
      }));
      showToast('Aktivierung nicht möglich', error.message, 'warning');
      return null;
    }
  }, [
    activeMember?.name,
    showToast,
    webPush.defaults,
    webPush.publicKey
  ]);

  const disableWebPush = useCallback(async () => {
    setWebPush(previous => ({ ...previous, busy: 'disable' }));
    try {
      const subscription = await currentBrowserSubscription();
      if (subscription) {
        const data = await apiRequest('/api/push/subscriptions', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        if (data.unsubscribeBrowser) {
          await subscription.unsubscribe();
        }
      }
      setWebPush(previous => ({
        ...previous,
        busy: '',
        currentDeviceId: '',
        devices: previous.devices.filter(
          device => device.id !== previous.currentDeviceId
        ),
        permission: notificationPermission()
      }));
      showToast(
        'Benachrichtigungen ausgeschaltet',
        'Dieses Gerät erhält keine Browser-Meldungen mehr.',
        'info'
      );
      return true;
    } catch (error) {
      setWebPush(previous => ({ ...previous, busy: '' }));
      showToast('Ausschalten nicht möglich', error.message, 'warning');
      return false;
    }
  }, [showToast]);

  const updateWebPushPreferences = useCallback(async preferences => {
    setWebPush(previous => ({ ...previous, busy: 'save' }));
    try {
      const subscription = await currentBrowserSubscription();
      if (!subscription) {
        throw new Error('Dieses Gerät ist noch nicht angemeldet.');
      }
      const currentDevice = webPush.devices.find(
        device => device.id === webPush.currentDeviceId
      );
      const data = await apiRequest('/api/push/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: currentDevice?.deviceName || friendlyDeviceName(),
          preferences: {
            ...webPush.defaults,
            ...(currentDevice?.preferences || {}),
            ...preferences
          }
        })
      });
      setWebPush(previous => ({
        ...previous,
        busy: '',
        currentDeviceId: data.device.id,
        devices: [
          data.device,
          ...previous.devices.filter(device => device.id !== data.device.id)
        ]
      }));
      showToast(
        'Benachrichtigungen gespeichert',
        'Deine Auswahl gilt sofort auf diesem Gerät.',
        'success'
      );
      return data.device;
    } catch (error) {
      setWebPush(previous => ({ ...previous, busy: '' }));
      showToast('Speichern nicht möglich', error.message, 'warning');
      return null;
    }
  }, [
    showToast,
    webPush.currentDeviceId,
    webPush.defaults,
    webPush.devices
  ]);

  const testWebPush = useCallback(async () => {
    setWebPush(previous => ({ ...previous, busy: 'test' }));
    try {
      await apiRequest('/api/push/test', { method: 'POST' });
      setWebPush(previous => ({ ...previous, busy: '' }));
      showToast(
        'Test wurde gesendet',
        'Die Meldung sollte gleich auf diesem Gerät erscheinen.',
        'success'
      );
      return true;
    } catch (error) {
      setWebPush(previous => ({ ...previous, busy: '' }));
      showToast('Test fehlgeschlagen', error.message, 'warning');
      return false;
    }
  }, [showToast]);

  const fetchPushDevices = useCallback(async () => {
    const data = await apiRequest('/api/push/devices');
    return data.devices || [];
  }, []);

  const removePushDevice = useCallback(async deviceId => {
    await apiRequest(`/api/push/devices/${deviceId}`, { method: 'DELETE' });
    setWebPush(previous => ({
      ...previous,
      currentDeviceId:
        previous.currentDeviceId === deviceId ? '' : previous.currentDeviceId,
      devices: previous.devices.filter(device => device.id !== deviceId)
    }));
    showToast(
      'Gerät entfernt',
      'Dieses Gerät erhält keine Familienmeldungen mehr.',
      'info'
    );
    return true;
  }, [showToast]);

  const addEvent = useCallback(eventData =>
    withActionError(async () => {
      const event = await createResource('events', {
        id: makeId('evt'),
        household: activeHouseholdState,
        ...eventData
      });
      showToast('Termin hinzugefügt', `"${event.title}" steht jetzt im Kalender.`, 'success');
      return event;
    }), [activeHouseholdState, createResource, showToast, withActionError]);

  const deleteEvent = useCallback(eventId =>
    withActionError(async () => {
      await removeResource('events', eventId);
      showToast('Termin gelöscht', 'Der Termin wurde entfernt.', 'info');
    }), [removeResource, showToast, withActionError]);

  const importICS = useCallback(file => {
    const reader = new FileReader();
    reader.onload = async event => {
      const parsed = parseICSContent(event.target.result);
      if (!parsed.length) {
        showToast('Import nicht möglich', 'Keine gültigen Termine gefunden.', 'warning');
        return;
      }
      await withActionError(async () => {
        const records = parsed.map(item => ({
          ...item,
          id: item.id || makeId('evt'),
          household: activeHouseholdState
        }));
        await bulkCreateResources('events', records);
        showToast('Kalender importiert', `${records.length} Termine wurden übernommen.`, 'success');
      });
    };
    reader.readAsText(file);
  }, [activeHouseholdState, bulkCreateResources, showToast, withActionError]);

  const exportICS = useCallback(() => {
    exportEventsToICS(
      resources.events,
      familyAccount?.familyName || 'Unsere Familie'
    );
    showToast('Kalender exportiert', 'Die Kalenderdatei wurde erstellt.', 'info');
  }, [familyAccount?.familyName, resources.events, showToast]);

  const addShoppingItem = useCallback(item =>
    withActionError(async () => {
      if (integrations.bring?.connected) {
        const data = await apiRequest('/api/integrations/bring/items', {
          method: 'POST',
          body: JSON.stringify({
            name: item.name,
            specification: item.quantity || ''
          })
        });
        const records = applyShoppingRecords(data);
        showToast(
          'Bei Bring! eingetragen',
          `${item.name} steht jetzt auf der gemeinsamen Liste.`,
          'success'
        );
        return records.find(
          record =>
            record.name.toLocaleLowerCase('de-DE') ===
            item.name.toLocaleLowerCase('de-DE')
        );
      }

      const record = await createResource('shoppingItems', {
        id: makeId('shop'),
        category: 'Vorräte',
        icon: '🛒',
        quantity: '1 Stk',
        isSelected: true,
        inCart: false,
        household: activeHouseholdState,
        ...item
      });
      showToast(
        'Auf der Einkaufsliste',
        `${record.name} wurde hinzugefügt.`,
        'success'
      );
      return record;
    }, 'Artikel konnte nicht hinzugefügt werden'), [
      activeHouseholdState,
      applyShoppingRecords,
      createResource,
      integrations.bring?.connected,
      showToast,
      withActionError
    ]);

  const toggleShoppingSelected = useCallback(itemId => {
    const item = resources.shoppingItems.find(entry => entry.id === itemId);
    if (!item) return null;
    return withActionError(() =>
      patchResource('shoppingItems', itemId, {
        isSelected: !item.isSelected,
        inCart: false
      })
    );
  }, [patchResource, resources.shoppingItems, withActionError]);

  const toggleShoppingInCart = useCallback((itemId, event) => {
    event?.stopPropagation();
    const item = resources.shoppingItems.find(entry => entry.id === itemId);
    if (!item) return null;
    if (item.source === 'bring' && integrations.bring?.connected) {
      return withActionError(async () => {
        const data = await apiRequest('/api/integrations/bring/items/toggle', {
          method: 'POST',
          body: JSON.stringify({
            name: item.name,
            specification: item.quantity,
            inCart: !item.inCart
          })
        });
        const records = applyShoppingRecords(data);
        return records.find(
          record =>
            record.name.toLocaleLowerCase('de-DE') ===
            item.name.toLocaleLowerCase('de-DE')
        );
      }, 'Bring!-Artikel konnte nicht aktualisiert werden');
    }
    return withActionError(() =>
      patchResource('shoppingItems', itemId, { inCart: !item.inCart })
    );
  }, [
    applyShoppingRecords,
    integrations.bring?.connected,
    patchResource,
    resources.shoppingItems,
    withActionError
  ]);

  const setRawShoppingItems = useCallback(updater => {
    const current = resources.shoppingItems;
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (!Array.isArray(next)) return;
    setResources(previous => ({ ...previous, shoppingItems: next }));
    const changed = next.filter(item => {
      const before = current.find(existing => existing.id === item.id);
      return before && JSON.stringify(before) !== JSON.stringify(item);
    });
    Promise.all(
      changed.map(item => patchResource('shoppingItems', item.id, item))
    ).catch(error => {
      showToast('Einkaufsliste nicht gespeichert', error.message, 'error');
      refreshBootstrap({ silent: true });
    });
  }, [patchResource, refreshBootstrap, resources.shoppingItems, showToast]);

  const addMealIngredientsToShopping = useCallback(async ingredients => {
    const cleanIngredients = (ingredients || []).filter(Boolean);
    if (!cleanIngredients.length) return;

    if (integrations.bring?.connected) {
      await withActionError(async () => {
        const data = await apiRequest('/api/integrations/bring/items', {
          method: 'POST',
          body: JSON.stringify({
            items: cleanIngredients.map(name => ({
              name,
              specification: '1x'
            }))
          })
        });
        applyShoppingRecords(data);
        showToast(
          'Bei Bring! eingetragen',
          `${data.added} Zutaten wurden übertragen.`,
          'success'
        );
      }, 'Zutaten konnten nicht an Bring! übertragen werden');
      return;
    }

    const records = cleanIngredients.map(name => ({
      id: makeId('shop'),
      name,
      category: 'Vorräte',
      icon: '🥘',
      quantity: '1x',
      isSelected: true,
      inCart: false,
      household: activeHouseholdState
    }));
    if (!records.length) return;
    await withActionError(async () => {
      await bulkCreateResources('shoppingItems', records);
      showToast('Auf Einkaufsliste', `${records.length} Zutaten wurden ergänzt.`, 'success');
    });
  }, [
    activeHouseholdState,
    applyShoppingRecords,
    bulkCreateResources,
    integrations.bring?.connected,
    showToast,
    withActionError
  ]);

  const addRecipe = useCallback(recipe =>
    withActionError(async () => {
      const created = await createResource('savedRecipes', {
        id: makeId('recipe'),
        image:
          'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
        servings: '4 Portionen',
        household: activeHouseholdState,
        ...recipe
      });
      showToast('Rezept gespeichert', `"${created.name || created.title}" ist im Rezeptbuch.`, 'success');
      return created;
    }), [activeHouseholdState, createResource, showToast, withActionError]);

  const deleteRecipe = useCallback(recipeId =>
    withActionError(async () => {
      await removeResource('savedRecipes', recipeId);
      showToast('Rezept gelöscht', 'Das Rezept wurde entfernt.', 'info');
    }), [removeResource, showToast, withActionError]);

  const toggleTask = useCallback(taskId =>
    withActionError(async () => {
      const data = await apiRequest(`/api/tasks/${taskId}/toggle`, {
        method: 'POST'
      });
      updateResourceState('tasks', data.task);
      if (data.member) {
        setMembers(previous =>
          previous.map(member =>
            member.id === data.member.id ? data.member : member
          )
        );
      }
      versionRef.current = Number(data.version || versionRef.current);
      if (data.action === 'approval_requested') {
        showToast(
          'Zur Prüfung geschickt',
          `"${data.task.title}" wartet jetzt auf die Bestätigung von ${
            data.task.createdByName || 'einem Elternteil'
          }.`,
          'success'
        );
      } else if (data.action === 'approval_cancelled') {
        showToast(
          'Meldung zurückgenommen',
          `"${data.task.title}" ist wieder offen.`,
          'info'
        );
      } else if (data.task.completed) {
        showToast(
          'Sterne verdient!',
          `+${data.task.stars || 10} Sterne für "${data.task.title}".`,
          'star'
        );
      }
      return data.task;
    }), [showToast, updateResourceState, withActionError]);

  const reviewTask = useCallback((taskId, approved) =>
    withActionError(async () => {
      const data = await apiRequest(`/api/tasks/${taskId}/review`, {
        method: 'POST',
        body: JSON.stringify({ approved })
      });
      updateResourceState('tasks', data.task);
      if (data.member) {
        setMembers(previous =>
          previous.map(member =>
            member.id === data.member.id ? data.member : member
          )
        );
      }
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        approved ? 'Aufgabe bestätigt' : 'Noch einmal versuchen',
        approved
          ? `"${data.task.title}" ist freigegeben – die Sterne wurden gutgeschrieben.`
          : `"${data.task.title}" ist wieder als offen markiert.`,
        approved ? 'star' : 'info'
      );
      return data.task;
    }), [showToast, updateResourceState, withActionError]);

  const addTask = useCallback(task =>
    withActionError(async () => {
      const created = await createResource('tasks', {
        id: makeId('task'),
        completed: false,
        household: activeHouseholdState,
        stars: 10,
        ...task
      });
      showToast('Aufgabe erstellt', `"${created.title}" kann losgehen.`, 'success');
      return created;
    }), [activeHouseholdState, createResource, showToast, withActionError]);

  const addReward = useCallback(reward =>
    withActionError(async () => {
      const created = await createResource('rewards', {
        id: makeId('reward'),
        household: activeHouseholdState,
        forMemberId: 'all',
        ...reward
      });
      showToast('Belohnung angelegt', `"${created.title}" ist im Sterneshop.`, 'success');
      return created;
    }), [activeHouseholdState, createResource, showToast, withActionError]);

  const updateReward = useCallback((rewardId, changes) =>
    withActionError(async () => {
      const reward = await patchResource('rewards', rewardId, changes);
      showToast('Belohnung aktualisiert', 'Die Änderung ist gespeichert.', 'info');
      return reward;
    }), [patchResource, showToast, withActionError]);

  const deleteReward = useCallback(rewardId =>
    withActionError(async () => {
      await removeResource('rewards', rewardId);
      showToast('Belohnung gelöscht', 'Der Eintrag wurde entfernt.', 'info');
    }), [removeResource, showToast, withActionError]);

  const redeemReward = useCallback((reward, memberId) =>
    withActionError(async () => {
      const data = await apiRequest(`/api/rewards/${reward.id}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
      setMembers(previous =>
        previous.map(member =>
          member.id === data.member.id ? data.member : member
        )
      );
      versionRef.current = Number(data.version || versionRef.current);
      showToast('Belohnung eingelöst!', `"${reward.title}" ist verdient.`, 'star');
      return data;
    }, 'Einlösen nicht möglich'), [showToast, withActionError]);

  const updateMeal = useCallback((day, mealType, recipe, ingredients = []) =>
    withActionError(async () => {
      const existing = resources.meals.find(
        meal =>
          meal.day === day &&
          meal.meal === mealType &&
          (meal.household || 'familie') === activeHouseholdState
      );
      const meal = existing
        ? await patchResource('meals', existing.id, { recipe, ingredients })
        : await createResource('meals', {
            id: makeId('meal'),
            day,
            meal: mealType,
            recipe,
            ingredients,
            household: activeHouseholdState
          });
      showToast('Speiseplan aktualisiert', `${recipe} ist eingeplant.`, 'success');
      return meal;
    }), [
      activeHouseholdState,
      createResource,
      patchResource,
      resources.meals,
      showToast,
      withActionError
    ]);

  const deleteMeal = useCallback(mealId =>
    withActionError(async () => {
      await removeResource('meals', mealId);
      showToast(
        'Gericht entfernt',
        'Der Platz im Speiseplan ist wieder frei.',
        'info'
      );
      return true;
    }), [removeResource, showToast, withActionError]);

  const addNote = useCallback(note =>
    withActionError(async () => {
      const now = new Date().toLocaleString('de-DE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      const created = await createResource('notes', {
        id: makeId('note'),
        color: '#fef08a',
        createdBy: activeMember?.name || 'Familie',
        createdAt: now,
        updatedBy: activeMember?.name || 'Familie',
        updatedAt: now,
        household: activeHouseholdState,
        isShared: false,
        photo: null,
        ...note
      });
      showToast('Notiz angeheftet', `"${created.title}" ist auf der Pinnwand.`, 'success');
      return created;
    }), [
      activeHouseholdState,
      activeMember?.name,
      createResource,
      showToast,
      withActionError
    ]);

  const updateNote = useCallback((noteId, changes) =>
    withActionError(async () => {
      const note = await patchResource('notes', noteId, {
        ...changes,
        updatedBy: activeMember?.name || 'Familie',
        updatedAt: new Date().toLocaleString('de-DE')
      });
      showToast('Notiz aktualisiert', 'Die Änderung ist gespeichert.', 'info');
      return note;
    }), [activeMember?.name, patchResource, showToast, withActionError]);

  const deleteNote = useCallback(noteId =>
    withActionError(async () => {
      await removeResource('notes', noteId);
      showToast('Notiz entfernt', 'Die Notiz wurde von der Pinnwand genommen.', 'info');
    }), [removeResource, showToast, withActionError]);

  const addMember = useCallback(member =>
    withActionError(async () => {
      const data = await apiRequest('/api/members', {
        method: 'POST',
        body: JSON.stringify(member)
      });
      setMembers(previous => [...previous, data.member]);
      versionRef.current = Number(data.version || versionRef.current);
      showToast('Profil angelegt', `${data.member.name} gehört jetzt dazu.`, 'success');
      return data.member;
    }), [showToast, withActionError]);

  const updateMember = useCallback((memberId, changes) =>
    withActionError(async () => {
      const data = await apiRequest(`/api/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      setMembers(previous =>
        previous.map(member =>
          member.id === data.member.id ? data.member : member
        )
      );
      versionRef.current = Number(data.version || versionRef.current);
      return data.member;
    }), [withActionError]);

  const resetMemberStars = useCallback(memberId =>
    withActionError(async () => {
      const data = await apiRequest(
        `/api/admin/members/${memberId}/reset-stars`,
        { method: 'POST' }
      );
      setMembers(previous =>
        previous.map(member =>
          member.id === data.member.id ? data.member : member
        )
      );
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Punkte zurückgesetzt',
        `${data.member.name} startet wieder bei 0 Sternen.`,
        'info'
      );
      return data.member;
    }), [showToast, withActionError]);

  const clearTasks = useCallback(({
    memberId = '',
    completedOnly = false
  } = {}) =>
    withActionError(async () => {
      const data = await apiRequest('/api/admin/tasks', {
        method: 'DELETE',
        body: JSON.stringify({ memberId, completedOnly })
      });
      setResources(previous => ({ ...previous, tasks: data.records || [] }));
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        data.deleted ? 'Aufgabenliste bereinigt' : 'Nichts zu löschen',
        data.deleted
          ? `${data.deleted} Aufgabe${data.deleted === 1 ? '' : 'n'} wurde${data.deleted === 1 ? '' : 'n'} entfernt.`
          : 'Für diesen Filter gibt es keine passenden Aufgaben.',
        data.deleted ? 'success' : 'info'
      );
      return data;
    }), [showToast, withActionError]);

  const deleteMember = useCallback(memberId =>
    withActionError(async () => {
      const data = await apiRequest(`/api/members/${memberId}`, {
        method: 'DELETE'
      });
      setMembers(previous => previous.filter(member => member.id !== memberId));
      versionRef.current = Number(data.version || versionRef.current);
      showToast('Profil gelöscht', 'Das Familienprofil wurde entfernt.', 'info');
    }), [showToast, withActionError]);

  const updateFamilyAccount = useCallback(changes =>
    withActionError(async () => {
      const data = await apiRequest('/api/family', {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      setFamilyAccount(data.family);
      setFamiliesList(previous =>
        previous.map(family =>
          family.id === data.family.id ? data.family : family
        )
      );
      versionRef.current = Number(data.version || versionRef.current);
      showToast('Familie aktualisiert', 'Die Einstellungen sind gespeichert.', 'success');
      return data.family;
    }), [showToast, withActionError]);

  const deleteFamilyAccount = useCallback(password =>
    withActionError(async () => {
      await apiRequest('/api/family', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      });
      await logout();
      await refreshPublicFamilies();
      showToast('Familie gelöscht', 'Das Familienkonto wurde entfernt.', 'info');
      return true;
    }, 'Familie konnte nicht gelöscht werden'), [
      logout,
      refreshPublicFamilies,
      showToast,
      withActionError
    ]);

  const connectBringLogin = useCallback((email, password) =>
    apiRequest('/api/integrations/bring/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }), []);

  const fetchBringCatalog = useCallback(async ({ force = false } = {}) => {
    if (!force && bringCatalog.total > 0) return bringCatalog;
    return withActionError(async () => {
      const data = await apiRequest('/api/integrations/bring/catalog');
      setBringCatalog(data.catalog);
      return data.catalog;
    }, 'Bring!-Katalog konnte nicht geladen werden');
  }, [bringCatalog, withActionError]);

  const completeBringConnection = useCallback(async payload => {
    const data = await apiRequest('/api/integrations/bring/connect', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setIntegrations(previous => ({ ...previous, bring: data.integration }));
    applyShoppingRecords(data);
    return data;
  }, [applyShoppingRecords]);

  const fetchBringLiveItems = useCallback(() =>
    withActionError(async () => {
      const data = await apiRequest('/api/integrations/bring/sync', {
        method: 'POST'
      });
      applyShoppingRecords(data);
      showToast('Bring! synchronisiert', 'Die Einkaufsliste ist aktuell.', 'success');
      return data.records;
    }, 'Bring!-Sync fehlgeschlagen'), [
      applyShoppingRecords,
      showToast,
      withActionError
    ]);

  const disconnectBring = useCallback(() =>
    withActionError(async () => {
      const data = await apiRequest('/api/integrations/bring', {
        method: 'DELETE'
      });
      setIntegrations(previous => ({ ...previous, bring: data.integration }));
      versionRef.current = Number(data.version || versionRef.current);
      showToast('Bring! getrennt', 'Die Zugangsdaten wurden sicher entfernt.', 'info');
    }), [showToast, withActionError]);

  const setupGotify = useCallback(payload =>
    withActionError(async () => {
      const data = await apiRequest('/api/integrations/gotify/setup', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIntegrations(previous => ({
        ...previous,
        gotify: data.integration
      }));
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Gotify verbunden',
        'Die Testnachricht wurde erfolgreich gesendet.',
        'success'
      );
      return data.integration;
    }, 'Gotify konnte nicht verbunden werden'), [showToast, withActionError]);

  const updateGotifySettings = useCallback(changes =>
    withActionError(async () => {
      const data = await apiRequest('/api/integrations/gotify', {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      setIntegrations(previous => ({
        ...previous,
        gotify: data.integration
      }));
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Benachrichtigungen gespeichert',
        'Die neuen Gotify-Regeln sind aktiv.',
        'success'
      );
      return data.integration;
    }, 'Gotify-Einstellungen konnten nicht gespeichert werden'), [
      showToast,
      withActionError
    ]);

  const testGotify = useCallback(() =>
    withActionError(async () => {
      await apiRequest('/api/integrations/gotify/test', {
        method: 'POST'
      });
      showToast(
        'Testnachricht gesendet',
        'Prüfe jetzt deine Gotify-App.',
        'success'
      );
      return true;
    }, 'Gotify-Test fehlgeschlagen'), [showToast, withActionError]);

  const disconnectGotify = useCallback(() =>
    withActionError(async () => {
      const data = await apiRequest('/api/integrations/gotify', {
        method: 'DELETE'
      });
      setIntegrations(previous => ({
        ...previous,
        gotify: data.integration
      }));
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Gotify getrennt',
        'Der Familienplaner sendet keine Push-Nachrichten mehr.',
        'info'
      );
      return true;
    }), [showToast, withActionError]);

  const addChatMessage = useCallback(message =>
    withActionError(() => createResource('chatMessages', {
      id: makeId('message'),
      timestamp: Date.now(),
      ...message
    })), [createResource, withActionError]);

  const addMoodCheckin = useCallback(mood =>
    withActionError(async () => {
      const record = await createResource('moodCheckins', {
        id: makeId('mood'),
        memberId: activeMember?.id,
        mood,
        createdAt: Date.now()
      });
      showToast('Danke fürs Teilen', 'Deine Stimmung ist im Familienkompass.', 'success');
      return record;
    }), [activeMember?.id, createResource, showToast, withActionError]);

  const addTrashEvent = useCallback(record =>
    withActionError(() => createResource('trashEvents', {
      id: makeId('trash'),
      household: activeHouseholdState,
      ...record
    })), [activeHouseholdState, createResource, withActionError]);

  const addTrashEvents = useCallback(records =>
    withActionError(() => bulkCreateResources(
      'trashEvents',
      records.map(record => ({
        id: record.id || makeId('trash'),
        household: activeHouseholdState,
        ...record
      }))
    )), [activeHouseholdState, bulkCreateResources, withActionError]);

  const deleteTrashEvent = useCallback(id =>
    withActionError(() => removeResource('trashEvents', id)), [
      removeResource,
      withActionError
    ]);

  const addFamilyLink = useCallback(record =>
    withActionError(() => createResource('familyTree', {
      id: makeId('family-link'),
      ...record
    })), [createResource, withActionError]);

  const requestFamilyRelationship = useCallback((targetFamilyId, relationType) =>
    withActionError(async () => {
      const data = await apiRequest('/api/family/relationships', {
        method: 'POST',
        body: JSON.stringify({ targetFamilyId, relationType })
      });
      setFamilyRelationships(data.relationships || []);
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Anfrage gesendet',
        'Die andere Familie kann die Verbindung jetzt bestätigen.',
        'success'
      );
      return data.relationship;
    }, 'Familienanfrage fehlgeschlagen'), [showToast, withActionError]);

  const respondFamilyRelationship = useCallback((relationshipId, status) =>
    withActionError(async () => {
      const data = await apiRequest(
        `/api/family/relationships/${relationshipId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status })
        }
      );
      setFamilyRelationships(data.relationships || []);
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        status === 'accepted' ? 'Familien verbunden' : 'Anfrage abgelehnt',
        status === 'accepted'
          ? 'Die Verbindung ist jetzt im Stammbaum sichtbar.'
          : 'Die Anfrage wurde entfernt.',
        status === 'accepted' ? 'success' : 'info'
      );
      return data.relationship;
    }, 'Anfrage konnte nicht beantwortet werden'), [showToast, withActionError]);

  const removeFamilyRelationship = useCallback(relationshipId =>
    withActionError(async () => {
      const data = await apiRequest(
        `/api/family/relationships/${relationshipId}`,
        { method: 'DELETE' }
      );
      setFamilyRelationships(data.relationships || []);
      versionRef.current = Number(data.version || versionRef.current);
      showToast(
        'Verbindung entfernt',
        'Die Familienkonten sind nicht mehr miteinander verknüpft.',
        'info'
      );
      return true;
    }, 'Verbindung konnte nicht entfernt werden'), [showToast, withActionError]);

  const addDashboardLink = useCallback(link =>
    withActionError(async () => {
      const created = await createResource('dashboardLinks', {
        id: makeId('dashboard-link'),
        ...link
      });
      showToast(
        'Dashboard erweitert',
        `"${created.title}" ist jetzt beim Kinderprofil sichtbar.`,
        'success'
      );
      return created;
    }, 'YouTube-Link konnte nicht gespeichert werden'), [
      createResource,
      showToast,
      withActionError
    ]);

  const deleteDashboardLink = useCallback(linkId =>
    withActionError(async () => {
      await removeResource('dashboardLinks', linkId);
      showToast(
        'Dashboard-Link entfernt',
        'Die Kachel wurde vom Kinderprofil genommen.',
        'info'
      );
      return true;
    }), [removeResource, showToast, withActionError]);

  const bringCredentials = useMemo(() => ({
    mail: integrations.bring?.email || '',
    listUuid: integrations.bring?.listUuid || '',
    listName: integrations.bring?.listName || '',
    isConnected: Boolean(integrations.bring?.connected)
  }), [integrations.bring]);

  const currentFamily = familyAccount;
  const activeFamilyId = familyAccount?.id || '';
  const canEditFamily = useCallback(
    () => canManageFamily(activeMember),
    [activeMember]
  );

  const value = {
    authStatus,
    loginFamily,
    registerFamily,
    selectMemberProfile,
    logout,
    refreshPublicFamilies,
    refreshBootstrap,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    activeHousehold: activeHouseholdState,
    setActiveHousehold,
    familyAccount,
    familiesList,
    currentFamily,
    activeFamilyId,
    updateFamilyAccount,
    deleteFamily: deleteFamilyAccount,
    selectFamilyAccount: loginFamily,
    canEditFamily,
    resetAllData: logout,
    isPortalUnlocked: true,
    loginPortal: () => true,
    logoutPortal: logout,
    toast,
    setToast,
    showToast,
    members,
    addMember,
    updateMember,
    deleteMember,
    resetMemberStars,
    activeMemberId: activeMemberIdState,
    setActiveMemberId: selectMemberProfile,
    activeMember,
    bringCredentials,
    bringCatalog,
    connectBringLogin,
    completeBringConnection,
    disconnectBring,
    fetchBringCatalog,
    fetchBringLiveItems,
    gotifyIntegration: integrations.gotify,
    setupGotify,
    updateGotifySettings,
    testGotify,
    disconnectGotify,
    webPush,
    refreshWebPushStatus,
    enableWebPush,
    disableWebPush,
    updateWebPushPreferences,
    testWebPush,
    fetchPushDevices,
    removePushDevice,
    shoppingItems: resources.shoppingItems,
    toggleShoppingSelected,
    toggleShoppingInCart,
    addShoppingItem,
    addMealIngredientsToShopping,
    setRawShoppingItems,
    savedRecipes: resources.savedRecipes,
    addRecipe,
    deleteRecipe,
    events: resources.events,
    addEvent,
    deleteEvent,
    importICS,
    exportICS,
    meals: resources.meals,
    updateMeal,
    deleteMeal,
    tasks: resources.tasks,
    toggleTask,
    reviewTask,
    addTask,
    clearTasks,
    rewards: resources.rewards,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
    notes: resources.notes,
    addNote,
    updateNote,
    deleteNote,
    chatMessages: resources.chatMessages,
    addChatMessage,
    familyTree: resources.familyTree,
    addFamilyLink,
    familyRelationships,
    requestFamilyRelationship,
    respondFamilyRelationship,
    removeFamilyRelationship,
    dashboardLinks: resources.dashboardLinks,
    addDashboardLink,
    deleteDashboardLink,
    trashEvents: resources.trashEvents,
    addTrashEvent,
    addTrashEvents,
    deleteTrashEvent,
    moodCheckins: resources.moodCheckins,
    addMoodCheckin,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isQuickAddOpen,
    setIsQuickAddOpen,
    quickAddDefaultType,
    setQuickAddDefaultType,
    isBringModalOpen,
    setIsBringModalOpen
  };

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily muss innerhalb von FamilyProvider verwendet werden.');
  }
  return context;
}
