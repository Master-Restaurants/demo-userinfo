"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
} from "@/shared/lib/dashboardUi";

const KAUFLAND_CONFIG: MarketplaceOrdersConfig = {
  slug: "kaufland",
  lsKey: "kaufland_orders_accumulated_v1",
  apiPath: "/api/kaufland/orders",
  i18nNs: "kauflandOrders",
  marketplaceLabel: "Kaufland",
  pageTitleKey: "nav.kauflandOrders",
  loadingMarketplaceKey: "nav.kaufland",
  filterKey: "filters.kauflandOrders",
  warnTag: "Kaufland Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received"],
    pending: ["need_to_be_sent", "open", "pending"],
  },
  logo: {
    src: "/brand/marketplaces/kaufland.svg",
    altKey: "nav.kaufland",
    frameClass: DASHBOARD_MARKETPLACE_LOGO_FRAME,
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
    useNextImage: true,
  },
};

export default function KauflandOrdersPage() {
  return <MarketplaceOrdersView config={KAUFLAND_CONFIG} />;
}
