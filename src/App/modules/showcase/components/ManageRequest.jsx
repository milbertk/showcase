import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBan,
  FaCalendarCheck,
  FaCalendarDays,
  FaCheck,
  FaClock,
  FaLocationDot,
  FaMoneyBillWave,
  FaStore,
  FaWhatsapp,
} from "react-icons/fa6";

import SelfServiceService from "../services/SelfServiceService";
import BookingSlotsService from "../services/BookingSlotsService";
import { groupSlotsByLocation, safeMapsUrl, slotKey, slotsHaveLocations } from "../services/slotLocations";
import "./ManageRequest.scss";
import RequestSentDialog from "./RequestSentDialog";
import { PoweredBy, AlephKBar } from "../../../shared/Brand/BrandLogo";
import {
  DEFAULT_TIME_ZONE,
  browserTimeZone,
  formatOffset,
  isValidTimeZone,
  offsetMinutes,
  placeName,
  todayInZone,
  zonedDateTime,
} from "../../../shared/Utils/timeZones";

const selfServiceService = new SelfServiceService();
const bookingSlotsService = new BookingSlotsService();

// "Today" in the company time zone (2026-11-04); the server sends the zone
// in view.timeZone (default Costa Rica, GMT−6).
const companyZoneOf = (view) => (isValidTimeZone(view?.timeZone) ? view.timeZone : DEFAULT_TIME_ZONE);
const todayKey = (view) => todayInZone(companyZoneOf(view));

// Status codes from the backend -> tone of the badge.
const STATUS_TONE = {
  PENDING: "pending",
  SCHEDULED: "ok",
  APPROVED: "ok",
  DONE: "done",
  COMPLETED: "done",
  DELIVERED: "done",
  CANCELLED: "off",
  REJECTED: "off",
};

const CANCEL_REASON_MAX = 500;

// The email link "Need to cancel? Request it here" adds ?cancel=1.
const openCancelFromUrl = () => {
  try {
    return new URLSearchParams(window.location.search).get("cancel") === "1";
  } catch {
    return false;
  }
};

/**
 * Customer page opened from the email link /showcase/{companyId}/r/{token}.
 * Shows the appointment / order, lets the customer ask for another time
 * (appointments) and send a cancellation REQUEST: nothing is cancelled here,
 * the business receives an email and cancels it manually.
 * Everything is decided by the server.
 */
