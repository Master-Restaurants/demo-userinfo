"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD,
  DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
  WIKIMEDIA_FRESSNAPF_LOGO_2023_SVG,
} from "@/shared/lib/dashboardUi";
import { cn } from "@/lib/utils";

const FRESSNAPF_CONFIG: MarketplaceOrdersConfig = {
  slug: "fressnapf",
  lsKey: "fressnapf_orders_accumulated_v1",
  apiPath: "/api/fressnapf/orders",
  i18nNs: "fressnapfOrders",
  marketplaceLabel: "Fressnapf",
  pageTitleKey: "nav.fressnapfOrders",
  loadingMarketplaceKey: "nav.fressnapf",
  filterKey: "filters.fressnapfOrders",
  warnTag: "Fressnapf Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received", "complete"],
    pending: ["open", "pending"],
  },
  logo: {
    src: WIKIMEDIA_FRESSNAPF_LOGO_2023_SVG,
    altKey: "nav.fressnapf",
    frameClass: cn(DASHBOARD_MARKETPLACE_LOGO_FRAME, DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD),
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
    useNextImage: false,
  },
};

export default function FressnapfOrdersPage() {
  return <MarketplaceOrdersView config={FRESSNAPF_CONFIG} />;
}
