// Free times grouped by location ("Sedes", 2026-11-07). Each slot from the
// server can carry its location: locationId, locationName, locationAddress,
// locationDetails, mapsUrl. Slots without a location form their own group.

/** Unique key of a slot: the same hour in two locations are two slots. */
export function slotKey(slot) {
  if (!slot) return "";
  return `${slot.locationId || ""}|${slot.startTime || ""}-${slot.endTime || ""}`;
}

/** True when at least one slot has a location. */
export function slotsHaveLocations(slots) {
  return (Array.isArray(slots) ? slots : []).some((slot) => Boolean(slot?.locationId));
}

/**
 * True when the customer can choose the location of some times (2026-11-08):
 * the server repeats those times in every active location
 * (customerChoosesLocation = true) and the places are shared among them.
 */
export function slotsLetCustomerChoose(slots) {
  return (Array.isArray(slots) ? slots : []).some(
    (slot) => Boolean(slot?.customerChoosesLocation) && Boolean(slot?.locationId),
  );
}

/**
 * Groups the slots by location, keeping the order in which the locations
 * first appear; the group without location (if any) goes last.
 * @returns {{ key, locationId, name, address, details, mapsUrl, slots }[]}
 */
export function groupSlotsByLocation(slots) {
  const groups = new Map();
  (Array.isArray(slots) ? slots : []).forEach((slot) => {
    const id = String(slot?.locationId || "");
    if (!groups.has(id)) {
      groups.set(id, {
        key: id || "none",
        locationId: id,
        name: slot?.locationName || "",
        address: slot?.locationAddress || "",
        details: slot?.locationDetails || "",
        mapsUrl: slot?.mapsUrl || "",
        slots: [],
      });
    }
    groups.get(id).slots.push(slot);
  });
  const list = Array.from(groups.values());
  return [...list.filter((g) => g.locationId), ...list.filter((g) => !g.locationId)];
}

/** Only https Google Maps links are opened from the store. */
export function safeMapsUrl(value) {
  const text = String(value || "").trim();
  return /^https:\/\/www\.google\.com\/maps\//.test(text) ? text : "";
}