export default function ManageRequest({ t, locale = "en-US" }) {
  const { token = "", companySlug = "" } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  // Cancellation REQUEST (the business cancels manually).
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule picker.
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsNote, setSlotsNote] = useState("");
  const [chosenSlot, setChosenSlot] = useState(null);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);
  // "Sent — pending approval" pop-up (2026-11-08) after a new time or a
  // cancellation request: the company must confirm both.
  const [requestSent, setRequestSent] = useState(null);
  const closeRequestSent = useCallback(() => setRequestSent(null), []);

  const text = useCallback(
    (key, fallback, options = {}) => t(`manageRequest.${key}`, { defaultValue: fallback, ...options }),
    [t],
  );

  const errorText = useCallback(
    (error) => {
      switch (error?.code) {
        case "NOT_FOUND":
          return text("errors.notFound", "This link is not valid. Please check the email you received.");
        case "NOT_ALLOWED":
          return text("errors.notAllowed", "This action is not possible anymore.");
        case "SLOT_TAKEN":
          return text("errors.slotTaken", "This time was just taken. Please choose another time.");
        case "SAME_TIME":
          return text("errors.sameTime", "Choose a different time from the current one.");
        case "RATE_LIMIT":
          return text("errors.rateLimit", "Too many attempts. Please try again later.");
        case "ALREADY_REQUESTED":
          return text("errors.alreadyRequested", "You already sent a cancellation request. The business will contact you.");
        case "CANCEL_UNAVAILABLE":
          return text("errors.cancelUnavailable", "The request could not be sent right now. Please contact the business directly.");
        default:
          return text("errors.generic", "Something went wrong. Please try again.");
      }
    },
    [text],
  );

  // Load the request.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    selfServiceService
      .view({ token, signal: controller.signal })
      .then((result) => {
        setView(result);
        if (result?.canRequestCancel && openCancelFromUrl()) setShowCancelForm(true);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setLoadError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, errorText]);

  // Load free times for the new date.
  useEffect(() => {
    const serviceId = view?.appointment?.serviceId;
    if (!showReschedule || !newDate || !serviceId || !view?.companyId) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setSlotsLoading(true);
    setChosenSlot(null);
    bookingSlotsService
      .getDayAvailability({ companyId: view.companyId, productId: serviceId, date: newDate })
      .then((availability) => {
        if (!active) return;
        setSlots(availability?.slots || []);
        setSlotsNote(availability?.available ? "" : text("noTimes", "No times available for this date."));
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        setSlotsNote(text("errors.slots", "The available times could not be loaded."));
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showReschedule, newDate, view, text, slotsReloadKey]);

  const statusLabel = (status) =>
    text(`status.${String(status || "").toUpperCase()}`, String(status || "").replace(/_/g, " ").toLowerCase());

  const formatMoney = (amount) => {
    if (amount === null || amount === undefined) return "";
    const symbol = view?.currencySymbol || "$";
    const decimals = Number.isInteger(Number(amount)) ? 0 : 2;
    const value = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
    return Array.from(symbol).length > 1 ? `${symbol} ${value}` : `${symbol}${value}`;
  };

  const formatDate = (dateKey) => {
    if (!dateKey) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const timeText = (appointment) =>
    appointment?.allDay
      ? text("allDay", "All day")
      : [appointment?.startHour, appointment?.endHour].filter(Boolean).join(" – ");

  // Company time zone of the appointment (2026-11-04): "Costa Rica time,
  // GMT−6", plus the visitor's own time when the device is in another zone.
  const zoneText = (appointment) => {
    if (!appointment?.date) return "";
    const zone = companyZoneOf(view);
    const moment = zonedDateTime(appointment.date, appointment.startHour || "12:00", zone);
    if (!moment) return "";
    const name = String(view?.timeZoneLabel || "").trim() || placeName(zone, locale);
    return `${name}, ${formatOffset(offsetMinutes(zone, moment), { short: true })}`;
  };

  const visitorTimeText = (appointment) => {
    if (!appointment?.date || appointment.allDay || !appointment.startHour) return "";
    const zone = companyZoneOf(view);
    const mine = browserTimeZone();
    const moment = zonedDateTime(appointment.date, appointment.startHour, zone);
    if (!moment || !isValidTimeZone(mine) || offsetMinutes(mine, moment) === offsetMinutes(zone, moment)) return "";
    const sameDay = todayInZone(mine, moment) === appointment.date;
    try {
      return moment.toLocaleString(locale, {
        ...(sameDay ? {} : { weekday: "short", day: "numeric", month: "short" }),
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const whatsappUrl = useMemo(() => {
    const digits = String(view?.whatsapp || "").replace(/\D/g, "");
    if (digits.length < 8) return "";
    const message = text("whatsappMessage", "Hello, I have a question about {{reference}}.", {
      reference: view?.reference || "",
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }, [view, text]);

  const doRequestCancel = async (event) => {
    event?.preventDefault();
    setBusy(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await selfServiceService.requestCancel({ token, reason: cancelReason.trim() });
      setView(result);
      setShowCancelForm(false);
      setShowReschedule(false);
      setCancelReason("");
      setMessage({
        type: "success",
        text: text("cancelRequested", "Your cancellation request was sent. The business will confirm it by email."),
      });
      setRequestSent({ kind: "cancel", reference: result?.reference || view?.reference || "" });
    } catch (error) {
      setMessage({ type: "error", text: errorText(error) });
      if (error?.code === "ALREADY_REQUESTED") setShowCancelForm(false);
    } finally {
      setBusy(false);
    }
  };

  const formatDateTime = (isoValue) => {
    if (!isoValue) return "";
    const value = new Date(isoValue);
    if (Number.isNaN(value.getTime())) return "";
    return value.toLocaleString(locale, {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  // "Friday, November 20" for the pop-up (2026-11-08).
  const longDate = (dateKey) => {
    const [y, m, d] = String(dateKey || "").split("-").map(Number);
    if (!y || !m || !d) return String(dateKey || "");
    const value = new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  };

  const doReschedule = async () => {
    if (!chosenSlot || !newDate) return;
    setBusy(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await selfServiceService.reschedule({
        token,
        appointmentDate: newDate,
        startHour: chosenSlot.allDay ? "" : chosenSlot.startTime,
        endHour: chosenSlot.allDay ? "" : chosenSlot.endTime,
        // The location of the new time (2026-11-07); "" when it has none.
        locationId: chosenSlot.locationId || "",
      });
      setView(result);
      setShowReschedule(false);
      setChosenSlot(null);
      setMessage({
        type: "success",
        text: text("rescheduled", "Your new time was sent. The company will confirm it by email."),
      });
      setRequestSent({
        kind: "reschedule",
        reference: result?.reference || view?.reference || "",
        details: [
          `${longDate(newDate)} · ${chosenSlot.allDay
            ? text("allDay", "All day")
            : `${chosenSlot.startTime} - ${chosenSlot.endTime}`}`,
          [chosenSlot.locationName, chosenSlot.locationAddress].filter(Boolean).join(", "),
        ],
      });
    } catch (error) {
      setMessage({ type: "error", text: errorText(error) });
      if (error?.code === "SLOT_TAKEN") setSlotsReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const storeLink = `/showcase/${encodeURIComponent(view?.companyId || companySlug)}`;
  const kindTitle = {
    APPOINTMENT: text("titles.appointment", "Your appointment"),
    WEB_ORDER: text("titles.webOrder", "Your order request"),
    ORDER: text("titles.order", "Your order"),
  }[view?.kind] || "";

  return (
    <main className="manage-request">
      <AlephKBar />
      <div className="manage-request__card">
        <header className="manage-request__header">
          <span className="manage-request__logo"><FaStore /></span>
          <div>
            <small>{view?.companyName || text("company", "Store")}</small>
            <h1>{loading ? text("loading", "Loading...") : kindTitle || text("title", "Your request")}</h1>
          </div>
        </header>

        {loading && <p className="manage-request__muted" role="status">{text("loading", "Loading...")}</p>}

        {!loading && loadError && (
          <div className="manage-request__alert manage-request__alert--error" role="alert">{loadError}</div>
        )}

        {!loading && view && (
          <>
            <div className="manage-request__summary">
              <div>
                <small>{text("reference", "Reference")}</small>
                <strong>{view.reference}</strong>
              </div>
              <span className={`manage-request__status manage-request__status--${STATUS_TONE[view.status] || "info"}`}>
                {statusLabel(view.status)}
              </span>
            </div>

            {view.appointment && (
              <dl className="manage-request__details">
                {view.appointment.serviceName && (
                  <div><dt>{text("service", "Service")}</dt><dd>{view.appointment.serviceName}</dd></div>
                )}
                <div><dt><FaCalendarDays /> {text("date", "Date")}</dt><dd>{formatDate(view.appointment.date)}</dd></div>
                <div>
                  <dt><FaClock /> {text("time", "Time")}</dt>
                  <dd>
                    {timeText(view.appointment)}
                    {zoneText(view.appointment) && (
                      <small className="manage-request__zone">{zoneText(view.appointment)}</small>
                    )}
                    {visitorTimeText(view.appointment) && (
                      <small className="manage-request__zone">
                        {text("yourTime", "= {{time}} your time", { time: visitorTimeText(view.appointment) })}
                      </small>
                    )}
                  </dd>
                </div>
                {view.appointment.locationName && (
                  <div>
                    <dt><FaLocationDot /> {text("location", "Location")}</dt>
                    <dd>
                      {view.appointment.locationName}
                      {view.appointment.locationAddress && (
                        <small className="manage-request__zone">{view.appointment.locationAddress}</small>
                      )}
                      {safeMapsUrl(view.appointment.mapsUrl) && (
                        <a
                          className="manage-request__maps"
                          href={safeMapsUrl(view.appointment.mapsUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {text("openMaps", "Open in Maps")}
                        </a>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {view.items?.length > 0 && (
              <div className="manage-request__items">
                {view.items.map((item, index) => (
                  <div key={`${item.name}-${index}`}>
                    <span>{item.name || "-"} × {item.quantity}</span>
                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                ))}
                {view.total !== undefined && view.total !== null && (
                  <div className="manage-request__total">
                    <span>{text("total", "Total")}</span>
                    <strong>{formatMoney(view.total)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* How to pay a web order (Company page instructions). */}
            {view.kind === "WEB_ORDER" && !["REJECTED", "CANCELLED"].includes(view.status) && (
              <div className="manage-request__payment">
                <FaMoneyBillWave aria-hidden="true" />
                <div>
                  <strong>{t("companyShowcase.payment.title", { defaultValue: "How to pay" })}</strong>
                  {view.paymentInstructions && (
                    <p className="manage-request__payment-text">{view.paymentInstructions}</p>
                  )}
                  <p>{t("companyShowcase.payment.comingSoon", { defaultValue: "Online payments are coming soon. An agent will contact you with the payment instructions." })}</p>
                </div>
              </div>
            )}

            {view.status === "PENDING" && view.kind === "APPOINTMENT" && (
              <p className="manage-request__muted">{text("pendingNote", "The company still has to confirm this time. You will receive an email.")}</p>
            )}

            {message.text && (
              <div className={`manage-request__alert manage-request__alert--${message.type}`} role="status">
                {message.type === "success" && <FaCheck />} {message.text}
              </div>
            )}

            {view.canReschedule && (
              <div className="manage-request__actions">
                <button
                  type="button"
                  className="manage-request__button manage-request__button--primary"
                  onClick={() => {
                    setShowReschedule((v) => !v);
                    setShowCancelForm(false);
                    setNewDate("");
                    setMessage({ type: "", text: "" });
                  }}
                  disabled={busy}
                >
                  <FaCalendarCheck /> {text("actions.reschedule", "Request another time")}
                </button>
              </div>
            )}

            {showReschedule && view.appointment && (
              <section className="manage-request__reschedule">
                <h2>{text("pickNewTime", "Choose a new date and time")}</h2>
                <label>
                  <span>{text("date", "Date")}</span>
                  <input type="date" min={todayKey(view)} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </label>

                {newDate && (
                  <div className="manage-request__slots">
                    {slotsLoading ? (
                      <p className="manage-request__muted">{text("loadingTimes", "Loading times...")}</p>
                    ) : slots.length === 0 ? (
                      <p className="manage-request__muted">{slotsNote || text("noTimes", "No times available for this date.")}</p>
                    ) : (
                      // Grouped by location when the times have one (2026-11-07).
                      (slotsHaveLocations(slots) ? groupSlotsByLocation(slots) : [{ key: "all", slots }]).map((group) => (
                        <div className="manage-request__slot-group" key={group.key}>
                          {slotsHaveLocations(slots) && (
                            <p className="manage-request__slot-location">
                              <FaLocationDot aria-hidden="true" />{" "}
                              {group.locationId ? group.name : text("otherTimes", "Other times")}
                              {group.address && <small> · {group.address}</small>}
                            </p>
                          )}
                          {group.slots.map((slot) => {
                            const key = slotKey(slot);
                            const selected = chosenSlot && slotKey(chosenSlot) === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                className={selected ? "is-selected" : ""}
                                onClick={() => setChosenSlot(slot)}
                              >
                                {slot.allDay ? text("allDay", "All day") : `${slot.startTime} – ${slot.endTime}`}
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                    {!slotsLoading && slots.length > 0 && zoneText({ date: newDate, startHour: "12:00" }) && (
                      <p className="manage-request__muted manage-request__zone-line">
                        {text("timesShownIn", "Times shown in: {{zone}}.", { zone: zoneText({ date: newDate, startHour: "12:00" }) })}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="manage-request__button manage-request__button--primary"
                  onClick={doReschedule}
                  disabled={busy || !chosenSlot}
                >
                  {busy ? text("working", "Working...") : text("actions.sendNewTime", "Send new time")}
                </button>
              </section>
            )}

            {/* Cancellation request: a quiet link, then a short form. */}
            {view.cancelRequestedAt && (
              <p className="manage-request__cancel-note" role="status">
                <FaBan aria-hidden="true" />{" "}
                {text("cancelRequestedOn", "Cancellation requested on {{date}}. The business will confirm it by email.", {
                  date: formatDateTime(view.cancelRequestedAt),
                })}
              </p>
            )}

            {view.canRequestCancel && !showCancelForm && (
              <button
                type="button"
                className="manage-request__quiet-link"
                onClick={() => {
                  setShowCancelForm(true);
                  setShowReschedule(false);
                  setMessage({ type: "", text: "" });
                }}
                disabled={busy}
              >
                {text("actions.requestCancel", "Need to cancel? Request a cancellation")}
              </button>
            )}

            {view.canRequestCancel && showCancelForm && (
              <form className="manage-request__cancel-form" onSubmit={doRequestCancel}>
                <h2>{text("cancelForm.title", "Request a cancellation")}</h2>
                <p className="manage-request__muted">
                  {view.kind === "APPOINTMENT"
                    ? text("cancelForm.noteAppointment", "Your appointment is not cancelled yet. The business will review your request and confirm it by email.")
                    : text("cancelForm.noteOrder", "Your order is not cancelled yet. The business will review your request and confirm it by email.")}
                </p>
                <label>
                  <span>{text("cancelForm.reason", "Reason (optional)")}</span>
                  <textarea
                    rows={3}
                    maxLength={CANCEL_REASON_MAX}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={text("cancelForm.reasonPlaceholder", "For example: I can't make it that day.")}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className="manage-request__button"
                    onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                    disabled={busy}
                  >
                    {text("actions.keep", "No, keep it")}
                  </button>
                  <button type="submit" className="manage-request__button manage-request__button--danger-outline" disabled={busy}>
                    {busy ? text("working", "Working...") : text("actions.sendCancelRequest", "Send request")}
                  </button>
                </div>
              </form>
            )}

            {!view.canReschedule && view.kind === "APPOINTMENT" && ["PENDING", "SCHEDULED"].includes(view.status) && (
              <p className="manage-request__muted">
                {text("tooLate", "Changes are possible until {{hours}} hours before the appointment. Please contact the company.", {
                  hours: view.minNoticeHours || 2,
                })}
              </p>
            )}

            <div className="manage-request__footer">
              {whatsappUrl && (
                <a className="manage-request__button manage-request__button--whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
                  <FaWhatsapp /> {text("actions.whatsapp", "Talk to us on WhatsApp")}
                </a>
              )}
              <a className="manage-request__link" href={storeLink}>
                <FaArrowLeft /> {text("actions.backToStore", "Back to the store")}
              </a>
            </div>
          </>
        )}
      </div>
      <RequestSentDialog
        t={t}
        info={requestSent}
        companyName={view?.companyName || ""}
        contact={{
          whatsapp: view?.whatsapp,
          email: view?.contactEmail,
          socialLink: view?.socialLink,
          socialLinkType: view?.socialLinkType,
        }}
        onClose={closeRequestSent}
      />
      <PoweredBy label={t("brand.poweredBy", { defaultValue: "Powered by" })} />
    </main>
  );
}
