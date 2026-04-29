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

const FRESSNAPF_AT_CONFIG: MarketplaceOrdersConfig = {
  slug: "fressnapf-at",
  // Eigener LS-Cache-Key — sonst würden DE+AT in einem Bucket landen.
  lsKey: "fressnapf_at_orders_accumulated_v1",
  // Reuse des DE-Mirakl-Operator-Endpoints; Channel-Filter via apiQueryParams.
  apiPath: "/api/fressnapf/orders",
  apiQueryParams: { country: "at" },
  i18nNs: "fressnapfAtOrders",
  marketplaceLabel: "Fressnapf AT",
  pageTitleKey: "nav.fressnapfAtOrders",
  loadingMarketplaceKey: "nav.fressnapfAt",
  filterKey: "filters.fressnapfAtOrders",
  warnTag: "Fressnapf AT Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received", "complete"],
    pending: ["open", "pending"],
  },
  logo: {
    src: WIKIMEDIA_FRESSNAPF_LOGO_2023_SVG,
    altKey: "nav.fressnapfAt",
    frameClass: cn(DASHBOARD_MARKETPLACE_LOGO_FRAME, DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD),
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
    useNextImage: false,
  },
};

export default function FressnapfAtOrdersPage() {
  return <MarketplaceOrdersView config={FRESSNAPF_AT_CONFIG} />;
}
