"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
} from "@/shared/lib/dashboardUi";

const EBAY_CONFIG: MarketplaceOrdersConfig = {
  slug: "ebay",
  lsKey: "ebay_orders_accumulated_v1",
  apiPath: "/api/ebay/orders",
  i18nNs: "ebayOrders",
  marketplaceLabel: "eBay",
  pageTitleKey: "nav.ebayOrders",
  loadingMarketplaceKey: "nav.ebay",
  filterKey: "filters.ebayOrders",
  warnTag: "eBay Bestellungen",
  statusKeywords: {
    cancelled: ["cancel", "refund"],
    completed: ["fulfilled", "paid", "complete", "closed"],
    pending: ["pending", "partial", "unpaid", "open"],
  },
  logo: {
    src: "/brand/marketplaces/ebay.svg",
    altKey: "nav.ebay",
    frameClass: DASHBOARD_MARKETPLACE_LOGO_FRAME,
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMAGE_FILL,
    useNextImage: true,
  },
};

export default function EbayOrdersPage() {
  return <MarketplaceOrdersView config={EBAY_CONFIG} />;
}
