"use client";

import {
  MarketplaceOrdersView,
  type MarketplaceOrdersConfig,
} from "@/shared/components/MarketplaceOrdersView";
import {
  DASHBOARD_MARKETPLACE_LOGO_FRAME,
  DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD,
  DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
  WIKIMEDIA_SHOPIFY_LOGO_2018_SVG,
} from "@/shared/lib/dashboardUi";
import { cn } from "@/lib/utils";

const SHOPIFY_CONFIG: MarketplaceOrdersConfig = {
  slug: "shopify",
  lsKey: "shopify_orders_accumulated_v1",
  apiPath: "/api/shopify/orders",
  i18nNs: "shopifyOrders",
  marketplaceLabel: "Shopify",
  pageTitleKey: "nav.shopifyOrders",
  loadingMarketplaceKey: "nav.shopify",
  filterKey: "filters.shopifyOrders",
  warnTag: "Shopify Bestellungen",
  statusKeywords: {
    cancelled: ["cancel", "refund"],
    completed: ["fulfilled", "paid", "complete", "closed"],
    pending: ["pending", "partial", "unpaid", "open"],
  },
  logo: {
    src: WIKIMEDIA_SHOPIFY_LOGO_2018_SVG,
    altKey: "nav.shopify",
    frameClass: cn(DASHBOARD_MARKETPLACE_LOGO_FRAME, DASHBOARD_MARKETPLACE_LOGO_FRAME_EXT_MD),
    imageClass: DASHBOARD_MARKETPLACE_LOGO_IMG_IN_FRAME,
    useNextImage: false,
  },
};

export default function ShopifyOrdersPage() {
  return <MarketplaceOrdersView config={SHOPIFY_CONFIG} />;
}
