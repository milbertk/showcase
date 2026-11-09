import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBagShopping,
  FaCalendarCheck,
  FaCircleExclamation,
  FaMoneyBillWave,
  FaXmark,
} from "react-icons/fa6";

import MyRequestsService from "../services/MyRequestsService";
import "./MyRequests.scss";

const myRequestsService = new MyRequestsService();

// Status groups for the summary cards and filters.
const PENDING = new Set(["PENDING"]);
const ACTIVE = new Set(["APPROVED", "SCHEDULED", "PLACED", "IN_PROGRESS", "PARTIAL_DONE", "READY", "ON_HOLD", "SHIPPED"]);
const CLOSED = new Set(["DONE", "COMPLETED", "DELIVERED", "REJECTED", "CANCELLED"]);

const groupOf = (status) => {
  const value = String(status || "").toUpperCase();
  if (PENDING.has(value)) return "pending";
  if (ACTIVE.has(value)) return "active";
  if (CLOSED.has(value)) return "closed";
  return "active";
};

/**
 * "My orders and bookings" of the signed-in customer in this store, shown
 * like a small report: totals by status, filters and the list. Each item
 * opens the private "manage my request" page.
 */
export default function MyRequests({ t, locale, companyKey, formatPrice, onClose }) {
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    myRequestsService
      .getMyRequests({ companyKey, signal: controller.signal })
      .then((result) => setData(result))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.status === 401 || err?.status === 403
          ? t("myRequests.signInAgain")
          : t("myRequests.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [companyKey, t]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const orders = useMemo(() => data?.orders || [], [data]);
  const bookings = useMemo(() => data?.bookings || [], [data]);
  const rows = tab === "orders" ? orders : bookings;

  const counts = useMemo(() => {
    const result = { all: rows.length, pending: 0, active: 0, closed: 0 };
    rows.forEach((row) => { result[groupOf(row.status)] += 1; });
    return result;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((row) => groupOf(row.status) === filter);

  const statusLabel = (status) =>
    t(`manageRequest.status.${String(status || "").toUpperCase()}`, { defaultValue: status });

  const formatDate = (value, withTime = false) => {
    if (!value) return "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  const manageUrl = (token) =>
    token ? `/showcase/${encodeURIComponent(companyKey)}/r/${encodeURIComponent(token)}` : "";

  const currency = data?.currencySymbol || "$";
  const openOrders = orders.some((order) => groupOf(order.status) !== "closed");

  return (
    <div className="showcase-overlay showcase-overlay--center" role="dialog" aria-modal="true" aria-labelledby="my-requests-title">
      <button type="button" className="showcase-overlay__backdrop" onClick={onClose} aria-label={t("companyShowcase.actions.close")} />
      <section className="my-requests">
        <header className="my-requests__header">
          <div>
            <h2 id="my-requests-title">{t("myRequests.title")}</h2>
            {data?.email && <p>{data.email}</p>}
          </div>
          <button type="button" className="my-requests__close" onClick={onClose} aria-label={t("companyShowcase.actions.close")}>
            <FaXmark />
          </button>
        </header>

        <div className="my-requests__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "is-active" : ""}
            onClick={() => { setTab("orders"); setFilter("all"); }}>
            <FaBagShopping /> {t("myRequests.orders")} <span>{orders.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === "bookings"} className={tab === "bookings" ? "is-active" : ""}
            onClick={() => { setTab("bookings"); setFilter("all"); }}>
            <FaCalendarCheck /> {t("myRequests.bookings")} <span>{bookings.length}</span>
          </button>
        </div>

        <div className="my-requests__body">
          {loading && <p className="my-requests__state" role="status">{t("myRequests.loading")}</p>}
          {!loading && error && (
            <p className="my-requests__state my-requests__state--error" role="alert"><FaCircleExclamation /> {error}</p>
          )}

          {!loading && !error && (
            <>
              {data && !data.emailVerified && (
                <p className="my-requests__note">{t("myRequests.notVerified")}</p>
              )}

              {/* Summary like a report: totals by status (also filters). */}
              <div className="my-requests__summary">
                {["all", "pending", "active", "closed"].map((key) => (
                  <button type="button" key={key} className={`my-requests__stat my-requests__stat--${key}${filter === key ? " is-active" : ""}`}
                    onClick={() => setFilter(key)} aria-pressed={filter === key}>
                    <strong>{counts[key]}</strong>
                    <span>{t(`myRequests.groups.${key}`)}</span>
                  </button>
                ))}
              </div>

              {tab === "orders" && openOrders && (
                <div className="my-requests__payment">
                  <FaMoneyBillWave />
                  <div>
                    <strong>{t("companyShowcase.payment.title")}</strong>
                    {data?.paymentInstructions && <p className="my-requests__payment-text">{data.paymentInstructions}</p>}
                    <p>{t("companyShowcase.payment.comingSoon")}</p>
                  </div>
                </div>
              )}

              {visible.length === 0 ? (
                <p className="my-requests__state">
                  {rows.length === 0
                    ? t(tab === "orders" ? "myRequests.emptyOrders" : "myRequests.emptyBookings")
                    : t("myRequests.emptyFilter")}
                </p>
              ) : (
                <ul className="my-requests__list">
                  {tab === "orders" && visible.map((order) => (
                    <li key={`${order.reference}-${order.createdAt}`} className="my-requests__item">
                      <div className="my-requests__item-main">
                        <div className="my-requests__item-top">
                          <strong>{order.reference}</strong>
                          <span className={`my-requests__status my-requests__status--${groupOf(order.status)}`}>{statusLabel(order.status)}</span>
                        </div>
                        <small>{formatDate(order.createdAt, true)}</small>
                        {order.itemsSummary && <p>{order.itemsSummary}</p>}
                      </div>
                      <div className="my-requests__item-side">
                        <strong>{formatPrice(order.total, currency)}</strong>
                        {manageUrl(order.token) && (
                          <a href={manageUrl(order.token)}>{t("myRequests.view")} <FaArrowRight /></a>
                        )}
                      </div>
                    </li>
                  ))}

                  {tab === "bookings" && visible.map((booking) => (
                    <li key={`${booking.date}-${booking.startHour}-${booking.serviceName}`} className="my-requests__item">
                      <div className="my-requests__item-main">
                        <div className="my-requests__item-top">
                          <strong>{booking.serviceName || t("myRequests.booking")}</strong>
                          <span className={`my-requests__status my-requests__status--${groupOf(booking.status)}`}>{statusLabel(booking.status)}</span>
                        </div>
                        <small>
                          {formatDate(booking.date)} · {booking.allDay ? t("manageRequest.allDay") : `${booking.startHour} – ${booking.endHour}`}
                          {booking.location ? ` · ${booking.location}` : ""}
                        </small>
                      </div>
                      <div className="my-requests__item-side">
                        {manageUrl(booking.token) && (
                          <a href={manageUrl(booking.token)}>{t("myRequests.view")} <FaArrowRight /></a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
