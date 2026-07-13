/**
 * แปลงค่า (เช่น id) ให้เป็น URL path segment ที่ปลอดภัย ก่อน interpolate ลงใน endpoint
 *
 * ป้องกัน path-injection / traversal เมื่อค่ามาจาก input ที่ผู้ใช้ควบคุมได้:
 * - throw เมื่อค่าว่าง, มี delimiter ของ path/query/fragment (`/ ? # \`),
 *   มี `..` (encodeURIComponent ไม่ encode จุด จึงต้องบล็อกเอง),
 *   หรือมี encoded form ของอักขระเหล่านั้น (`%2f`, `%5c`, `%2e`)
 * - encodeURIComponent ค่าที่เหลือเพื่อ neutralize อักขระพิเศษอื่นๆ
 *
 * @param value - ค่าดิบที่จะใส่ลงใน path
 * @returns segment ที่ encode แล้ว
 * @throws {Error} เมื่อค่าไม่ปลอดภัยต่อการใช้เป็น path segment
 */
const toSafePathSegment = (value: string): string => {
  const normalized = value.trim();
  if (
    !normalized ||
    /[/?#\\]/.test(normalized) ||
    normalized.includes("..") ||
    /%2f|%5c|%2e/i.test(normalized)
  ) {
    throw new Error("Invalid path parameter");
  }
  return encodeURIComponent(normalized);
};

export const API_ENDPOINTS = {
  ACTIVITY_LOGS: (buCode: string) => `/api/proxy/api/${buCode}/activity-logs`,
  ADJUSTMENT_TYPES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/adjustment-types`,
  APPLICATION_ROLES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/application-roles`,
  APPROVAL_PENDING: "/api/proxy/api/my-approve",
  APPROVAL_PENDING_SUMMARY: "/api/proxy/api/my-approve/pending",
  APP_CONFIGS: (buCode: string) => `/api/proxy/api/config/${buCode}/app-config`,
  APP_CONFIG_BY_KEY: (buCode: string, key: string) =>
    `/api/proxy/api/config/${buCode}/app-config/${key}`,
  APP_CONFIG_SIGNATURE_CANDIDATES: (buCode: string, docType: string) =>
    `/api/proxy/api/config/${buCode}/app-config/signature-candidates/${docType}`,
  APP_CONFIG_TEST_EMAIL: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/app-config/test-email`,
  BUSINESS_UNIT: "/api/proxy/api/business-units",
  BUSINESS_UNIT_AVATAR: (id: string) =>
    `/api/proxy/api-system/business-units/${id}/avatar`,
  BUSINESS_UNIT_LOGO: (id: string) =>
    `/api/proxy/api-system/business-units/${id}/logo`,
  CN_REASONS: (buCode: string) =>
    `/api/proxy/api/${buCode}/credit-note-reasons`,
  CN_REASONS_CONFIG: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/credit-note-reasons`,
  CONFIG_LOCATION_USER: (buCode: string, userId: string) =>
    `/api/proxy/api/config/${buCode}/locations-users/${userId}`,
  CREDIT_NOTE: (buCode: string) => `/api/proxy/api/${buCode}/credit-notes`,
  CREDIT_NOTE_COMMENT: (buCode: string, cnId?: string) =>
    cnId
      ? `/api/proxy/api/${buCode}/credit-note-comments/${cnId}`
      : `/api/proxy/api/${buCode}/credit-note-comments`,
  CREDIT_NOTE_COMMENT_ATTACHMENT: (buCode: string, cnId: string) =>
    `/api/proxy/api/${buCode}/credit-note-comments/${cnId}/attachment`,
  CREDIT_TERMS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/credit-terms`,
  CUISINES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/recipe-cuisines`,
  CURRENCIES: (buCode: string) => `/api/proxy/api/config/${buCode}/currencies`,
  DASHBOARD_DATASETS: (buCode: string) =>
    `/api/proxy/api/${buCode}/datasets`,
  DASHBOARD_DATASET_BY_ID: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/datasets/${id}`,
  DASHBOARD_WIDGETS: (buCode: string, module: string) =>
    `/api/proxy/api/${buCode}/dashboard-widgets/${module}`,
  DELIVERY_POINTS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/delivery-points`,
  DEPARTMENTS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/departments`,
  DEPARTMENT_USER_BY_USER: (buCode: string, userId: string) =>
    `/api/proxy/api/config/${buCode}/department-users/user/${userId}`,
  DOCUMENTS: (buCode: string) => `/api/proxy/api/${buCode}/documents`,
  EQUIPMENT_CATEGORIES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/recipe-equipment-categories`,
  EXCHANGE_RATES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/exchange-rates`,
  EXTRA_COST_TYPES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/extra-cost-types`,
  GOODS_RECEIVE_NOTE: (buCode: string) =>
    `/api/proxy/api/${buCode}/good-received-notes`,
  GOODS_RECEIVE_NOTE_BY_VENDOR: (buCode: string, vendorId: string) =>
    `/api/proxy/api/${buCode}/good-received-notes/vendor/${vendorId}`,
  GOODS_RECEIVE_NOTE_BY_VENDOR_FOR_CN: (buCode: string, vendorId: string) =>
    `/api/proxy/api/${buCode}/good-received-notes/vendor/${vendorId}/cn`,
  GOODS_RECEIVE_NOTE_COMMENT: (buCode: string, grnId?: string) =>
    grnId
      ? `/api/proxy/api/${buCode}/good-received-note-comments/${grnId}`
      : `/api/proxy/api/${buCode}/good-received-note-comments`,
  GOODS_RECEIVE_NOTE_COMMENT_ATTACHMENT: (buCode: string, grnId: string) =>
    `/api/proxy/api/${buCode}/good-received-note-comments/${grnId}/attachment`,
  GOODS_RECEIVE_NOTE_LOCATIONS: (buCode: string, grnId: string) =>
    `/api/proxy/api/${buCode}/good-received-notes/${grnId}/location`,
  GOODS_RECEIVE_NOTE_LOCATION_PRODUCTS: (
    buCode: string,
    grnId: string,
    locationId: string,
  ) =>
    `/api/proxy/api/${buCode}/good-received-notes/${grnId}/location/${locationId}/product`,
  GOODS_RECEIVE_NOTE_PRODUCTS: (buCode: string, grnId: string) =>
    `/api/proxy/api/${buCode}/good-received-notes/${grnId}/product`,
  GOODS_RECEIVE_NOTE_PRODUCT_LOCATIONS: (
    buCode: string,
    grnId: string,
    productId: string,
  ) =>
    `/api/proxy/api/${buCode}/good-received-notes/${grnId}/product/${productId}/location`,
  INVENTORY_ADJUSTMENTS: (buCode: string) =>
    `/api/proxy/api/${buCode}/inventory-adjustments`,
  LOCATIONS: (buCode: string) => `/api/proxy/api/config/${buCode}/locations`,
  LOCATIONS_BY_PRODUCT: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/user-locations/product/${productId}`,
  LOCATIONS_WITH_ANY_MOVEMENT: (buCode: string) =>
    `/api/proxy/api/${buCode}/products/movement/locations`,
  LOCATIONS_WITH_MOVEMENT: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/products/${productId}/locations-with-movement`,
  LOCATION_PAIR_PRODUCTS: (
    buCode: string,
    locationId1: string,
    locationId2: string,
  ) =>
    `/api/proxy/api/config/${buCode}/location-products/products/${locationId1}/${locationId2}`,
  LOGIN: "/api/auth/login",
  LOGOUT: "/api/auth/logout",
  MY_DASHBOARD_WIDGETS: (buCode: string) =>
    `/api/proxy/api/me/dashboard-widgets?bu_code=${buCode}`,
  MY_DASHBOARD_WIDGET_BY_ID: (buCode: string, id: string) =>
    `/api/proxy/api/me/dashboard-widgets/${id}?bu_code=${buCode}`,
  MY_PENDING_PURCHASE_ORDERS: "/api/proxy/api/my-pending/purchase-orders",
  MY_PENDING_PURCHASE_ORDERS_COUNT:
    "/api/proxy/api/my-pending/purchase-orders/pending",
  MY_PENDING_PURCHASE_REQUESTS: "/api/proxy/api/my-pending/purchase-requests",
  MY_PENDING_PURCHASE_REQUESTS_COUNT:
    "/api/proxy/api/my-pending/purchase-requests/pending",
  MY_PENDING_STORE_REQUISITIONS: "/api/proxy/api/my-pending/store-requisitions",
  MY_PENDING_STORE_REQUISITIONS_COUNT:
    "/api/proxy/api/my-pending/store-requisitions/pending",
  NOTIFICATIONS: "/api/proxy/api/notifications",
  NOTIFICATIONS_MARK_ALL_READ: "/api/proxy/api/notifications/mark-all-read",
  NOTIFICATION_BY_ID: (id: string) =>
    `/api/proxy/api/notifications/${toSafePathSegment(id)}`,
  NOTIFICATION_MARK_READ: (id: string) =>
    `/api/proxy/api/notifications/${toSafePathSegment(id)}/read`,
  NOTIFICATION_TEMPLATES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/notification-templates`,
  PERIODS: (buCode: string) => `/api/proxy/api/${buCode}/periods`,
  PERIOD_ENDS: (buCode: string) => `/api/proxy/api/${buCode}/period-ends`,
  PERIOD_END_CURRENT: (buCode: string) =>
    `/api/proxy/api/${buCode}/period-ends/current`,
  PERIOD_END_REVIEW: (buCode: string) =>
    `/api/proxy/api/${buCode}/period-ends/review`,
  PERIOD_NEXT: (buCode: string) => `/api/proxy/api/${buCode}/periods/next`,
  PERMISSIONS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/permissions`,
  PHYSICAL_COUNT: (buCode: string) =>
    `/api/proxy/api/${buCode}/physical-counts`,
  PHYSICAL_COUNT_DETAILS: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-counts/${id}/details`,
  PHYSICAL_COUNT_DETAIL_COMMENT: (buCode: string, detailId: string) =>
    `/api/proxy/api/${buCode}/physical-count-detail-comments/${detailId}`,
  PHYSICAL_COUNT_PERIODS: (buCode: string) =>
    `/api/proxy/api/${buCode}/physical-count-periods`,
  PHYSICAL_COUNT_PERIOD_CURRENT: (buCode: string) =>
    `/api/proxy/api/${buCode}/physical-count-periods/current`,
  PHYSICAL_COUNT_PERIOD_DETAIL: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-count-periods/${id}`,
  PHYSICAL_COUNT_REFRESH: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-counts/${id}/refresh`,
  PHYSICAL_COUNT_REVIEW: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-counts/${id}/review`,
  PHYSICAL_COUNT_SAVE: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-counts/${id}/save`,
  PHYSICAL_COUNT_SUBMIT: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/physical-counts/${id}/submit`,
  PRICE_LISTS: (buCode: string) => `/api/proxy/api/config/${buCode}/pricelists`,
  PRICE_LIST_ACTIVE_BY_VENDOR: (
    buCode: string,
    vendorId: string,
    date: string,
  ) => `/api/proxy/api/${buCode}/pricelists/active/${vendorId}/${date}`,
  PRICE_LIST_ACTIVE_VENDORS: (buCode: string, date: string) =>
    `/api/proxy/api/${buCode}/pricelists/active-vendors/${date}`,
  PRICE_LIST_COMPARE: (buCode: string) =>
    `/api/proxy/api/${buCode}/pricelists/price-compare`,
  PRICE_LIST_EXTERNAL: (urlToken: string) =>
    `/api/external/api/pricelist-external/${toSafePathSegment(urlToken)}`,
  PRICE_LIST_EXTERNAL_CHECK: (urlToken: string) =>
    `/api/external/api/check-pricelist/${toSafePathSegment(urlToken)}`,
  PRICE_LIST_TEMPLATES: (buCode: string) =>
    `/api/proxy/api/${buCode}/pricelist-templates`,
  PRODUCTS: (buCode: string) => `/api/proxy/api/config/${buCode}/products`,
  PRODUCT_IMAGES: (buCode: string, productId: string) =>
    `/api/proxy/api/config/${buCode}/products/${productId}/images`,
  PRODUCT_IMAGE: (buCode: string, productId: string, imageId: string) =>
    `/api/proxy/api/config/${buCode}/products/${productId}/images/${imageId}`,
  PRODUCT_IMAGES_ORDER: (buCode: string, productId: string) =>
    `/api/proxy/api/config/${buCode}/products/${productId}/images/order`,
  PRODUCTS_BY_LOCATION: (buCode: string, locationId: string) =>
    `/api/proxy/api/${buCode}/products/locations/${locationId}`,
  PRODUCTS_WITH_MOVEMENT: (buCode: string) =>
    `/api/proxy/api/${buCode}/products/with-movement`,
  PRODUCTS_WITH_MOVEMENT_AT_LOCATION: (buCode: string, locationId: string) =>
    `/api/proxy/api/${buCode}/products/movement/locations/${locationId}/products`,
  PRODUCT_CATEGORIES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/product-categories`,
  PRODUCT_MASTER_ECO_LABELS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/product-master-eco-labels`,
  PRODUCT_ECO_LABELS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/product-eco-labels`,
  PRODUCT_ECO_LABELS_BY_PRODUCT: (buCode: string, productId: string) =>
    `/api/proxy/api/config/${buCode}/product-eco-labels/product/${productId}`,
  PRODUCT_COST_BY_LOCATION_QTY: (
    buCode: string,
    productId: string,
    locationId: string,
    qty: number | string,
  ) =>
    `/api/proxy/api/${buCode}/cost/product/${productId}/location/${locationId}/qty/${qty}`,
  PRODUCT_INVENTORY: (buCode: string, locationId: string, productId: string) =>
    `/api/proxy/api/${buCode}/user-locations/${locationId}/product/${productId}/inventory`,
  PRODUCT_INVENTORY_MOVEMENT: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/products/${productId}/inventory-movement`,
  PRODUCT_ITEM_GROUPS: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/product-item-groups`,
  PRODUCT_LAST_RECEIVING: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/cost/product/${productId}/last-receiving`,
  PRODUCT_LAST_RECEIVING_BY_UNIT: (
    buCode: string,
    productId: string,
    unitId: string,
  ) =>
    `/api/proxy/api/${buCode}/cost/products/${productId}/last-receiving/unit/${unitId}`,
  PRODUCT_ON_HAND: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/products/${productId}/on-hand`,
  PRODUCT_ON_ORDER: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/products/${productId}/on-order`,
  PRODUCT_SUB_CATEGORIES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/product-sub-categories`,
  PRODUCT_UNITS_AVAILABLE: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/units/available/product/${productId}`,
  PRODUCT_UNITS_FOR_ORDER: (buCode: string, productId: string) =>
    `/api/proxy/api/${buCode}/units/order/product/${productId}`,
  PROFILE: "/api/proxy/api/user/profile",
  PROFILE_AVATAR: "/api/proxy/api/user/profile/avatar",
  PROFILE_SIGNATURE: "/api/proxy/api/user/profile/signature",
  PROFILE_CHANGE_PASSWORD: "/api/proxy/api/auth/change-password",
  PROFILE_UPDATE: "/api/proxy/api/user/profile",
  PURCHASE_ORDER: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-orders`,
  PURCHASE_ORDER_COMMENT: (buCode: string, poId?: string) =>
    poId
      ? `/api/proxy/api/${buCode}/purchase-order-comments/${poId}`
      : `/api/proxy/api/${buCode}/purchase-order-comments`,
  PURCHASE_ORDER_COMMENT_ATTACHMENT: (buCode: string, poId: string) =>
    `/api/proxy/api/${buCode}/purchase-order-comments/${poId}/attachment`,
  PURCHASE_ORDER_CONFIRM_PR: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/confirm-pr`,
  PURCHASE_ORDER_GRN: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/grn`,
  PURCHASE_ORDER_GRN_VENDOR: (buCode: string, vendorId: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/grn/vendor/${vendorId}`,
  PURCHASE_ORDER_GRN_VENDORS: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/grn/vendor`,
  PURCHASE_ORDER_GROUP_PR: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/group-pr`,
  PURCHASE_REQUEST: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-requests`,
  PURCHASE_REQUESTS: "/api/proxy/api/purchase-requests",
  PURCHASE_REQUEST_COMMENT: (buCode: string, prId?: string) =>
    prId
      ? `/api/proxy/api/${buCode}/purchase-request-comments/${prId}`
      : `/api/proxy/api/${buCode}/purchase-request-comments`,
  PURCHASE_REQUEST_COMMENT_ATTACHMENT: (buCode: string, prId: string) =>
    `/api/proxy/api/${buCode}/purchase-request-comments/${prId}/attachment`,
  PURCHASE_REQUEST_FOR_PO: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-requests/for-po`,
  PURCHASE_REQUEST_PREVIOUS_STAGES: (buCode: string, prId: string) =>
    `/api/proxy/api/${buCode}/purchase-requests/${prId}/previous-stages`,
  PURCHASE_REQUEST_SWIPE_APPROVE: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-requests/swipe-approve`,
  PURCHASE_REQUEST_SWIPE_REJECT: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-requests/swipe-reject`,
  PURCHASE_REQUEST_TEMPLATES: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-request-templates`,
  PURCHASE_REQUEST_WORKFLOW_STAGES: (buCode: string) =>
    `/api/proxy/api/${buCode}/purchase-requests/workflow-stages`,
  RECIPES: (buCode: string) => `/api/proxy/api/config/${buCode}/recipes`,
  RECIPE_CATEGORIES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/recipe-categories`,
  RECIPE_EQUIPMENT: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/recipe-equipment`,
  RECIPE_EQUIPMENT_CATEGORIES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/recipe-equipment-categories`,
  REPORTS: (buCode: string) => `/api/proxy/api/${buCode}/reports`,
  REPORT_HISTORY: (buCode: string) =>
    `/api/proxy/api/${buCode}/reports/history`,
  REPORT_TEMPLATES: (buCode: string) =>
    `/api/proxy/api/${buCode}/reports/templates`,
  REPORT_LOOKUPS: (buCode: string) =>
    `/api/proxy/api/${buCode}/reports/lookups`,
  REPORT_VIEWER: (buCode: string) => `/api/proxy/api/${buCode}/reports/viewer`,
  REPORT_SCHEDULES: (buCode: string) =>
    `/api/proxy/api/${buCode}/reports/schedules`,
  REPORT_SCHEDULE_BY_ID: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/reports/schedules/${id}`,
  REQUEST_PRICE_LISTS: (buCode: string) =>
    `/api/proxy/api/${buCode}/request-for-pricings`,
  RUNNING_CODES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/running-codes`,
  RUNNING_CODES_INIT: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/running-codes/init`,
  SPOT_CHECK: (buCode: string) => `/api/proxy/api/${buCode}/spot-checks`,
  // Spot check comment (header level) — id = spot_check_id (GET/POST list) หรือ comment id (PATCH/DELETE)
  SPOT_CHECK_COMMENT: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-check-comments/${id}`,
  SPOT_CHECK_COMMENT_ATTACHMENT: (buCode: string, commentId: string) =>
    `/api/proxy/api/${buCode}/spot-check-comments/${commentId}/attachment`,
  SPOT_CHECK_COMMENT_ATTACHMENT_FILE: (
    buCode: string,
    commentId: string,
    fileToken: string,
  ) =>
    `/api/proxy/api/${buCode}/spot-check-comments/${commentId}/attachment/${fileToken}`,
  SPOT_CHECK_CURRENT: (buCode: string) =>
    `/api/proxy/api/${buCode}/spot-checks/current`,
  // Spot check detail comment (per-item) — id = detail id (GET/POST list) หรือ comment id (PATCH/DELETE)
  SPOT_CHECK_DETAIL_COMMENT: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-check-detail-comments/${id}`,
  SPOT_CHECK_DETAIL_COMMENT_ATTACHMENT: (buCode: string, commentId: string) =>
    `/api/proxy/api/${buCode}/spot-check-detail-comments/${commentId}/attachment`,
  SPOT_CHECK_DETAIL_COMMENT_ATTACHMENT_FILE: (
    buCode: string,
    commentId: string,
    fileToken: string,
  ) =>
    `/api/proxy/api/${buCode}/spot-check-detail-comments/${commentId}/attachment/${fileToken}`,
  SPOT_CHECK_RESET: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-checks/${id}/reset`,
  SPOT_CHECK_REVIEW: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-checks/${id}/review`,
  SPOT_CHECK_SAVE: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-checks/${id}/save`,
  SPOT_CHECK_SUBMIT: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/spot-checks/${id}/submit`,
  STOCK_IN: (buCode: string) => `/api/proxy/api/${buCode}/stock-ins`,
  STOCK_OUT: (buCode: string) => `/api/proxy/api/${buCode}/stock-outs`,
  STORE_REQUISITION: (buCode: string) =>
    `/api/proxy/api/${buCode}/store-requisitions`,
  STORE_REQUISITION_PREVIOUS_STAGES: (buCode: string, srId: string) =>
    `/api/proxy/api/${buCode}/store-requisitions/${srId}/previous-stages`,
  STORE_REQUISITIONS: "/api/proxy/api/store-requisitions",
  STORE_REQUISITION_COMMENT: (buCode: string, srId?: string) =>
    srId
      ? `/api/proxy/api/${buCode}/store-requisition-comments/${srId}`
      : `/api/proxy/api/${buCode}/store-requisition-comments`,
  STORE_REQUISITION_COMMENT_ATTACHMENT: (buCode: string, srId: string) =>
    `/api/proxy/api/${buCode}/store-requisition-comments/${srId}/attachment`,
  SWITCH_BU: "/api/proxy/api/business-units/default",
  TAX_PROFILES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/tax-profiles`,
  TRANSACTIONS: (buCode: string) =>
    `/api/proxy/api/${buCode}/inventory-transactions`,
  UNITS: (buCode: string) => `/api/proxy/api/config/${buCode}/units`,
  USERS: (buCode: string) => `/api/proxy/api/${buCode}/users`,
  USER_APPLICATION_ROLES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/user-application-roles`,
  USER_LOCATIONS: (buCode: string) => `/api/proxy/api/${buCode}/user-locations`,
  VENDORS: (buCode: string) => `/api/proxy/api/config/${buCode}/vendors`,
  VENDOR_BUSINESS_TYPES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/vendor-business-types`,
  VENDOR_MASTER_CERTIFICATES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/vendor-master-certificates`,
  VENDOR_CERTIFICATES: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/vendor-certificates`,
  VENDOR_CERTIFICATES_BY_VENDOR: (buCode: string, vendorId: string) =>
    `/api/proxy/api/config/${buCode}/vendor-certificates/vendor/${vendorId}`,
  WORKFLOWS: (buCode: string) => `/api/proxy/api/config/${buCode}/workflows`,
  WORKFLOW_BY_TYPE: (buCode: string, type: string) =>
    `/api/proxy/api/${buCode}/workflows/type/${type}`,
} as const;
