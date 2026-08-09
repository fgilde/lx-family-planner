# Reddit r/selfhosted — Show & Tell (SOFORT MÖGLICH)
# ===================================================
# Ziel: monatlicher "Self-Hosted Show & Tell"-Thread in r/selfhosted
# Keine 4-Monats-Regel. Sofort postbar, wenn der nächste Thread offen ist.
#
# So findest du den aktuellen Thread:
#   - Gehe zu https://www.reddit.com/r/selfhosted/
#   - Suche den gepinnten "Self-Hosted Show & Tell" / "Showoff Saturday"-Thread
#     (meist monatlich oder samstags gepinnt)
#   - Poste den folgenden Text als Kommentar (nicht als eigener Thread!)

---

**Title:** LX Family — a private self-hosted Family OS for calendars, tasks, meals, chat and kid profiles

**Body:**

Hi everyone 👋

I've been working on **LX Family** — a private self-hosted Family OS that bundles the stuff families actually need into one app, instead of spreading it across five. It runs on Docker / Unraid / Umbrel / Proxmox / plain Node.js, MIT-licensed.

**What it does:**

- 📅 Shared **calendars** with reminders
- ✅ **Tasks & chores** with approval workflow for kids
- 🛒 **Shopping lists** (incl. Bring! integration)
- 🍝 **Meal planning & recipes**
- 💬 **Family chat** with optional guest invites
- 📁 **Family files / media**
- 👶 **Child profiles** with playful missions & rewards
- 🐾 **Pet profiles** (care & health only)
- 🔔 Notifications via Gotify / ntfy
- 🌐 DE + EN interface, Android app available

**Why self-hosted:**
All data stays on your own server. Adults get a calm planning workspace, parents keep control over approvals/integrations, and there's role-based access so kids see what they should see.

**Integrations:** Nextcloud, Home Assistant, Bring!, Gotify, ntfy

**Links:**

- 🔗 GitHub: https://github.com/laxxx-lab/lx-family-planner
- 🌐 Live demo: https://familie.laxxx-lab.de/
- 🐳 Docker: `docker pull ghcr.io/laxxx-lab/lx-family-planner:latest`
- 📦 Also in: Unraid Community Applications, Umbrel App Store
- 📱 Android APK in the README

**Quick start (Docker):**

```yaml
services:
  lx-family-planner:
    image: ghcr.io/laxxx-lab/lx-family-planner:latest
    ports:
      - "3001:3001"
    environment:
      - APP_SECRET=<32+ random chars, keep stable across updates>
      - REGISTRATION_MODE=first-family
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    restart: unless-stopped
```

I'd love feedback — especially from anyone running a family setup on a homeserver. What's missing for your use case?

Thanks for checking it out! 🙌

---

# Hinweise für den Post
- Keine Crosspost-Spam: nur in r/selfhosted, nicht gleichzeitig in 5 Subs
- Falls es positives Feedback gibt, später in r/HomeAssistant / r/Nextcloud
  mit dem Fokus auf die jeweilige Integration posten
- Antworten auf Kommentare zeitnah — das pusht den Thread im Algorithmus
- Ggf. Screenshot-Album auf imgur ergänzen, Reddit liebt Bilder
