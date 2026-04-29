"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
} from "@/shared/lib/dashboardUi";

const TIKTOK_CONFIG: MarketplaceOrdersConfig = {
  slug: "tiktok",
  lsKey: "tiktok_orders_accumulated_v1",
  apiPath: "/api/tiktok/orders",
  i18nNs: "tiktokOrders",
  marketplaceLabel: "TikTok",
  pageTitleKey: "nav.tiktokOrders",
  loadingMarketplaceKey: "nav.tiktok",
  filterKey: "filters.tiktokOrders",
  warnTag: "TikTok Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received", "complete"],
    pending: ["open", "pending"],
  },
  logo: {
    src: "/brand/marketplaces/tiktok.svg",
    altKey: "nav.tiktok",
    frameClass: DASHBOARD_MARKETPLACE_LOGO_FRAME,
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
    useNextImage: true,
  },
};

export default function TiktokOrdersPage() {
  return <MarketplaceOrdersView config={TIKTOK_CONFIG} />;
}
