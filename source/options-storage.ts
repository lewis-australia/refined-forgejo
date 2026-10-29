import mem from "memoize";
import { getTokenForUrl, type SiteEntry } from "./helpers/site-domains.js";

export type RGFOptions = {
  actionUrl: string;
  customCss: string;
  sites: SiteEntry[];
  logging: boolean;
  domains?: string;
  [x: string]: unknown;
};

const defaultSites: SiteEntry[] = [
  { url: "codeberg.org", token: "", enabled: false },
  { url: "git.disroot.org", token: "", enabled: false },
  { url: "forge.fedoraproject.org", token: "", enabled: false },
];

const defaults: RGFOptions = {
  actionUrl: location.origin,
  customCss: "",
  sites: defaultSites.map(site => ({ ...site })),
  logging: false,
};

function normalizeSites(value: unknown): SiteEntry[] {
  if (Array.isArray(value)) {
    return value.map(site => ({
      url: String((site as Partial<SiteEntry>)?.url ?? "").trim(),
      token: String((site as Partial<SiteEntry>)?.token ?? ""),
      enabled: (site as Partial<SiteEntry>)?.enabled === true,
    }));
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map(url => ({ url: url.trim(), token: "", enabled: false }))
      .filter(site => site.url.length > 0);
  }

  return [];
}

export function isFeatureDisabled(options: RGFOptions, id: string): boolean {
  return options[`feature:${id}`] === false;
}

const optionsStorage = {
  async getAll(): Promise<RGFOptions> {
    const stored = Object.fromEntries(
      Object.entries(await chrome.storage.local.get()).filter(([key]) => !key.startsWith("cache:")),
    ) as Partial<RGFOptions> & Record<string, unknown>;
    const sites = "sites" in stored
      ? normalizeSites(stored.sites)
      : "domains" in stored
      ? normalizeSites(stored.domains)
      : defaultSites.map(site => ({ ...site }));

    return {
      ...defaults,
      ...stored,
      sites,
      domains: sites.map(site => site.url).join("\n"),
    };
  },
};

async function getTokenImpl(): Promise<string> {
  const result = await optionsStorage.getAll();
  return getTokenForUrl(result.sites, new URL(location.href)) ?? "";
}

export const getToken = mem(getTokenImpl);

export default optionsStorage;
