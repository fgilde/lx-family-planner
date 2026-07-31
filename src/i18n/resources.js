// Übersetzungskataloge für alle Sprachen.
// Bewusst statische Importe statt import.meta.glob: So lässt sich diese Datei
// auch außerhalb von Vite laden (z. B. in Node-Tests, die Hooks importieren).
// Neuer Namespace? Hier für de UND en eintragen – scripts/check-i18n.js prüft,
// dass beide Sprachen dieselben Schlüssel enthalten.
import deAdmin from './locales/de/admin.json' with { type: 'json' };
import deAdminCloud from './locales/de/adminCloud.json' with { type: 'json' };
import deAuth from './locales/de/auth.json' with { type: 'json' };
import deBoard from './locales/de/board.json' with { type: 'json' };
import deCalendar from './locales/de/calendar.json' with { type: 'json' };
import deChat from './locales/de/chat.json' with { type: 'json' };
import deChrome from './locales/de/chrome.json' with { type: 'json' };
import deCommon from './locales/de/common.json' with { type: 'json' };
import deContext from './locales/de/context.json' with { type: 'json' };
import deDashboard from './locales/de/dashboard.json' with { type: 'json' };
import deFamilyLife from './locales/de/familyLife.json' with { type: 'json' };
import deFamilyMail from './locales/de/familyMail.json' with { type: 'json' };
import deFamilyTree from './locales/de/familyTree.json' with { type: 'json' };
import deMeals from './locales/de/meals.json' with { type: 'json' };
import deNotifications from './locales/de/notifications.json' with { type: 'json' };
import deProfile from './locales/de/profile.json' with { type: 'json' };
import deShared from './locales/de/shared.json' with { type: 'json' };
import deShopping from './locales/de/shopping.json' with { type: 'json' };
import deTasks from './locales/de/tasks.json' with { type: 'json' };
import deWidgets from './locales/de/widgets.json' with { type: 'json' };

import enAdmin from './locales/en/admin.json' with { type: 'json' };
import enAdminCloud from './locales/en/adminCloud.json' with { type: 'json' };
import enAuth from './locales/en/auth.json' with { type: 'json' };
import enBoard from './locales/en/board.json' with { type: 'json' };
import enCalendar from './locales/en/calendar.json' with { type: 'json' };
import enChat from './locales/en/chat.json' with { type: 'json' };
import enChrome from './locales/en/chrome.json' with { type: 'json' };
import enCommon from './locales/en/common.json' with { type: 'json' };
import enContext from './locales/en/context.json' with { type: 'json' };
import enDashboard from './locales/en/dashboard.json' with { type: 'json' };
import enFamilyLife from './locales/en/familyLife.json' with { type: 'json' };
import enFamilyMail from './locales/en/familyMail.json' with { type: 'json' };
import enFamilyTree from './locales/en/familyTree.json' with { type: 'json' };
import enMeals from './locales/en/meals.json' with { type: 'json' };
import enNotifications from './locales/en/notifications.json' with { type: 'json' };
import enProfile from './locales/en/profile.json' with { type: 'json' };
import enShared from './locales/en/shared.json' with { type: 'json' };
import enShopping from './locales/en/shopping.json' with { type: 'json' };
import enTasks from './locales/en/tasks.json' with { type: 'json' };
import enWidgets from './locales/en/widgets.json' with { type: 'json' };

export const resources = {
  de: {
    admin: deAdmin,
    adminCloud: deAdminCloud,
    auth: deAuth,
    board: deBoard,
    calendar: deCalendar,
    chat: deChat,
    chrome: deChrome,
    common: deCommon,
    context: deContext,
    dashboard: deDashboard,
    familyLife: deFamilyLife,
    familyMail: deFamilyMail,
    familyTree: deFamilyTree,
    meals: deMeals,
    notifications: deNotifications,
    profile: deProfile,
    shared: deShared,
    shopping: deShopping,
    tasks: deTasks,
    widgets: deWidgets
  },
  en: {
    admin: enAdmin,
    adminCloud: enAdminCloud,
    auth: enAuth,
    board: enBoard,
    calendar: enCalendar,
    chat: enChat,
    chrome: enChrome,
    common: enCommon,
    context: enContext,
    dashboard: enDashboard,
    familyLife: enFamilyLife,
    familyMail: enFamilyMail,
    familyTree: enFamilyTree,
    meals: enMeals,
    notifications: enNotifications,
    profile: enProfile,
    shared: enShared,
    shopping: enShopping,
    tasks: enTasks,
    widgets: enWidgets
  }
};

export default resources;
