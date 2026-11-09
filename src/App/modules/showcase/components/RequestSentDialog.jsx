import { useEffect, useRef } from "react";
import {
  FaCircleCheck,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaLink,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa6";

import "./RequestSentDialog.scss";

/**
 * "Request sent — pending approval" (2026-11-08).
 *
 * Shown after every store action that the company must approve or confirm:
 * booking request, order request, new time (reschedule) and cancellation
 * request. It stays open until the customer presses "Got it".
 *
 * Props:
 *   t            i18n function
 *   info         { kind: "booking" | "order" | "reschedule" | "cancel",
 *                  reference?, email?, details?: string[] }
 *   companyName  company name shown in the texts
 *   contact      { whatsapp?, email?, socialLink?, socialLinkType? }
 *   onClose      called by "Got it", the backdrop and Escape
 */
const KINDS = ["booking", "order", "reschedule", "cancel"];

const SOCIAL_ICONS = {
  FACEBOOK: FaFacebookF,
  INSTAGRAM: FaInstagram,
  TIKTOK: FaTiktok,
};

const SOCIAL_NAMES = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

const DEFAULT_TEXTS = {
  booking: {
    title: "Booking request sent — pending approval",
    lead: "Your booking request was sent to {{company}}. It is not confirmed yet: {{company}} must approve it.",
  },
  order: {
    title: "Order request sent — pending approval",
    lead: "Your order request was sent to {{company}}. It is not confirmed yet: {{company}} must approve it.",
  },
  reschedule: {
    title: "New time sent — pending approval",
    lead: "Your new time was sent to {{company}}. It is not confirmed yet: {{company}} must approve it.",
  },
  cancel: {
    title: "Cancellation request sent — pending confirmation",
    lead: "Your cancellation request was sent to {{company}}. It is not cancelled yet: {{company}} must confirm it.",
  },
};

const whatsappDigits = (value) => String(value || "").replace(/[^0-9]/g, "");

const safeLink = (value) => {
  const link = String(value || "").trim();
  return /^https?:\/\//i.test(link) ? link : "";
};

const formatWhatsapp = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = whatsappDigits(raw);
  return raw.startsWith("+") ? `+${digits}` : digits;
};

export default function RequestSentDialog({ t, info, companyName = "", contact = {}, onClose }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!info) return undefined;
    buttonRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [info, onClose]);

  if (!info) return null;

  const kind = KINDS.includes(info.kind) ? info.kind : "booking";
  const company = String(companyName || "").trim() ||
    t("requestSent.theCompany", { defaultValue: "the company" });
  const text = (key, fallback, options = {}) =>
    t(`requestSent.${key}`, { defaultValue: fallback, company, ...options });

  const email = String(info.email || "").trim();
  const digits = whatsappDigits(contact.whatsapp);
  const contactEmail = String(contact.email || "").trim();
  const socialLink = safeLink(contact.socialLink);
  const socialType = String(contact.socialLinkType || "").toUpperCase();
  const SocialIcon = SOCIAL_ICONS[socialType] || FaLink;
  const socialName = SOCIAL_NAMES[socialType] ||
    text("socialOther", "Social network");
  const hasContact = Boolean(digits || contactEmail || socialLink);
  const details = (info.details || []).filter(Boolean);

  return (
    <div className="request-sent-overlay" role="presentation">
      <button
        type="button"
        className="request-sent-overlay__backdrop"
        onClick={onClose}
        aria-label={text("close", "Got it")}
        tabIndex={-1}
      />
      <section
        className="request-sent"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="request-sent-title"
        aria-describedby="request-sent-lead"
      >
        <header className="request-sent__header">
          <FaCircleCheck aria-hidden="true" />
          <h2 id="request-sent-title">{text(`${kind}.title`, DEFAULT_TEXTS[kind].title)}</h2>
        </header>

        <p id="request-sent-lead" className="request-sent__lead">
          {text(`${kind}.lead`, DEFAULT_TEXTS[kind].lead)}
        </p>

        {(info.reference || details.length > 0) && (
          <div className="request-sent__summary">
            {info.reference && (
              <p>
                {text("reference", "Reference")}: <strong>{info.reference}</strong>
              </p>
            )}
            {details.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        <div className="request-sent__email">
          <FaEnvelope aria-hidden="true" />
          <p>
            <strong>
              {email
                ? text("checkEmail", "Check your email ({{email}}).", { email })
                : text("checkEmailNoAddress", "Check your email.")}
            </strong>{" "}
            {kind === "cancel"
              ? text(
                  "copySentCancel",
                  "We just sent you a copy, and you will get another email when {{company}} confirms the cancellation.",
                )
              : text(
                  "copySent",
                  "We just sent you a copy, and you will get another email when {{company}} approves or rejects it.",
                )}{" "}
            {text("spam", "Also look in Spam or Promotions.")}
          </p>
        </div>

        <div className="request-sent__contact">
          <p>
            <strong>{text("noEmail", "No email?")}</strong>{" "}
            {hasContact
              ? text("contactWith", "Contact {{company}}:")
              : text("contactPlain", "Please contact {{company}}.")}
          </p>
          {hasContact && (
            <div className="request-sent__links">
              {digits && (
                <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden="true" />
                  <span>WhatsApp {formatWhatsapp(contact.whatsapp)}</span>
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`}>
                  <FaEnvelope aria-hidden="true" />
                  <span>{contactEmail}</span>
                </a>
              )}
              {socialLink && (
                <a href={socialLink} target="_blank" rel="noopener noreferrer">
                  <SocialIcon aria-hidden="true" />
                  <span>{socialName}</span>
                </a>
              )}
            </div>
          )}
        </div>

        <footer className="request-sent__footer">
          <button type="button" ref={buttonRef} onClick={onClose}>
            {text("close", "Got it")}
          </button>
        </footer>
      </section>
    </div>
  );
}
