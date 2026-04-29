"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
} from "@/shared/lib/dashboardUi";

const OTTO_CONFIG: MarketplaceOrdersConfig = {
  slug: "otto",
  lsKey: "otto_orders_accumulated_v1",
  apiPath: "/api/otto/orders",
  i18nNs: "ottoOrders",
  marketplaceLabel: "Otto",
  pageTitleKey: "nav.ottoOrders",
  loadingMarketplaceKey: "nav.otto",
  filterKey: "filters.ottoOrders",
  warnTag: "Otto Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["ship", "deliver", "complete"],
    pending: ["pend", "open", "process"],
  },
  logo: {
    src: "/brand/marketplaces/otto.svg",
    altKey: "nav.otto",
    frameClass: DASHBOARD_MARKETPLACE_LOGO_FRAME,
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
    useNextImage: true,
  },
};

export default function OttoOrdersPage() {
  return <MarketplaceOrdersView config={OTTO_CONFIG} />;
}
