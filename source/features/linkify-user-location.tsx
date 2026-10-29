import React from "dom-chef";

import features from "../feature-manager.js";
import { getUser } from "../forgejo-helpers/index.js";
import { isUserProfile } from "../helpers/page-detect.js";
import observe from "../helpers/selector-observer.js";

function linkifyProfileLocation(item: Element): void {
  const locationText = item.querySelector<HTMLElement>("span.tw-flex-1");
  if (!locationText || locationText.querySelector("a.rgf-user-location-link")) {
    return;
  }

  const location = locationText.textContent?.trim();
  const mapLink = item.querySelector<HTMLAnchorElement>("a[href]");
  if (!location || !mapLink) {
    return;
  }

  locationText.replaceChildren(
    <a className="rgf-user-location-link" href={mapLink.href} rel="nofollow noreferrer" target="_blank">
      {location}
    </a>,
  );
}

function init(signal: AbortSignal): void {
  if (!getUser()) {
    return;
  }

  observe("#profile-avatar-card li:has(svg.octicon-location)", linkifyProfileLocation, { signal });
}

features.add(import.meta.url, {
  include: [isUserProfile],
  init,
});
