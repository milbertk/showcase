// =====================================================================
//  Showcase mapper — convert a backend public-showcase item into the shape
//  the CompanyShowcase component already expects.
//
//  Backend item (PublicShowcaseItem):
//    { productInternalId, productCode, categoryId, name, description,
//      productType, hasPrice, basePrice, webBehavior, imageUrl, kind }
//
//  Component product shape:
//    { id, companyId, code, name, category, description, price, currencySymbol, image,
//      allowsOnlineOrder, allowsBooking }
//
//  Behavior mapping (from "kind", decided by shao — 2026-10-31):
//    - kind === "BOOKING"  -> allowsBooking = true   ("This is an appointment")
//    - kind === "PRODUCT"  -> allowsOnlineOrder = true ("Available for web sales")
//    - kind === "SERVICE"  -> only "Contact us" (company WhatsApp / social link)
// =====================================================================

const PLACEHOLDER_IMAGE = "";

export function showcaseItemToProduct(item, companyId) {
  const kind = String(item.kind || "").toUpperCase();
  const webBehavior = String(item.webBehavior || "").toUpperCase();

  const allowsBooking = kind === "BOOKING" || webBehavior === "BOOKING";
  // A plain product allows online order; a service (non-booking) is contact-only.
  const allowsOnlineOrder = kind === "PRODUCT";

  const basePrice =
    item.basePrice === null || item.basePrice === undefined
      ? null
      : Number(item.basePrice);

  return {
    id: String(item.productInternalId || item.product_internal_id || ""),
    companyId: String(companyId || ""),
    code: String(item.productCode || item.product_code || ""),
    name: String(item.name || ""),
    category: String(item.categoryId || item.category_id || ""),
    // Real category name for the store chips ("" when none; never the id).
    categoryName: String(item.categoryName || item.category_name || "").trim(),
    description: String(item.description || ""),
    price: item.hasPrice ? basePrice : null,
    // Store currency (one per company, set in Company page; "$" when none).
    currencySymbol: String(item.currencySymbol || item.currency_symbol || "").trim() || "$",
    image: String(item.imageUrl || item.image_url || PLACEHOLDER_IMAGE),
    allowsOnlineOrder,
    allowsBooking,
    // Old per-product contact (kept for reference; "Contact us" now uses the
    // company WhatsApp and social link from the page configuration).
    webContactPhone: String(item.webContactPhone || item.web_contact_phone || ""),
    webMessengerLink: String(item.webMessengerLink || item.web_messenger_link || ""),
    // Keep the raw kind/behavior in case the UI wants them.
    kind,
    webBehavior,
  };
}

export function mapShowcaseItems(items, companyId) {
  return (Array.isArray(items) ? items : [])
    .map((item) => showcaseItemToProduct(item, companyId))
    .filter((product) => product.id);
}