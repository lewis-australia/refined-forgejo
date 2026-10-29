import { type ForgejoSite, getPermissionOrigins, parseSites } from "./helpers/site-domains.js";
import optionsStorage from "./options-storage.js";

const contentScriptId = "refined-forgejo-content-script";
const installOptionsShownKey = "refined-forgejo:install-options-opened";
let installOptionsPromise: Promise<void> | undefined;

// Options used to live in storage.sync, which uploads site URLs and tokens to the browser vendor's servers.
// Move them to local (keeping anything already there) and wipe the synced copy.
async function moveOptionsOffSync(): Promise<void> {
  const synced = await chrome.storage.sync.get();
  if (Object.keys(synced).length === 0) {
    return;
  }

  const local = await chrome.storage.local.get(Object.keys(synced));
  await chrome.storage.local.set({ ...synced, ...local });
  await chrome.storage.sync.clear();
}

// Registration reads options from local, so it must wait for the move. A failed move never clears sync.
const optionsMovedOffSync = moveOptionsOffSync().catch(() => {});

async function syncContentScripts(): Promise<void> {
  await optionsMovedOffSync;
  const { sites } = await optionsStorage.getAll();
  const grantedSites: ForgejoSite[] = [];

  for (const site of parseSites(sites)) {
    const origins = getPermissionOrigins([site]);
    if (origins.length === 0) {
      continue;
    }

    if (await chrome.permissions.contains({ origins })) {
      grantedSites.push(site);
    }
  }

  await chrome.scripting.unregisterContentScripts({ ids: [contentScriptId] }).catch(() => {});

  if (grantedSites.length > 0) {
    await chrome.scripting.registerContentScripts([{
      id: contentScriptId,
      matches: getPermissionOrigins(grantedSites),
      css: ["assets/refined-forgejo.css"],
      js: ["assets/content-script.js"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true,
    }]);
  }
}

async function openOptionsPageOnFirstRun(): Promise<void> {
  if (installOptionsPromise) {
    await installOptionsPromise;
    return;
  }

  installOptionsPromise = (async () => {
    const { [installOptionsShownKey]: installOptionsShown } = await chrome.storage.local.get(installOptionsShownKey);

    if (installOptionsShown === true) {
      return;
    }

    await chrome.runtime.openOptionsPage();
    await chrome.storage.local.set({ [installOptionsShownKey]: true });
  })();

  try {
    await installOptionsPromise;
  } finally {
    installOptionsPromise = undefined;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void openOptionsPageOnFirstRun();
  void syncContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void openOptionsPageOnFirstRun();
  void syncContentScripts();
});

chrome.permissions.onAdded.addListener(() => {
  void syncContentScripts();
});

chrome.permissions.onRemoved.addListener(() => {
  void syncContentScripts();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  // Cache writes land in storage.local too; only site changes affect registration
  if (areaName === "local" && "sites" in changes) {
    void syncContentScripts();
  }
});

void openOptionsPageOnFirstRun();
void syncContentScripts();

chrome.action.onClicked.addListener(async () => {
  await chrome.runtime.openOptionsPage();
});

console.log("Refined Forgejo background script loaded");
