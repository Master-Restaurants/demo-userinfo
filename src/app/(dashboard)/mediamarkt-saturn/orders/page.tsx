"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD,
  DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
  WIKIMEDIA_MEDIAMARKT_SATURN_LOGO_SVG,
} from "@/shared/lib/dashboardUi";
import { cn } from "@/lib/utils";

const MMS_CONFIG: MarketplaceOrdersConfig = {
  slug: "mediamarkt-saturn",
  lsKey: "mediamarkt_saturn_orders_accumulated_v1",
  apiPath: "/api/mediamarkt-saturn/orders",
  i18nNs: "mmsOrders",
  marketplaceLabel: "MediaMarkt Saturn",
  pageTitleKey: "nav.mmsOrders",
  loadingMarketplaceKey: "nav.mms",
  filterKey: "filters.mmsOrders",
  warnTag: "MMS Bestellungen",
  statusKeywords: {
    cancelled: ["cancel"],
    completed: ["sent", "return", "received", "complete"],
    pending: ["open", "pending"],
  },
  logo: {
    src: WIKIMEDIA_MEDIAMARKT_SATURN_LOGO_SVG,
    altKey: "nav.mms",
    frameClass: cn(DASHBOARD_MARKETPLACE_LOGO_FRAME, DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD),
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
    useNextImage: false,
  },
};

export default function MmsOrdersPage() {
  return <MarketplaceOrdersView config={MMS_CONFIG} />;
}
