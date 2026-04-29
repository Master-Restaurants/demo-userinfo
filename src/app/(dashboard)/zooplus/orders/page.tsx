"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_LG,
  DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
  WIKIMEDIA_ZOOPLUS_LOGO_PNG,
} from "@/shared/lib/dashboardUi";
import { cn } from "@/lib/utils";

const ZOOPLUS_CONFIG: MarketplaceOrdersConfig = {
  slug: "zooplus",
  lsKey: "zooplus_orders_accumulated_v1",
  apiPath: "/api/zooplus/orders",
  i18nNs: "zooplusOrders",
  marketplaceLabel: "ZooPlus",
  pageTitleKey: "nav.zooplusOrders",
  loadingMarketplaceKey: "nav.zooplus",
  filterKey: "filters.zooplusOrders",
  warnTag: "Zooplus Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received", "complete"],
    pending: ["open", "pending"],
  },
  logo: {
    src: WIKIMEDIA_ZOOPLUS_LOGO_PNG,
    altKey: "nav.zooplus",
    frameClass: cn(DASHBOARD_MARKETPLACE_LOGO_FRAME, DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_LG),
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
    useNextImage: false,
  },
};

export default function ZooplusOrdersPage() {
  return <MarketplaceOrdersView config={ZOOPLUS_CONFIG} />;
}
