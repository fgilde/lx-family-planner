# Proxmox VE Helper-Scripts candidate

This is the LX Family candidate for the community-scripts ProxmoxVE workflow.
It deliberately uses a native Node.js service in an unprivileged Debian LXC,
because the upstream contribution standard does not accept Docker installers.

## Install from this repository

Until the upstream catalogue eligibility requirements are met, use the tested
standalone installer from a Proxmox VE host as `root`:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/scripts/proxmox-lxc.sh)"
```

It creates a new unprivileged Debian 13 LXC and installs Docker plus LX Family.
Use the advanced network settings when the Proxmox host does not provide DHCP.

## Files for ProxmoxVED

- `ct/lx-family.sh`
- `install/lx-family-install.sh`
- `json/lx-family.json`

The installer creates `/opt/lx-family/data` and `/opt/lx-family/backups` as
persistent paths. The included update action creates a helper-script backup,
deploys the newest stable GitHub release, restores data and configuration,
rebuilds the web assets and restarts the native service.

## Before a pull request

1. Copy these three files into a fork of `community-scripts/ProxmoxVED`.
2. Test a fresh default and advanced installation on Proxmox VE 8.4+.
3. Verify onboarding, restart, `update`, and a Proxmox backup/restore.
4. Submit the pull request to **ProxmoxVED**, never directly to ProxmoxVE.
