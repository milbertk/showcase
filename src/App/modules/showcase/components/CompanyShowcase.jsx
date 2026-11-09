import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
// Install once in the frontend project: npm install leaflet@1.9.4
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HiShoppingCart } from "react-icons/hi";
import {
  FaGoogle,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaCalendarCheck,
  FaCartPlus,
  FaCartShopping,
  FaCheck,
  FaChevronDown,
  FaCircleUser,
  FaClock,
  FaApple,
  FaEnvelope,
  FaFacebookF,
  FaFacebookMessenger,
  FaLink,
  FaInstagram,
  FaTiktok,
  FaListCheck,
  FaLocationDot,
  FaMoneyBillWave,
  FaImage,
  FaMagnifyingGlass,
  FaMicrosoft,
  FaMinus,
  FaMoon,
  FaPhone,
  FaPlus,
  FaRightToBracket,
  FaStore,
  FaSun,
  FaTrash,
  FaUser,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import "./CompanyShowcase.scss";
import { useParams } from "react-router-dom";
import ShowcaseService from "../services/ShowcaseService";
import useTheme from "../../../shared/Hooks/useTheme";
import { mapShowcaseItems, showcaseItemToProduct } from "../services/showcaseMappers";
import ShowcaseAssistant from "./ShowcaseAssistant";
import MyRequests from "./MyRequests";
import RequestSentDialog from "./RequestSentDialog";
import {
  groupSlotsByLocation,
  safeMapsUrl,
  slotKey,
  slotsHaveLocations,
  slotsLetCustomerChoose,
} from "../services/slotLocations";
import BookingSlotsService from "../services/BookingSlotsService";
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
import AppointmentRequestService from "../services/AppointmentRequestService";
import WebOrderRequestService from "../services/WebOrderRequestService";
import useCaptcha, { CaptchaWidget, isCaptchaError } from "../../../shared/Hooks/useCaptcha";
import ShowcaseLoginService from "../services/ShowcaseLoginService";
import { PoweredBy, AlephKBar } from "../../../shared/Brand/BrandLogo";
import {
  AUTH_STATES,
  authProviderState,
  authSoonLabel,
  authSoonMessage,
} from "../../../shared/Utils/authProviders";
import {
  firebaseEmailLogin,
  firebasePasswordReset,
  firebaseEmailRegister,
  firebaseSocialLogin,
  firebaseSignOut,
} from "../services/showcaseFirebaseAuth";

const bookingSlotsService = new BookingSlotsService();
const appointmentRequestService = new AppointmentRequestService();
const webOrderRequestService = new WebOrderRequestService();
const showcaseLoginService = new ShowcaseLoginService();

const showcaseService = new ShowcaseService();

const DEFAULT_CURRENCY_SYMBOL = "$";
const SHOWCASE_HERO_IMAGE = "/assets/showcase-hero.png";
const SHOWCASE_LOGO_PLACEHOLDER = "/assets/showcase-logo-placeholder.svg";

export const COMPANY_SHOWCASE_ROUTE = "/:companySlug";

const PRODUCTS_PER_PAGE = 10;

const EMPTY_GUEST_FORM = {
  name: "",
  phone: "",
  email: "",
  // Delivery vs pickup. true (default) = deliver to address; false = pickup.
  needsDelivery: true,
  address: "",
  // Optional browser coordinates. Kept in this form only until API support is added.
  location: null,
  preferredContact: "whatsapp",
  // The value for the chosen preferred contact (phone / link / email),
  // used as the reference to reach the guest back.
  contactValue: "",
  notes: "",
};

const EMPTY_BOOKING_FORM = {
  name: "",
  phone: "",
  email: "",
  // Preferred way to be contacted + the value for that method (link/profile).
  preferredContact: "whatsapp",
  contactValue: "",
  preferredDate: "",
  preferredTime: "",
  notes: "",
};

const resolveCompanySlugFromPath = () => {
  if (typeof window === "undefined") return "";

  // URL shape: /showcase/{companyId}. Take the segment AFTER "showcase".
  const parts = window.location.pathname.split("/").filter(Boolean);
  const showcaseIndex = parts.indexOf("showcase");
  if (showcaseIndex >= 0 && parts[showcaseIndex + 1]) {
    return decodeURIComponent(parts[showcaseIndex + 1]);
  }
  // Fallback: if there is any last segment, use it; otherwise empty.
  return parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : "";
};

const buildReference = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

const GUEST_LOCATION_TEXT = {
  en: {
    label: "Location (optional)",
    help: "Choose and confirm your delivery point on the map.",
    openMap: "Choose location on map",
    editMap: "Edit location on map",
    mapTitle: "Confirm your location",
    mapHelp: "Drag the pin or tap the map to change the location. You can also move the map and use its center.",
    mapLabel: "Location map. Use arrow keys to move and plus or minus to zoom.",
    mapLoading: "Loading map…",
    mapError: "The map could not be loaded. Check your connection and try again.",
    mapRetry: "Retry map",
    closeMap: "Close map",
    confirm: "Confirm location",
    useCenter: "Use map center",
    choosePoint: "Tap the map to place a pin before confirming.",
    marker: "Selected location. Drag to change it.",
    manual: "Selected on the map",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    use: "Use my current location",
    loading: "Getting your location…",
    selected: "Location selected",
    latitude: "Latitude",
    longitude: "Longitude",
    accuracy: "Estimated accuracy",
    cancel: "Cancel",
    remove: "Remove location",
    denied: "Location permission was denied. You can select a point on the map instead.",
    unavailable: "Your location could not be determined. Try again or select a point on the map.",
    timeout: "Finding your location took too long. Try again or select a point on the map.",
    unsupported: "This browser cannot get your current location. You can select a point on the map.",
    insecure: "Automatic location requires HTTPS or localhost. You can still select a point on the map.",
  },
  es: {
    label: "Ubicación (opcional)",
    help: "Elige y confirma tu punto de entrega en el mapa.",
    openMap: "Elegir ubicación en el mapa",
    editMap: "Editar ubicación en el mapa",
    mapTitle: "Confirma tu ubicación",
    mapHelp: "Arrastra el marcador o toca el mapa para cambiar la ubicación. También puedes mover el mapa y usar su centro.",
    mapLabel: "Mapa de ubicación. Usa las flechas para moverlo y los signos más o menos para acercar o alejar.",
    mapLoading: "Cargando mapa…",
    mapError: "No se pudo cargar el mapa. Revisa tu conexión e inténtalo de nuevo.",
    mapRetry: "Reintentar mapa",
    closeMap: "Cerrar mapa",
    confirm: "Confirmar ubicación",
    useCenter: "Usar el centro del mapa",
    choosePoint: "Toca el mapa para colocar un marcador antes de confirmar.",
    marker: "Ubicación seleccionada. Arrastra para cambiarla.",
    manual: "Seleccionada en el mapa",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    use: "Usar mi ubicación actual",
    loading: "Obteniendo tu ubicación…",
    selected: "Ubicación seleccionada",
    latitude: "Latitud",
    longitude: "Longitud",
    accuracy: "Precisión estimada",
    cancel: "Cancelar",
    remove: "Quitar ubicación",
    denied: "Se denegó el permiso de ubicación. Puedes seleccionar un punto en el mapa.",
    unavailable: "No se pudo determinar tu ubicación. Inténtalo de nuevo o selecciona un punto en el mapa.",
    timeout: "Se agotó el tiempo para obtener tu ubicación. Inténtalo de nuevo o selecciona un punto en el mapa.",
    unsupported: "Este navegador no puede obtener tu ubicación actual. Puedes seleccionar un punto en el mapa.",
    insecure: "La ubicación automática requiere HTTPS o localhost. Puedes seleccionar un punto en el mapa.",
  },
};

// A starting view only, never a selected delivery point. Change for other markets.
const LOCATION_MAP_START = [9.9325, -84.0796];
// For production volume, configure your tile provider here and keep its attribution.
const LOCATION_MAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const LOCATION_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

function LocationCoordinates({ location, text }) {
  return (
    <>
      <dl>
        <div><dt>{text("latitude")}</dt><dd>{location.latitude.toFixed(6)}</dd></div>
        <div><dt>{text("longitude")}</dt><dd>{location.longitude.toFixed(6)}</dd></div>
      </dl>
      {Number.isFinite(location.accuracy)
        ? <small>{text("accuracy")}: {Math.round(location.accuracy)} m</small>
        : <small>{text("manual")}</small>}
    </>
  );
}

function GuestLocationMapDialog({ initialValue, onConfirm, onCancel, text }) {
  const [initialLocation] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const titleId = useId();
  const helpId = useId();
  const dialogRef = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tilesRef = useRef(null);
  const requestId = useRef(0);

  const stopLocating = useCallback(() => {
    requestId.current += 1;
    setIsLoading(false);
    setErrorKey("");
  }, []);

  const choosePoint = useCallback((latlng) => {
    // Manual changes take priority over a late browser-location response.
    stopLocating();
    const point = L.latLng(latlng).wrap();
    setDraft({
      latitude: point.lat,
      longitude: point.lng,
      accuracy: null,
      source: "map",
      capturedAt: new Date().toISOString(),
    });
  }, [stopLocating]);

  const requestLocation = useCallback(() => {
    const currentRequest = ++requestId.current;
    setIsLoading(false);
    setErrorKey("");

    if (window.isSecureContext === false) {
      setErrorKey("insecure");
      return;
    }
    if (!navigator.geolocation?.getCurrentPosition) {
      setErrorKey("unsupported");
      return;
    }

    setIsLoading(true);

    const handleError = (error) => {
      if (currentRequest !== requestId.current) return;
      setIsLoading(false);
      setErrorKey(({ 1: "denied", 2: "unavailable", 3: "timeout" })[error?.code] || "unavailable");
    };

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (currentRequest !== requestId.current) return;
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
              Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            handleError();
            return;
          }
          setDraft({
            latitude,
            longitude,
            accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
            source: "device",
            capturedAt: new Date().toISOString(),
          });
          mapRef.current?.setView([latitude, longitude], 17);
          setIsLoading(false);
        },
        handleError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch (error) {
      handleError(error);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Native modal keeps focus here and prevents interacting with the cart behind it.
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const map = L.map(containerRef.current, {
      center: initialLocation
        ? [initialLocation.latitude, initialLocation.longitude]
        : LOCATION_MAP_START,
      zoom: initialLocation ? 17 : 9,
      minZoom: 2,
      maxZoom: 19,
      maxBounds: [[-85, -180], [85, 180]],
      zoomControl: false,
    });
    mapRef.current = map;
    L.control.zoom({ zoomInTitle: text("zoomIn"), zoomOutTitle: text("zoomOut") }).addTo(map);
    const tiles = L.tileLayer(LOCATION_MAP_TILES, {
      maxZoom: 19,
      noWrap: true,
      attribution: LOCATION_MAP_ATTRIBUTION,
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    tilesRef.current = tiles;
    tiles.on("tileload", () => setMapLoading(false));
    tiles.on("tileerror", () => { setMapLoading(false); setMapError(true); });
    tiles.addTo(map);
    map.on("click", (event) => choosePoint(event.latlng));
    map.on("dragstart", stopLocating);

    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => map.invalidateSize())
      : null;
    observer?.observe(containerRef.current);
    if (!initialLocation) requestLocation();

    return () => {
      // getCurrentPosition cannot be aborted; discard its callbacks after closing.
      requestId.current += 1;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      tiles.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tilesRef.current = null;
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [initialLocation, text, choosePoint, stopLocating, requestLocation]);

  useEffect(() => {
    if (!draft || !mapRef.current) return;
    const point = [draft.latitude, draft.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
      return;
    }
    // CSS pin avoids missing marker image paths in React/Webpack builds.
    const marker = L.marker(point, {
      draggable: true,
      autoPan: true,
      title: text("marker"),
      icon: L.divIcon({
        className: "guest-location-pin",
        html: '<span aria-hidden="true"></span>',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      }),
    }).addTo(mapRef.current);
    marker.on("dragstart", stopLocating);
    marker.on("dragend", () => choosePoint(marker.getLatLng()));
    markerRef.current = marker;
  }, [draft, text, choosePoint, stopLocating]);

  const retryMap = () => {
    setMapError(false);
    setMapLoading(true);
    tilesRef.current?.redraw();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="company-showcase guest-location-dialog"
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div className="guest-location-dialog__content">
        <div className="guest-location-dialog__heading">
          <h2 id={titleId}>{text("mapTitle")}</h2>
          <button type="button" className="guest-location-dialog__close" onClick={onCancel} aria-label={text("closeMap")} autoFocus>
            <FaXmark aria-hidden="true" />
          </button>
        </div>
        <p id={helpId} className="guest-location-dialog__help">{text("mapHelp")}</p>
        <div className="guest-location-dialog__map-wrap">
          <div ref={containerRef} className="guest-location-dialog__map" aria-label={text("mapLabel")} />
          <span className="guest-location-dialog__crosshair" aria-hidden="true" />
        </div>
        <div className="guest-location-dialog__tools">
          <button type="button" className="showcase-button showcase-button--secondary" onClick={requestLocation} disabled={isLoading}>
            <FaLocationDot aria-hidden="true" />{text(isLoading ? "loading" : "use")}
          </button>
          <button type="button" className="showcase-button showcase-button--secondary" onClick={() => choosePoint(mapRef.current.getCenter())}>
            <FaPlus aria-hidden="true" />{text("useCenter")}
          </button>
        </div>
        {mapLoading && <p className="guest-location-dialog__help" role="status">{text("mapLoading")}</p>}
        {mapError && (
          <div className="guest-location__error" role="alert">
            <p>{text("mapError")}</p>
            <button type="button" className="guest-location__clear" onClick={retryMap}>{text("mapRetry")}</button>
          </div>
        )}
        {errorKey && <p className="guest-location__error" role="alert">{text(errorKey)}</p>}
        <div className="guest-location__selection guest-location-dialog__selection" role="status" aria-live="polite" aria-atomic="true">
          {isLoading && <p>{text("loading")}</p>}
          {draft ? <LocationCoordinates location={draft} text={text} /> : <p>{text("choosePoint")}</p>}
        </div>
        <div className="guest-location-dialog__actions">
          <button type="button" className="showcase-button showcase-button--secondary" onClick={onCancel}>{text("cancel")}</button>
          <button type="button" className="showcase-button showcase-button--primary" disabled={!draft} onClick={() => onConfirm(draft)}>
            <FaCheck aria-hidden="true" />{text("confirm")}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

// Store clock (2026-11-04): the company's current time in its zone (label or
// place + GMT offset) and, when the visitor's device is in another zone,
// "= 18:28 your time". Refreshed every 15 seconds.
export function ShowcaseClock({ t, locale = "en-US", timeZone, label = "" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const format = (z) => {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: z, hour: "2-digit", minute: "2-digit" }).format(now);
    } catch {
      return "";
    }
  };
  const companyOffset = offsetMinutes(zone, now);
  const zoneName = String(label || "").trim() || placeName(zone, locale);
  const offset = formatOffset(companyOffset, { short: true });
  const visitorZone = browserTimeZone();
  const visitorDiffers = isValidTimeZone(visitorZone) && offsetMinutes(visitorZone, now) !== companyOffset;
  const yourTime = visitorDiffers
    ? t("companyShowcase.clock.yourTime", { defaultValue: "= {{time}} your time", time: format(visitorZone) })
    : "";
  const title = t("companyShowcase.clock.title", {
    defaultValue: "Time of the business: {{time}}, {{zone}} ({{offset}})",
    time: format(zone),
    zone: zoneName,
    offset,
  });
  return (
    <div className="showcase-clock" role="timer" aria-live="off" title={yourTime ? `${title}\n${yourTime}` : title}>
      <FaClock aria-hidden="true" />
      <span>
        <small>
          {zoneName} · {offset}
        </small>
        <strong>
          {format(zone)}
          {yourTime && <em> {yourTime}</em>}
        </strong>
      </span>
    </div>
  );
}

export function GuestLocationPicker({ value, onChange, t, locale = "en-US", disabled = false }) {
  const [mapOpen, setMapOpen] = useState(false);
  const text = useCallback((key) => t(`companyShowcase.checkout.location.${key}`, {
    defaultValue: GUEST_LOCATION_TEXT[locale.startsWith("es") ? "es" : "en"][key],
  }), [t, locale]);

  return (
    <fieldset className="guest-location" disabled={disabled}>
      <legend>{text("label")}</legend>
      <p className="guest-location__help">{text("help")}</p>
      <button
        type="button"
        className="showcase-button showcase-button--secondary"
        onClick={() => setMapOpen(true)}
        disabled={disabled}
      >
        <FaLocationDot aria-hidden="true" />
        {text(value ? "editMap" : "openMap")}
      </button>
      <div className="guest-location__status" role="status" aria-live="polite" aria-atomic="true">
        {value && (
          <div className="guest-location__selection">
            <strong><FaCheck aria-hidden="true" />{text("selected")}</strong>
            <LocationCoordinates location={value} text={text} />
          </div>
        )}
      </div>
      {value && (
        <button type="button" className="guest-location__clear" onClick={() => onChange(null)} disabled={disabled}>
          <FaXmark aria-hidden="true" />{text("remove")}
        </button>
      )}
      {mapOpen && (
        <GuestLocationMapDialog
          initialValue={value}
          text={text}
          onCancel={() => setMapOpen(false)}
          onConfirm={(location) => { onChange(location); setMapOpen(false); }}
        />
      )}
    </fieldset>
  );
}

const SHOWCASE_AUTH_TEXT = {
  en: {
    signIn: "Sign in", register: "Create account",
    loginTitle: "Sign in", registerTitle: "Create account",
    loginSubtitle: "Welcome back. Please enter your details.",
    registerSubtitle: "One account for shopping across the platform.",
    account: "Your account",
    signedIn: "Signed in",
    myRequests: "My orders and bookings",
    email: "Email", password: "Password", confirmPassword: "Confirm password",
    passwordHint: "Use at least 8 characters.",
    mismatch: "The passwords do not match.",
    continueWith: "Or continue with", providerAction: "Continue with",
    appleComingSoon: "Apple sign-in coming soon.",
    noAccount: "Don’t have an account?", hasAccount: "Already have an account?",
    signOut: "Sign out", close: "Close account dialog",
    continueAccount: "Continue with my account", reviewOrder: "Review your order",
    backToCart: "Back to cart",
    forgotPassword: "Forgot your password?",
    forgotSending: "Sending...",
    forgotEnterEmail: "Write your email first, then click “Forgot your password?”.",
    forgotSent: "If an account exists for this email, we sent a link to reset the password. Check your inbox and spam folder.",
    forgotFailed: "We could not send the email. Please try again later.",
  },
  es: {
    signIn: "Iniciar sesión", register: "Crear cuenta",
    loginTitle: "Iniciar sesión", registerTitle: "Crear cuenta",
    loginSubtitle: "Te damos la bienvenida. Ingresa tus datos.",
    registerSubtitle: "Una cuenta para comprar en toda la plataforma.",
    account: "Tu cuenta",
    signedIn: "Sesión iniciada",
    myRequests: "Mis pedidos y reservas",
    email: "Correo electrónico", password: "Contraseña", confirmPassword: "Confirmar contraseña",
    passwordHint: "Usa al menos 8 caracteres.",
    mismatch: "Las contraseñas no coinciden.",
    continueWith: "O continúa con", providerAction: "Continuar con",
    appleComingSoon: "El inicio de sesión con Apple estará disponible pronto.",
    noAccount: "¿No tienes una cuenta?", hasAccount: "¿Ya tienes una cuenta?",
    signOut: "Cerrar sesión", close: "Cerrar ventana de cuenta",
    continueAccount: "Continuar con mi cuenta", reviewOrder: "Revisa tu pedido",
    backToCart: "Volver al carrito",
    forgotPassword: "¿Olvidaste tu contraseña?",
    forgotSending: "Enviando...",
    forgotEnterEmail: "Escribe primero tu correo y luego haz clic en “¿Olvidaste tu contraseña?”.",
    forgotSent: "Si existe una cuenta con este correo, enviamos un enlace para cambiar la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.",
    forgotFailed: "No pudimos enviar el correo. Inténtalo de nuevo más tarde.",
  },
};

// Sign-in providers shown in the dialog. Facebook and Microsoft only work once
// they are configured in Firebase; Apple shows a "coming soon" message.
// (2026-10-26) Each button also follows its .env flag (REACT_APP_AUTH_GOOGLE /
// _EMAIL / _MICROSOFT / _FACEBOOK / _APPLE = active | soon | hidden), see
// src/App/shared/Utils/authProviders.js.
const AUTH_PROVIDERS = [
  { id: "google", label: "Google", Icon: FaGoogle },
  { id: "facebook", label: "Facebook", Icon: FaFacebookF },
  { id: "microsoft", label: "Microsoft", Icon: FaMicrosoft },
  { id: "apple", label: "Apple", Icon: FaApple },
];

export function ShowcaseAuthDialog({ user, text, brandColor, onClose, onComplete, onSignOut, onOpenMyRequests }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [errorKey, setErrorKey] = useState("");
  const dialogRef = useRef(null);
  const titleId = useId();
  const passwordHintId = useId();
  const registering = mode === "register";
  const { i18n } = useTranslation();
  const lang = i18n?.language || "es";
  const emailState = authProviderState("email");

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector("input")?.focus();
  }, [mode]);

  const changeMode = (next) => {
    setMode(next);
    setErrorKey("");
    setResetInfo("");
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
  };

  const updateForm = (event) => {
    const { name, value } = event.target;
    setErrorKey("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetInfo, setResetInfo] = useState("");

  // "Forgot your password?": Firebase sends the reset email. Always the same
  // answer, so nobody can find out which emails have an account.
  const handleForgotPassword = async () => {
    const email = form.email.trim();
    setErrorKey("");
    setAuthError("");
    setResetInfo("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorKey("forgotEnterEmail");
      return;
    }
    setAuthBusy(true);
    try {
      await firebasePasswordReset(email);
      setResetInfo(text("forgotSent"));
    } catch (error) {
      const code = error?.code || "";
      if (code === "auth/invalid-email") {
        setErrorKey("forgotEnterEmail");
      } else if (code === "auth/user-not-found") {
        setResetInfo(text("forgotSent"));
      } else {
        console.error("Password reset error:", error);
        setErrorKey("forgotFailed");
      }
    } finally {
      setAuthBusy(false);
    }
  };

  // Real email/password auth against Firebase, then the backend /login (or
  // /createuser first when registering). The backend sets the session cookie.
  const submitAuth = async (event) => {
    event.preventDefault();
    // .env flag (2026-10-26): "soon" only shows a message, no login code runs.
    if (emailState !== AUTH_STATES.ACTIVE) {
      setAuthError(authSoonMessage(lang));
      return;
    }
    if (!event.currentTarget.reportValidity()) return;
    if (registering && form.password !== form.confirmPassword) {
      setErrorKey("mismatch");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const email = form.email.trim();
      const password = form.password;

      const { user, idToken } = registering
        ? await firebaseEmailRegister(email, password)
        : await firebaseEmailLogin(email, password);

      if (registering) {
        // Create the local user first, then log in to get the session cookie.
        await showcaseLoginService.createUser(idToken);
      }
      await showcaseLoginService.login(idToken);

      onComplete({
        name: user.displayName || "",
        email: user.email || email,
        provider: "email",
      });
    } catch (error) {
      console.error("Auth error:", error);
      setAuthError(error?.message || "Authentication failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  // Real social sign-in (Google/Facebook/Microsoft). Apple not configured yet.
  const handleSocial = async (providerId) => {
    // .env flag (2026-10-26): "soon" only shows a message; the code below is
    // kept but not called. "hidden" buttons are not rendered at all.
    const providerState = authProviderState(providerId);
    if (providerState === AUTH_STATES.HIDDEN) return;
    if (providerState === AUTH_STATES.SOON) {
      setAuthError(authSoonMessage(lang));
      return;
    }
    if (providerId === "apple") {
      setAuthError(text("appleComingSoon"));
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const { user, idToken } = await firebaseSocialLogin(providerId);
      // For social, the backend upserts on login; try login, and if the user
      // does not exist locally yet, create then login.
      try {
        await showcaseLoginService.login(idToken);
      } catch (loginErr) {
        await showcaseLoginService.createUser(idToken);
        await showcaseLoginService.login(idToken);
      }
      onComplete({
        name: user.displayName || "",
        email: user.email || "",
        provider: providerId,
      });
    } catch (error) {
      console.error("Social auth error:", error);
      setAuthError(error?.message || "Sign-in failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="company-showcase showcase-auth-dialog"
      style={{ "--showcase-brand": brandColor }}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="showcase-auth__body">
        <div className="showcase-auth__heading">
          <div>
            <h2 id={titleId}>{text(user ? "account" : registering ? "registerTitle" : "loginTitle")}</h2>
            {!user && <p>{text(registering ? "registerSubtitle" : "loginSubtitle")}</p>}
          </div>
          <button type="button" className="showcase-auth__close" onClick={onClose} aria-label={text("close")}><FaXmark aria-hidden="true" /></button>
        </div>
        {user ? (
          <div className="showcase-auth__profile">
            <span className="showcase-auth__badge"><FaCheck aria-hidden="true" />{text("signedIn")}</span>
            <strong>{user.email}</strong>
            {onOpenMyRequests && (
              <button type="button" className="showcase-auth__submit showcase-auth__my-requests" onClick={onOpenMyRequests}>
                <FaListCheck aria-hidden="true" /> {text("myRequests")}
              </button>
            )}
            <button type="button" className="showcase-auth__submit" onClick={onSignOut}>{text("signOut")}</button>
          </div>
        ) : (
          <>
            {/* Email sign-in: hidden when REACT_APP_AUTH_EMAIL=hidden (2026-10-26). */}
            {emailState === AUTH_STATES.HIDDEN && authError && (
              <p className="showcase-auth__error" role="alert">{authError}</p>
            )}
            {emailState !== AUTH_STATES.HIDDEN && (<>
            <form className="showcase-form showcase-auth__form" onSubmit={submitAuth}>
              <label><span>{text("email")}</span><input type="email" name="email" autoComplete="email" value={form.email} onChange={updateForm} placeholder="name@example.com" required /></label>
              <label><span>{text("password")}</span><input type="password" name="password" autoComplete={registering ? "new-password" : "current-password"} value={form.password} onChange={updateForm} minLength={registering ? 8 : undefined} aria-describedby={registering ? passwordHintId : undefined} required /></label>
              {registering && (
                <>
                  <p className="showcase-auth__hint" id={passwordHintId}>{text("passwordHint")}</p>
                  <label><span>{text("confirmPassword")}</span><input type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={updateForm} minLength={8} required /></label>
                </>
              )}
              {errorKey && <p className="showcase-auth__error" role="alert">{text(errorKey)}</p>}
              {authError && <p className="showcase-auth__error" role="alert">{authError}</p>}
              {resetInfo && <p className="showcase-auth__info" role="status">{resetInfo}</p>}
              {!registering && (
                <button type="button" className="showcase-auth__forgot" onClick={handleForgotPassword} disabled={authBusy}>
                  {authBusy ? text("forgotSending") : text("forgotPassword")}
                </button>
              )}
              <button type="submit" className="showcase-auth__submit" disabled={authBusy}>
                {authBusy ? "..." : text(registering ? "register" : "signIn")}
              </button>
            </form>
            <div className="showcase-auth__divider"><span>{text("continueWith")}</span></div>
            </>)}
            <div className="showcase-auth__providers" role="group" aria-label={text("continueWith")}>
              {AUTH_PROVIDERS.filter(({ id }) => authProviderState(id) !== AUTH_STATES.HIDDEN).map(({ id, label, Icon }) => {
                const soon = authProviderState(id) === AUTH_STATES.SOON;
                return (
                  <button key={id} type="button"
                    className={soon ? "is-soon" : undefined}
                    aria-label={`${text("providerAction")} ${label}${soon ? ` (${authSoonLabel(lang)})` : ""}`}
                    disabled={authBusy}
                    onClick={() => handleSocial(id)}>
                    <Icon aria-hidden="true" /><span>{label}</span>
                    {soon && <span className="ak-soon" aria-hidden="true">{authSoonLabel(lang)}</span>}
                  </button>
                );
              })}
            </div>
            <p className="showcase-auth__switch">
              {text(registering ? "hasAccount" : "noAccount")}{" "}
              <button type="button" onClick={() => changeMode(registering ? "login" : "register")}>
                {text(registering ? "signIn" : "register")}
              </button>
            </p>
          </>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

export function ShowcaseAccountControl({ user, open, text, onOpen }) {
  return (
    <button
      type="button"
      className={`showcase-account-trigger${user ? " is-signed-in" : ""}`}
      aria-label={user ? `${text("account")}: ${user.email}` : text("signIn")}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
    >
      <FaCircleUser aria-hidden="true" />
      <span>{text(user ? "account" : "signIn")}</span>
    </button>
  );
}

// Product zoom: landscape card with big image, name, price, full
// description and the same buttons as the product card.
// Opens when the customer clicks a product image (card or cart).
// Terms / privacy text written by the company owner (Company page). Shown as
// plain text (no HTML), so nothing in it can run as code.
function ShowcaseLegalDialog({ title, body, closeText, brandColor, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="company-showcase showcase-legal-dialog"
      style={{ "--showcase-brand": brandColor }}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="showcase-legal__body">
        <div className="showcase-legal__heading">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="showcase-auth__close" onClick={onClose} aria-label={closeText}><FaXmark aria-hidden="true" /></button>
        </div>
        <div className="showcase-legal__text">{body}</div>
      </div>
    </dialog>,
    document.body,
  );
}

function ProductZoomDialog({ product, priceText, bookingText, closeText, brandColor, actions, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="company-showcase showcase-zoom-dialog"
      style={{ "--showcase-brand": brandColor }}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <button type="button" className="showcase-zoom__close" onClick={onClose} aria-label={closeText}>
        <FaXmark aria-hidden="true" />
      </button>
      <div className="showcase-zoom__image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="showcase-zoom__info">
        {product.allowsBooking && (
          <span className="showcase-zoom__badge"><FaCalendarCheck aria-hidden="true" />{bookingText}</span>
        )}
        <h2 id={titleId}>{product.name}</h2>
        <strong className="showcase-zoom__price">{priceText}</strong>
        {product.description && <p>{product.description}</p>}
        {actions}
      </div>
    </dialog>,
    document.body,
  );
}

export default function CompanyShowcase({ t, locale = "en-US" }) {
  const routeParams = useParams();
  const [companySlug] = useState(
    () =>
      (routeParams?.companySlug || "").trim() || resolveCompanySlugFromPath(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  // Category chip selected ("" = all products).
  const [selectedCategory, setSelectedCategory] = useState("");
  // "My orders and bookings" dialog (signed-in customers).
  const [showMyRequests, setShowMyRequests] = useState(false);
  // Last order sent: shows how to pay (payment instructions + coming soon).
  const [paymentNotice, setPaymentNotice] = useState(null);
  // "Request sent — pending approval" pop-up (2026-11-08): booking and order
  // requests must be approved by the company; the customer is told to check
  // the email and how to contact the company.
  const [requestSent, setRequestSent] = useState(null);
  const closeRequestSent = useCallback(() => setRequestSent(null), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [contactProductId, setContactProductId] = useState(null);
  const [zoomProduct, setZoomProduct] = useState(null);
  const [zoomAddedId, setZoomAddedId] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [guestForm, setGuestForm] = useState(EMPTY_GUEST_FORM);
  // Both entry points share this in-memory preview account and a single modal.
  const [mockUser, setMockUser] = useState(null);
  const [authOrigin, setAuthOrigin] = useState(null);

  // Check the real backend session on load (and after login) so the UI reflects
  // whether the visitor is actually authenticated (survives page refresh).
  useEffect(() => {
    let active = true;
    showcaseLoginService
      .getCurrentUser()
      .then((sessionUser) => {
        if (active && sessionUser) setMockUser(sessionUser);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const accountReviewRef = useRef(null);
  const authText = (key) => t(`companyShowcase.authPreview.${key}`, {
    defaultValue: SHOWCASE_AUTH_TEXT[locale.startsWith("es") ? "es" : "en"][key],
  });

  useEffect(() => {
    if (checkoutMode === "account" && showCart && !authOrigin) {
      accountReviewRef.current?.focus();
    }
  }, [checkoutMode, showCart, authOrigin]);
  const [bookingProductId, setBookingProductId] = useState(null);
  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING_FORM);
  // Calendar + slots state for the booking dialog.
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  // Booking window (2026-11-08): scroll to the times after a date, to "Your
  // choice" + "Your information" (end of the form) after a time, and a
  // "back to top" button.
  const bookingDialogRef = useRef(null);
  const bookingSlotsRef = useRef(null);
  const bookingChoiceRef = useRef(null);
  const bookingInfoRef = useRef(null);
  const [bookingShowTop, setBookingShowTop] = useState(false);
  const smoothScrollTo = (ref, block = "start") => {
    window.setTimeout(() => {
      try {
        ref.current?.scrollIntoView({ behavior: "smooth", block });
      } catch {
        ref.current?.scrollIntoView();
      }
    }, 60);
  };
  const [daySlots, setDaySlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Reload the times after the server says the chosen one was just taken.
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);
  const [slotTakenNotice, setSlotTakenNotice] = useState("");
  // Locations (2026-11-07): "" = all locations, else a locationId.
  const [slotLocationFilter, setSlotLocationFilter] = useState("");
  const [slotsError, setSlotsError] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [guestSaving, setGuestSaving] = useState(false);
  const [notice, setNotice] = useState("");
  // CAPTCHA (Cloudflare Turnstile, 2026-10-25): one for the cart, one for bookings.
  const orderCaptcha = useCaptcha();
  const bookingCaptcha = useCaptcha();
  const captchaPendingText = t("companyShowcase.messages.captchaPending", {
    defaultValue: "Please complete the security check (the box above the button) and try again.",
  });

  const [remoteProducts, setRemoteProducts] = useState([]);
  const [remoteCompany, setRemoteCompany] = useState(null);
  // Logo and header configured by the company in the management app.
  const [pageConfiguration, setPageConfiguration] = useState(null);
  // Store bookings depend on the company plan (FREE: bookings only from the
  // manager). shao returns bookingsEnabled: false then (2026-10-22).
  const bookingsEnabled = pageConfiguration?.bookingsEnabled !== false;
  // The company has no active plan (2026-10-23): the store stays visible but
  // does not take orders or booking requests.
  const acceptingOrders = pageConfiguration?.acceptingOrders !== false;
  // Company time zone (2026-11-04): "today" of the calendar and the hours of
  // the slots are the company's (default Costa Rica, GMT−6).
  const companyTimeZone = isValidTimeZone(pageConfiguration?.timeZone)
    ? pageConfiguration.timeZone
    : DEFAULT_TIME_ZONE;
  const companyTimeZoneLabel = String(pageConfiguration?.timeZoneLabel || "").trim();
  const notTakingOrdersText = t("companyShowcase.messages.notTakingOrders", {
    defaultValue: "This store is not taking orders right now. Please contact the business.",
  });
  const isStoreClosedError = (error) => error?.response?.result?.code === "PLAN_REQUIRED";
  // Spam protection and server checks of the order / booking forms
  // (2026-10-25, security S4): translated messages instead of the server text.
  const publicFormErrorText = (error) => {
    const code = error?.response?.result?.code;
    if (isCaptchaError(code)) {
      return code === "CAPTCHA_UNAVAILABLE"
        ? t("companyShowcase.messages.captchaUnavailable", {
            defaultValue: "The security check is not available right now. Please try again in a moment.",
          })
        : t("companyShowcase.messages.captchaFailed", {
            defaultValue: "The security check failed. Please complete it again and resend.",
          });
    }
    if (code === "PUBLIC_FORM_LIMIT") {
      return t("companyShowcase.messages.tooManyRequests", {
        defaultValue: "Too many requests were sent today. Please try again tomorrow or contact the business directly.",
      });
    }
    const message = String(error?.message || "").toLowerCase();
    if (error?.status === 400 && message.startsWith("invalid")) {
      if (message.includes("email")) {
        return t("companyShowcase.messages.invalidEmail", { defaultValue: "Please check the email address." });
      }
      if (message.includes("phone")) {
        return t("companyShowcase.messages.invalidPhone", { defaultValue: "Please check the phone number." });
      }
      return t("companyShowcase.messages.invalidData", { defaultValue: "Please check the data of the form (some text is too long)." });
    }
    return "";
  };
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState("");

  // The route value is the companyId (public link is {base}/showcase/{companyId}).
  // Real company data when loaded; otherwise a generic company so the public
  // page still renders with the real products.
  const company =
    (remoteCompany && {
      id: companySlug,
      slug: companySlug,
      name: remoteCompany.companyName || remoteCompany.name || remoteCompany.businessName || "",
      shortDescription: remoteCompany.shortDescription || remoteCompany.tagline || "",
      description: remoteCompany.description || "",
      brandColor: remoteCompany.brandColor || "#155e75",
      accentColor: remoteCompany.accentColor || "#f59e0b",
      whatsappNumber: remoteCompany.whatsappNumber || remoteCompany.webContactPhone || "",
      messengerHandle: remoteCompany.messengerHandle || remoteCompany.webMessengerLink || "",
      currency: remoteCompany.currency || "USD",
    }) ||
    (companySlug
      ? {
          id: companySlug,
          slug: companySlug,
          name: t("companyShowcase.fallbacks.companyName"),
          shortDescription: "",
          description: "",
          brandColor: "#3459e6",
          accentColor: "#8a5a30",
          whatsappNumber: "",
          messengerHandle: "",
          currency: "USD",
        }
      : null);

  // Load the company page configuration (logo + header). Without one, the
  // showcase keeps its default hero image and store icon.
  useEffect(() => {
    if (!companySlug) {
      setPageConfiguration(null);
      return undefined;
    }
    const controller = new AbortController();

    showcaseService
      .getPageConfiguration({ companyId: companySlug, signal: controller.signal })
      .then((result) => setPageConfiguration(result))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("Error loading page configuration:", error);
        setPageConfiguration(null);
      });

    return () => controller.abort();
  }, [companySlug]);

  const headerImage = pageConfiguration?.headerUrl || SHOWCASE_HERO_IMAGE;
  const logoImage = pageConfiguration?.logoUrl || "";
  const bannerLogo = logoImage || SHOWCASE_LOGO_PLACEHOLDER;
  // "Name shown to customers" from the page configuration wins over the name
  // that comes with the products data.
  const bannerName = String(pageConfiguration?.displayName || "").trim();

  // Light / dark mode (default: same as the visitor's device).
  const { resolved: themeResolved, toggleTheme } = useTheme();
  const themeLabel = themeResolved === "dark"
    ? t("companyShowcase.theme.toLight", { defaultValue: "Switch to light mode" })
    : t("companyShowcase.theme.toDark", { defaultValue: "Switch to dark mode" });

  // Legal texts defined by the company owner. Nothing is shown when empty.
  const termsText = String(pageConfiguration?.termsText || "").trim();
  const privacyText = String(pageConfiguration?.privacyText || "").trim();
  const hasLegalTexts = Boolean(termsText || privacyText);
  const [legalDoc, setLegalDoc] = useState(null); // "terms" | "privacy" | null
  const legalLabel = (key, fallback) => t(`companyShowcase.legal.${key}`, { defaultValue: fallback });
  const legalLinks = hasLegalTexts && (
    <span className="showcase-legal__links">
      {termsText && (
        <button type="button" onClick={() => setLegalDoc("terms")}>{legalLabel("terms", "Terms and conditions")}</button>
      )}
      {termsText && privacyText && <span aria-hidden="true">·</span>}
      {privacyText && (
        <button type="button" onClick={() => setLegalDoc("privacy")}>{legalLabel("privacy", "Privacy policy")}</button>
      )}
    </span>
  );
  const legalNotice = hasLegalTexts && (
    <p className="showcase-legal__notice">
      {legalLabel("notice", "By sending, you accept:")} {legalLinks}
    </p>
  );

  // Load the real public products for this company id.
  useEffect(() => {
    if (!companySlug) {
      setRemoteProducts([]);
      return undefined;
    }
    let active = true;
    setLoadingProducts(true);
    setLoadError("");

    showcaseService
      .getShowcaseData({ companyId: companySlug })
      .then(({ items, company: companyInfo }) => {
        if (!active) return;
        setRemoteProducts(mapShowcaseItems(items, companySlug));
        const hasCompanyIdentity = Boolean(
          companyInfo?.companyName || companyInfo?.name || companyInfo?.businessName,
        );
        setRemoteCompany(hasCompanyIdentity ? companyInfo : null);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Error loading showcase:", error);
        setRemoteProducts([]);
        setRemoteCompany(null);
        setLoadError(
          error?.message || "The showcase could not be loaded. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [companySlug]);

  const companyProducts = useMemo(
    () => remoteProducts,
    [remoteProducts],
  );

  // Category chips: real names only (internal ids are never shown), sorted,
  // with the number of products in each.
  const categoryChips = useMemo(() => {
    const counts = new Map();
    companyProducts.forEach((product) => {
      const name = String(product.categoryName || "").trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [companyProducts, locale]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return companyProducts.filter((product) => {
      if (selectedCategory && product.categoryName !== selectedCategory) return false;
      if (!term) return true;
      return `${product.name} ${product.description} ${product.code} ${product.categoryName || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [companyProducts, searchTerm, selectedCategory]);

  const chooseCategory = (name) => {
    setSelectedCategory(name);
    setCurrentPage(1);
    setContactProductId(null);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const firstResult = (safePage - 1) * PRODUCTS_PER_PAGE;
  const visibleProducts = filteredProducts.slice(
    firstResult,
    firstResult + PRODUCTS_PER_PAGE,
  );

  const cartItems = useMemo(
    () =>
      cart
        .map((line) => ({
          ...line,
          product: companyProducts.find((product) => product.id === line.productId),
        }))
        .filter((line) => line.product),
    [cart, companyProducts],
  );

  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + (item.product.price || 0) * item.quantity,
    0,
  );
  // Subtotal symbol: the products' symbol when all lines share it, "$" otherwise.
  const cartSymbols = new Set(
    cartItems.map((item) => item.product.currencySymbol || DEFAULT_CURRENCY_SYMBOL),
  );
  // One currency per store (Company page); the products already use it.
  const cartCurrencySymbol =
    String(pageConfiguration?.currencySymbol || "").trim() ||
    (cartSymbols.size === 1 ? [...cartSymbols][0] : DEFAULT_CURRENCY_SYMBOL);

  const bookingProduct =
    companyProducts.find((product) => product.id === bookingProductId) || null;

  // Price with the product currency symbol (set per product in the
  // management app; "$" by default). One-character symbols go right before
  // the number ("₡5,000"); longer ones get a space ("R$ 45", "S/ 20").
  const formatPrice = (price, currencySymbol = DEFAULT_CURRENCY_SYMBOL) => {
    if (price === null || price === undefined) {
      return t("companyShowcase.product.customQuote");
    }

    const symbol = String(currencySymbol || "").trim() || DEFAULT_CURRENCY_SYMBOL;
    // Whole amounts without decimals ("$45"); others with two ("$12.50").
    const decimals = Number.isInteger(Number(price)) ? 0 : 2;
    const amount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(price);

    return Array.from(symbol).length > 1 ? `${symbol} ${amount}` : `${symbol}${amount}`;
  };

  const updateSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
    setContactProductId(null);
  };

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setNotice(
      t("companyShowcase.messages.addedToCart", { product: product.name }),
    );
    setContactProductId(null);
  };

  const changeQuantity = (productId, amount) => {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, line.quantity + amount) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) =>
      current.filter((line) => line.productId !== productId),
    );
  };

  const openCart = () => {
    setShowCart(true);
    setCheckoutMode(null);
    setContactProductId(null);
    setNotice("");
  };

  const closeCart = () => {
    setShowCart(false);
    setCheckoutMode(null);
  };

  const openGuestCheckout = () => {
    setGuestForm(EMPTY_GUEST_FORM);
    setCheckoutMode("guest");
  };

  const openAccountCheckout = () => {
    if (mockUser) {
      // Prefill what we already know from the account; keep the rest empty.
      setGuestForm((current) => ({
        ...EMPTY_GUEST_FORM,
        name: mockUser.name || mockUser.displayName || current.name || "",
        email: mockUser.email || current.email || "",
      }));
      setCheckoutMode("account");
    } else {
      setAuthOrigin("checkout");
    }
  };

  const submitGuestOrder = async (event) => {
    event.preventDefault();

    const companyId = company?.id;
    if (!companyId) {
      setNotice(
        t("companyShowcase.messages.missingCompany", {
          defaultValue: "No company is selected.",
        }),
      );
      return;
    }
    if (!cartItems.length) {
      setNotice(
        t("companyShowcase.messages.emptyCart", {
          defaultValue: "Your cart is empty.",
        }),
      );
      return;
    }

    // Decide the order type from the cart (products vs services vs mixed).
    const kinds = new Set(
      cartItems.map((line) =>
        line.product?.allowsBooking ? "SERVICE" : "PRODUCT",
      ),
    );
    const orderType =
      kinds.size > 1 ? "MIXED" : kinds.has("SERVICE") ? "SERVICE" : "PRODUCT";

    // For delivery, require EITHER a typed address OR a selected map location.
    if (guestForm.needsDelivery) {
      const hasAddress = (guestForm.address || "").trim() !== "";
      const hasLocation = Boolean(guestForm.location);
      if (!hasAddress && !hasLocation) {
        setNotice(
          t("companyShowcase.messages.deliveryTarget", {
            defaultValue:
              "For delivery, please enter an address or select a location on the map.",
          }),
        );
        return;
      }
    }

    const deliveryMode = guestForm.needsDelivery ? "DELIVERY" : "PICKUP";
    const order = {
      orderType,
      useRegisteredCustomer: false,
      customerId: "",
      customerName: guestForm.name.trim(),
      phone: guestForm.phone.trim(),
      email: guestForm.email.trim(),
      socialLink: guestForm.contactValue.trim(),
      preferredContact: guestForm.preferredContact,
      contactValue: guestForm.contactValue.trim(),
      region: (guestForm.region || "").trim(),
      // Address/location only matter for delivery.
      address: guestForm.needsDelivery ? (guestForm.address || "").trim() : "",
      deliveryMode,
      latitude:
        guestForm.needsDelivery && guestForm.location
          ? guestForm.location.lat ?? guestForm.location.latitude ?? null
          : null,
      longitude:
        guestForm.needsDelivery && guestForm.location
          ? guestForm.location.lng ?? guestForm.location.longitude ?? null
          : null,
      notes: (guestForm.notes || "").trim(),
      items: cartItems.map((line) => ({
        productId: line.product.id,
        productCode: line.product.code || "",
        productName: line.product.name || "",
        quantity: line.quantity,
        unitPrice: Number(line.product.price) || 0,
      })),
    };

    if (!orderCaptcha.ready) {
      setNotice(captchaPendingText);
      return;
    }
    setGuestSaving(true);
    try {
      const response = await webOrderRequestService.createWebOrder({
        companyId,
        order,
        captchaToken: orderCaptcha.token,
      });
      const code =
        response?.result?.requestCode ||
        response?.result?.request_code ||
        "";
      setCart([]);
      setShowCart(false);
      setCheckoutMode(null);
      setPaymentNotice({ reference: code });
      setRequestSent({ kind: "order", reference: code, email: guestForm.email.trim() });
      setNotice(
        t("companyShowcase.messages.orderCreated", {
          defaultValue:
            "Your order request was sent. Reference: {reference}. The company will confirm it.",
          reference: code,
          name: guestForm.name.trim(),
          customerType: t("companyShowcase.checkout.guestType"),
        }).replace("{reference}", String(code)),
      );
    } catch (error) {
      console.error("Error sending guest order:", error);
      setNotice(
        (isStoreClosedError(error) && notTakingOrdersText) ||
        publicFormErrorText(error) ||
        error?.message ||
          t("companyShowcase.messages.orderError", {
            defaultValue: "Your order could not be sent. Please try again.",
          }),
      );
    } finally {
      setGuestSaving(false);
      orderCaptcha.reset(); // a CAPTCHA token works only once
    }
  };

  const submitAccountOrder = async (event) => {
    event.preventDefault();

    const companyId = company?.id;
    if (!companyId) {
      setNotice(
        t("companyShowcase.messages.missingCompany", {
          defaultValue: "No company is selected.",
        }),
      );
      return;
    }
    if (!mockUser || cartItems.length === 0) return;

    // Order type from the cart.
    const kinds = new Set(
      cartItems.map((line) =>
        line.product?.allowsBooking ? "SERVICE" : "PRODUCT",
      ),
    );
    const orderType =
      kinds.size > 1 ? "MIXED" : kinds.has("SERVICE") ? "SERVICE" : "PRODUCT";

    // For delivery, require EITHER a typed address OR a selected map location.
    if (guestForm.needsDelivery) {
      const hasAddress = (guestForm.address || "").trim() !== "";
      const hasLocation = Boolean(guestForm.location);
      if (!hasAddress && !hasLocation) {
        setNotice(
          t("companyShowcase.messages.deliveryTarget", {
            defaultValue:
              "For delivery, please enter an address or select a location on the map.",
          }),
        );
        return;
      }
    }

    const deliveryMode = guestForm.needsDelivery ? "DELIVERY" : "PICKUP";

    // Logged-in order: same payload as guest, but the customer info comes from
    // the account. The backend reads the LOGGED USER from the session cookie
    // (credentials: include) and stores the order as PLATFORM_USER + user_code.
    const order = {
      orderType,
      useRegisteredCustomer: true,
      customerId: "",
      customerName: (mockUser.name || mockUser.displayName || guestForm.name || "").trim(),
      phone: (guestForm.phone || mockUser.phone || "").trim(),
      email: (mockUser.email || guestForm.email || "").trim(),
      socialLink: (guestForm.contactValue || "").trim(),
      preferredContact: guestForm.preferredContact,
      contactValue: (guestForm.contactValue || "").trim(),
      region: (guestForm.region || "").trim(),
      address: guestForm.needsDelivery ? (guestForm.address || "").trim() : "",
      deliveryMode,
      latitude:
        guestForm.needsDelivery && guestForm.location
          ? guestForm.location.lat ?? guestForm.location.latitude ?? null
          : null,
      longitude:
        guestForm.needsDelivery && guestForm.location
          ? guestForm.location.lng ?? guestForm.location.longitude ?? null
          : null,
      notes: (guestForm.notes || "").trim(),
      items: cartItems.map((line) => ({
        productId: line.product.id,
        productCode: line.product.code || "",
        productName: line.product.name || "",
        quantity: line.quantity,
        unitPrice: Number(line.product.price) || 0,
      })),
    };

    if (!orderCaptcha.ready) {
      setNotice(captchaPendingText);
      return;
    }
    setGuestSaving(true);
    try {
      const response = await webOrderRequestService.createWebOrder({
        companyId,
        order,
        captchaToken: orderCaptcha.token,
      });
      const code =
        response?.result?.requestCode ||
        response?.result?.request_code ||
        "";
      setCart([]);
      setShowCart(false);
      setCheckoutMode(null);
      setPaymentNotice({ reference: code });
      setRequestSent({ kind: "order", reference: code, email: order.email });
      setNotice(
        t("companyShowcase.messages.orderCreated", {
          defaultValue:
            "Your order request was sent. Reference: {reference}. The company will confirm it.",
          reference: code,
          name: order.customerName,
          customerType: authText("account"),
        }).replace("{reference}", String(code)),
      );
    } catch (error) {
      console.error("Error sending account order:", error);
      setNotice(
        (isStoreClosedError(error) && notTakingOrdersText) ||
        publicFormErrorText(error) ||
        error?.message ||
          t("companyShowcase.messages.orderError", {
            defaultValue: "Your order could not be sent. Please try again.",
          }),
      );
    } finally {
      setGuestSaving(false);
      orderCaptcha.reset(); // a CAPTCHA token works only once
    }
  };

  const openBooking = (product) => {
    setSlotTakenNotice("");
    setBookingProductId(product.id);
    setBookingForm(EMPTY_BOOKING_FORM);
    setSelectedSlotKey("");
    setSelectedSlot(null);
    setDaySlots([]);
    setSlotsError("");
    setSlotLocationFilter("");
    // The month of "today" in the company zone (2026-11-04).
    const [todayYear, todayMonth] = todayInZone(companyTimeZone).split("-").map(Number);
    setCalendarMonth(new Date(todayYear, todayMonth - 1, 1));
    setContactProductId(null);
    setNotice("");
  };

  const closeBooking = () => {
    setBookingShowTop(false);
    setBookingProductId(null);
    setBookingForm(EMPTY_BOOKING_FORM);
    setSelectedSlotKey("");
    setSelectedSlot(null);
    setDaySlots([]);
    setSlotsError("");
    setSlotLocationFilter("");
  };

  // Load real slots from the backend whenever a date is chosen.
  // IMPORTANT: depend on STABLE primitive ids (strings), not on the
  // bookingProduct / company OBJECTS, which are recreated every render and
  // would cause an infinite effect loop (the flickering slots).
  const bookingProductIdForSlots = bookingProduct?.id || "";
  const companyIdForSlots = company?.id || "";

  useEffect(() => {
    const date = bookingForm.preferredDate;
    if (!bookingProductIdForSlots || !date) {
      setDaySlots([]);
      return undefined;
    }
    if (!companyIdForSlots) return undefined;

    let active = true;
    setSlotsLoading(true);
    setSlotsError("");
    setSelectedSlotKey("");

    bookingSlotsService
      .getDayAvailability({
        companyId: companyIdForSlots,
        productId: bookingProductIdForSlots,
        date,
      })
      .then((availability) => {
        if (!active) return;
        setDaySlots(availability?.slots || []);
        if (!availability?.available) {
          setSlotsError(
            availability?.reason ||
              t("companyShowcase.booking.noSlots", {
                defaultValue: "No slots available for this date.",
              }),
          );
        }
      })
      .catch((error) => {
        if (!active) return;
        setDaySlots([]);
        setSlotsError(
          error?.message ||
            t("companyShowcase.booking.slotsError", {
              defaultValue: "Slots could not be loaded. Please try again.",
            }),
        );
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingProductIdForSlots, bookingForm.preferredDate, companyIdForSlots, slotsReloadKey]);

  // ---- Calendar helpers (simple month grid) ----
  const pad2 = (n) => String(n).padStart(2, "0");
  const toDateKey = (year, month, day) =>
    `${year}-${pad2(month + 1)}-${pad2(day)}`;

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    return cells;
  }, [calendarMonth]);

  // "Today" in the company time zone, not the visitor's (2026-11-04).
  const todayKey = todayInZone(companyTimeZone);

  // Line under the slots: "Times shown in Costa Rica time (GMT−6)", and the
  // visitor's own time when the device is in another zone.
  const visitorTimeZone = browserTimeZone();
  const slotsZoneInfo = useMemo(() => {
    const date = bookingForm.preferredDate;
    if (!date) return null;
    const middayMoment = zonedDateTime(date, "12:00", companyTimeZone) || new Date();
    const companyOffset = offsetMinutes(companyTimeZone, middayMoment);
    const zoneName = companyTimeZoneLabel || placeName(companyTimeZone, locale);
    const differentZone =
      isValidTimeZone(visitorTimeZone) && offsetMinutes(visitorTimeZone, middayMoment) !== companyOffset;
    return { zoneName, offset: formatOffset(companyOffset, { short: true }), differentZone };
  }, [bookingForm.preferredDate, companyTimeZone, companyTimeZoneLabel, locale, visitorTimeZone]);

  // "= 15:00 your time" (with the day when it is another day).
  const visitorTimeText = (slot) => {
    if (!slotsZoneInfo?.differentZone || slot.allDay || !slot.startTime) return "";
    const moment = zonedDateTime(bookingForm.preferredDate, slot.startTime, companyTimeZone);
    if (!moment) return "";
    const sameDay = todayInZone(visitorTimeZone, moment) === bookingForm.preferredDate;
    try {
      return moment.toLocaleString(locale, {
        ...(sameDay ? {} : { weekday: "short", day: "numeric" }),
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Locations (2026-11-07): the free times grouped by location (name,
  // address, "Open in Maps"); with 2 or more locations the visitor can show
  // only one. Without locations the list is the same as before.
  const renderSlotButton = (slot, i) => {
    const key = slotKey(slot);
    const label = slot.allDay
      ? t("companyShowcase.booking.allDay", { defaultValue: "All day" })
      : `${slot.startTime} - ${slot.endTime}`;
    return (
      <button
        key={`${key}-${i}`}
        type="button"
        className={[
          "booking-slot",
          selectedSlotKey === key ? "is-selected" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => selectSlot(slot)}
      >
        <span>{label}</span>
        <small>
          {slot.remaining}{" "}
          {t("companyShowcase.booking.left", { defaultValue: "left" })}
        </small>
        {visitorTimeText(slot) && (
          <small className="booking-slot__local">
            {t("companyShowcase.booking.yourTime", {
              defaultValue: "= {{time}} your time",
              time: visitorTimeText(slot),
            })}
          </small>
        )}
      </button>
    );
  };

  const renderSlotGroups = () => {
    if (!slotsHaveLocations(daySlots)) {
      return <div className="booking-slots__list">{daySlots.map(renderSlotButton)}</div>;
    }
    const groups = groupSlotsByLocation(daySlots);
    const located = groups.filter((group) => group.locationId);
    const filter = located.some((group) => group.locationId === slotLocationFilter) ? slotLocationFilter : "";
    const visibleGroups = filter ? groups.filter((group) => group.locationId === filter) : groups;
    return (
      <>
        {slotsLetCustomerChoose(daySlots) && located.length >= 2 && (
          <p className="booking-locations-choice" role="note">
            <FaLocationDot aria-hidden="true" />
            {t("companyShowcase.booking.customerChooses", {
              defaultValue: "You choose the location: pick the time in the location you prefer.",
            })}
          </p>
        )}
        {located.length >= 2 && (
          <div
            className="booking-locations-filter"
            role="group"
            aria-label={t("companyShowcase.booking.locationFilter", { defaultValue: "Location" })}
          >
            <button
              type="button"
              className={!filter ? "is-active" : ""}
              aria-pressed={!filter}
              onClick={() => setSlotLocationFilter("")}
            >
              {t("companyShowcase.booking.allLocations", { defaultValue: "All locations" })}
            </button>
            {located.map((group) => (
              <button
                key={group.key}
                type="button"
                className={filter === group.locationId ? "is-active" : ""}
                aria-pressed={filter === group.locationId}
                onClick={() => setSlotLocationFilter(group.locationId)}
              >
                <FaLocationDot aria-hidden="true" /> {group.name}
              </button>
            ))}
          </div>
        )}
        {visibleGroups.map((group) => (
          <section className="booking-location-group" key={group.key}>
            <div className="booking-location-group__header">
              <FaLocationDot aria-hidden="true" />
              <div className="booking-location-group__text">
                <strong>
                  {group.locationId
                    ? group.name
                    : t("companyShowcase.booking.otherTimes", { defaultValue: "Other times" })}
                </strong>
                {group.address && <small>{group.address}</small>}
                {group.details && <small>{group.details}</small>}
              </div>
              {safeMapsUrl(group.mapsUrl) && (
                <a href={safeMapsUrl(group.mapsUrl)} target="_blank" rel="noopener noreferrer">
                  {t("companyShowcase.booking.openMaps", { defaultValue: "Open in Maps" })}
                </a>
              )}
            </div>
            <div className="booking-slots__list">{group.slots.map(renderSlotButton)}</div>
          </section>
        ))}
      </>
    );
  };

  // "Lunes, 9 de noviembre · 15:00 - 16:00" (Your choice and the pop-up).
  const choiceWhenText = (dateKey, slot) => {
    if (!dateKey || !slot) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    const day = new Date(y, m - 1, d).toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const time = slot.allDay
      ? t("companyShowcase.booking.allDay", { defaultValue: "All day" })
      : `${slot.startTime} - ${slot.endTime}`;
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
  };

  const pickCalendarDay = (day) => {
    if (!day) return;
    const key = toDateKey(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    if (key < todayKey) return; // no past dates
    setSlotTakenNotice("");
    setBookingForm((current) => ({ ...current, preferredDate: key }));
    smoothScrollTo(bookingSlotsRef);
  };

  const moveMonth = (delta) => {
    setCalendarMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };

  const selectSlot = (slot) => {
    setSlotTakenNotice("");
    // The same hour in two locations are two different slots (2026-11-07).
    const key = slotKey(slot);
    setSelectedSlotKey(key);
    setSelectedSlot(slot);
    setBookingForm((current) => ({
      ...current,
      preferredTime: slot.allDay ? "" : slot.startTime,
    }));
    // Go to the last part: "Your choice" + the contact fields (2026-11-08).
    smoothScrollTo(bookingInfoRef);
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!bookingForm.preferredDate || !selectedSlotKey || !selectedSlot) {
      setSlotsError(
        t("companyShowcase.booking.pickSlot", {
          defaultValue: "Please choose a date and an available time.",
        }),
      );
      return;
    }

    const companyId = company?.id;
    if (!companyId || !bookingProduct) {
      setSlotsError(
        t("companyShowcase.booking.missingCompany", {
          defaultValue: "Missing company/product context.",
        }),
      );
      return;
    }

    const request = {
      serviceId: bookingProduct.id,
      customerName: bookingForm.name.trim(),
      phone: bookingForm.phone.trim(),
      email: bookingForm.email.trim(),
      // The contact value (profile/link/number) for the preferred method.
      socialLink: bookingForm.contactValue.trim(),
      appointmentDate: bookingForm.preferredDate,
      startHour: selectedSlot.startTime || bookingForm.preferredTime,
      endHour: selectedSlot.endTime || bookingForm.preferredTime,
      // Location of the chosen time (2026-11-07); "" when it has none.
      locationId: selectedSlot.locationId || "",
      comments:
        `Preferred contact: ${bookingForm.preferredContact}. ` +
        (bookingForm.notes || ""),
    };

    if (!bookingCaptcha.ready) {
      setSlotsError(captchaPendingText);
      return;
    }
    setBookingSaving(true);
    setSlotsError("");
    try {
      const response = await appointmentRequestService.createRequest({
        companyId,
        request,
        captchaToken: bookingCaptcha.token,
      });
      const reference =
        response?.result?.appointmentId ||
        response?.result?.appointment_id ||
        buildReference("BKG");
      const where = selectedSlot.locationName
        ? ` ${t("companyShowcase.booking.locationNotice", {
            defaultValue: "Location: {{location}}.",
            location: [selectedSlot.locationName, selectedSlot.locationAddress].filter(Boolean).join(", "),
          })}`
        : "";
      setRequestSent({
        kind: "booking",
        reference: String(reference),
        email: request.email,
        details: [
          bookingProduct.name,
          choiceWhenText(bookingForm.preferredDate, selectedSlot),
          [selectedSlot.locationName, selectedSlot.locationAddress].filter(Boolean).join(", "),
        ],
      });
      setNotice(
        t("companyShowcase.messages.bookingCreated", {
          defaultValue:
            "Your booking request was sent. Reference: {reference}. The company will confirm it.",
          reference,
          service: bookingProduct.name,
        }).replace("{reference}", String(reference)) + where,
      );
      closeBooking();
    } catch (error) {
      console.error("Error sending booking request:", error);
      // The server checks the slot again: if someone took it in the meantime,
      // show a clear message and reload the free times for that date.
      if (error?.status === 409 && error?.response?.result?.code === "SLOT_TAKEN") {
        setSelectedSlot(null);
        setSelectedSlotKey("");
        setSlotTakenNotice(
          t("companyShowcase.booking.slotTaken", {
            defaultValue: "This time was just taken. Please choose another time.",
          }),
        );
        setSlotsReloadKey((key) => key + 1);
        return;
      }
      setSlotsError(
        (isStoreClosedError(error) && notTakingOrdersText) ||
        publicFormErrorText(error) ||
        error?.message ||
          t("companyShowcase.booking.submitError", {
            defaultValue: "Your request could not be sent. Please try again.",
          }),
      );
    } finally {
      setBookingSaving(false);
      bookingCaptcha.reset(); // a CAPTCHA token works only once
    }
  };

  const updateGuestForm = (event) => {
    const { name, value } = event.target;
    setGuestForm((current) => ({ ...current, [name]: value }));
  };

  const updateBookingForm = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({ ...current, [name]: value }));
  };

  // "Contact us" (2026-10-31): the COMPANY WhatsApp and social network link
  // (Company page) are used for every product. Each one is shown only when the
  // company set it; with neither, there is no "Contact us" button. The message
  // still names the product, so customer service knows what it is about.
  const companyWhatsappDigits = String(pageConfiguration?.contactWhatsapp || "").replace(/[^0-9]/g, "");
  const companySocialLink = /^https?:\/\//i.test(String(pageConfiguration?.socialLink || "").trim())
    ? String(pageConfiguration.socialLink).trim()
    : "";
  const companySocialType = String(pageConfiguration?.socialLinkType || "OTHER").toUpperCase();
  const SocialIcon =
    { FACEBOOK: FaFacebookMessenger, INSTAGRAM: FaInstagram, TIKTOK: FaTiktok }[companySocialType] || FaLink;
  const socialLabel =
    { FACEBOOK: "Facebook / Messenger", INSTAGRAM: "Instagram", TIKTOK: "TikTok" }[companySocialType] ||
    t("companyShowcase.contact.socialOther", { defaultValue: "Social network" });

  const productWhatsappNumber = () => companyWhatsappDigits;

  const productMessengerLink = () => companySocialLink;

  const hasWhatsapp = (product) => productWhatsappNumber(product).length > 0;
  const hasMessenger = (product) => productMessengerLink(product).length > 0;

  // WhatsApp deep link using the company phone (empty if none).
  const whatsappUrl = (product) => {
    const number = productWhatsappNumber(product);
    if (!number) return "";

    const message = t("companyShowcase.contact.whatsappMessage", {
      defaultValue:
        "Hello, I am looking at this product: {product} (code: {code}). {description} I want to know how to purchase it.",
      product: product.name,
      code: product.code,
      description: product.description || "",
    })
      .replace("{product}", product.name || "")
      .replace("{code}", product.code || "")
      .replace("{description}", product.description || "");

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  // Company social network link (empty if none).
  const messengerUrl = (product) => productMessengerLink(product);

  // ---- AI assistant (Aleph) actions -------------------------------------
  // The backend only returns actions for PUBLIC products of THIS company and
  // already checked the type (cart / booking / contact). The page runs them
  // with its normal functions. There is no action to place an order or send
  // a booking request: the visitor always confirms those.

  // The product may not be in the loaded list (search, paging): add it.
  const ensureAssistantProduct = (action) => {
    const existing = companyProducts.find((product) => product.id === action.productId);
    if (existing) return existing;
    if (!action.product) return null;
    const mapped = showcaseItemToProduct(action.product, companySlug);
    if (!mapped.id) return null;
    setRemoteProducts((current) =>
      current.some((product) => product.id === mapped.id) ? current : [...current, mapped],
    );
    return mapped;
  };

  const assistantText = (key, options) => t(`showcaseAssistant.${key}`, options);

  const handleAssistantAction = (action) => {
    const type = String(action?.type || "");

    if (type === "open_cart") {
      openCart();
      return { note: assistantText("noteCart") };
    }
    if (type === "open_login") {
      setAuthOrigin("header");
      return { note: assistantText("noteLogin") };
    }

    const product = ensureAssistantProduct(action || {});
    if (!product) return null;

    if (type === "add_to_cart" && product.allowsOnlineOrder) {
      const quantity = Math.min(Math.max(Number(action.quantity) || 1, 1), 20);
      setCart((current) => {
        const line = current.find((item) => item.productId === product.id);
        return line
          ? current.map((item) =>
              item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item,
            )
          : [...current, { productId: product.id, quantity }];
      });
      setNotice(t("companyShowcase.messages.addedToCart", { product: product.name }));
      return { note: assistantText("noteAdded", { product: product.name, quantity }) };
    }

    if (type === "set_cart_quantity" && product.allowsOnlineOrder) {
      const quantity = Math.min(Math.max(Number(action.quantity) || 0, 0), 20);
      setCart((current) => {
        const exists = current.some((item) => item.productId === product.id);
        const next = exists
          ? current.map((item) => (item.productId === product.id ? { ...item, quantity } : item))
          : [...current, { productId: product.id, quantity }];
        return next.filter((item) => item.quantity > 0);
      });
      return {
        note: quantity > 0
          ? assistantText("noteQuantity", { product: product.name, quantity })
          : assistantText("noteRemoved", { product: product.name }),
      };
    }

    if (type === "open_booking" && product.allowsBooking && bookingsEnabled) {
      openBooking(product);
      const date = String(action.date || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayKey) {
        const [year, month] = date.split("-").map(Number);
        setBookingForm((current) => ({ ...current, preferredDate: date }));
        setCalendarMonth(new Date(year, month - 1, 1));
      }
      return { note: assistantText("noteBooking", { product: product.name }) };
    }

    if (type === "show_contact") {
      setContactProductId(product.id);
      return {
        contact: {
          productName: product.name,
          whatsappUrl: hasWhatsapp(product) ? whatsappUrl(product) : "",
          messengerUrl: hasMessenger(product) ? messengerUrl(product) : "",
        },
      };
    }

    return null;
  };

  useEffect(() => {
    if (!zoomAddedId) return undefined;
    const timer = setTimeout(() => setZoomAddedId(null), 1800);
    return () => clearTimeout(timer);
  }, [zoomAddedId]);

  // Product buttons (Order here / Contact us / Book now). Shared by the
  // product card and the zoom view so both always show the same actions.
  //   variant "card": original card buttons (contact opens a small menu).
  //   variant "zoom": contact channels shown directly; "Order here" stays in
  //                   the zoom and shows "Added"; "Book now" closes the zoom.
  const renderProductActions = (product, variant = "card") => {
    const inZoom = variant === "zoom";
    const hasContact = hasWhatsapp(product) || hasMessenger(product);
    const justAdded = inZoom && zoomAddedId === product.id;

    const contactLinks = (
      <>
        {hasWhatsapp(product) && (
          <a
            href={whatsappUrl(product)}
            target="_blank"
            rel="noreferrer"
          >
            <FaWhatsapp />
            <span>
              <strong>WhatsApp</strong>
              <small>{t("companyShowcase.contact.externalChannel")}</small>
            </span>
          </a>
        )}

        {hasMessenger(product) && (
          <a href={messengerUrl(product)} target="_blank" rel="noreferrer">
            <SocialIcon />
            <span>
              <strong>{socialLabel}</strong>
              <small>{t("companyShowcase.contact.externalChannel")}</small>
            </span>
          </a>
        )}
      </>
    );

    return (
      <div className={inZoom ? "showcase-zoom__actions" : "showcase-product-card__actions"}>
        {product.allowsOnlineOrder && (
          <button
            type="button"
            className="showcase-button showcase-button--primary"
            onClick={() => {
              addToCart(product);
              if (inZoom) setZoomAddedId(product.id);
            }}
          >
            {justAdded ? <FaCheck /> : <FaCartPlus />}
            {justAdded
              ? t("companyShowcase.actions.added", { defaultValue: "Added" })
              : t("companyShowcase.actions.orderHere")}
          </button>
        )}

        {product.allowsBooking && bookingsEnabled && inZoom && (
          <button
            type="button"
            className="showcase-button showcase-button--booking"
            onClick={() => {
              setZoomProduct(null);
              openBooking(product);
            }}
          >
            <FaCalendarCheck />
            {t("companyShowcase.actions.bookNow")}
          </button>
        )}

        {/* "Contact us" for every kind of product (cart, booking,
            contact-only), but only when the product has at least
            one channel; the menu lists only the channels it has. */}
        {hasContact && inZoom && (
          <div className="showcase-zoom__contact">
            <span>{t("companyShowcase.actions.contactUs")}</span>
            <div className="contact-menu">{contactLinks}</div>
          </div>
        )}

        {hasContact && !inZoom && (
        <div className="contact-action">
          <button
            type="button"
            className="showcase-button showcase-button--secondary"
            onClick={() =>
              setContactProductId((current) =>
                current === product.id ? null : product.id,
              )
            }
            aria-expanded={contactProductId === product.id}
          >
            {t("companyShowcase.actions.contactUs")}
            <FaChevronDown />
          </button>

          {contactProductId === product.id && (
            <div className="contact-menu">{contactLinks}</div>
          )}
        </div>
        )}

        {product.allowsBooking && !bookingsEnabled && (
          <p className="showcase-booking-off">
            {t("companyShowcase.actions.bookingByContact", {
              defaultValue: "To book this service, contact the business.",
            })}
          </p>
        )}

        {product.allowsBooking && bookingsEnabled && !inZoom && (
          <button
            type="button"
            className="showcase-button showcase-button--booking"
            onClick={() => openBooking(product)}
          >
            <FaCalendarCheck />
            {t("companyShowcase.actions.bookNow")}
          </button>
        )}
      </div>
    );
  };

  if (!company) {
    return (
      <main className="company-showcase company-showcase--not-found">
        <FaStore />
        <h1>{t("companyShowcase.notFound.title")}</h1>
        <p>{t("companyShowcase.notFound.description", { slug: companySlug })}</p>
      </main>
    );
  }

  return (
    <main
      className="company-showcase"
      style={{
        "--showcase-brand": company.brandColor,
        "--showcase-accent": company.accentColor,
        ...(logoImage && { "--showcase-logo": `url("${logoImage}")` }),
      }}
    >
      {/* AlephK platform bar on top (2026-10-25); the company's own header comes second. */}
      <AlephKBar />

      <header className="showcase-header">
        <a className="showcase-brand" href={`/showcase/${company.slug}`}>
          <span>{!logoImage && <FaStore />}</span>
          <div>
            <strong>{bannerName || company.name}</strong>
            <small>{company.shortDescription || t("companyShowcase.publicStore")}</small>
          </div>
        </a>

        <label className="showcase-search">
          <FaMagnifyingGlass />
          <input
            value={searchTerm}
            onChange={updateSearch}
            placeholder={t("companyShowcase.search.placeholder")}
            aria-label={t("companyShowcase.search.label")}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              aria-label={t("companyShowcase.search.clear")}
            >
              <FaXmark />
            </button>
          )}
        </label>

        <div className="showcase-header-actions">
          {/* Company time (2026-11-04), once the page configuration is loaded. */}
          {pageConfiguration && (
            <ShowcaseClock t={t} locale={locale} timeZone={companyTimeZone} label={companyTimeZoneLabel} />
          )}
          <button
            type="button"
            className="showcase-theme-button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {themeResolved === "dark" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
          </button>
          <ShowcaseAccountControl user={mockUser} open={Boolean(authOrigin)} text={authText} onOpen={() => setAuthOrigin("header")} />
          <button
            type="button"
            className="showcase-cart-button"
            onClick={openCart}
            aria-label={t("companyShowcase.cart.open")}
          >
            <HiShoppingCart />
            {cartQuantity > 0 && <span>{cartQuantity}</span>}
          </button>
        </div>
      </header>

      <div className="showcase-body">
        <section
          className="showcase-company-banner showcase-company-banner--with-logo"
          style={{ "--showcase-hero": `url("${headerImage}")` }}
        >
          <img
            className="showcase-company-banner__logo"
            src={bannerLogo}
            alt={t("companyShowcase.logoAlt", { name: bannerName || company.name })}
          />
          <div className="showcase-company-banner__content">
            {/* Only companies verified in tbl_company_verification. */}
            {pageConfiguration?.verified === true && (
              <span className="showcase-company-banner__eyebrow">
                <FaCheck /> {t("companyShowcase.verifiedCompany")}
              </span>
            )}
            <h1>{bannerName || company.name}</h1>
            <p>{company.shortDescription || company.description || t("companyShowcase.fallbacks.companyDescription")}</p>
            <a href="#showcase-products" className="showcase-company-banner__cta">
              {t("companyShowcase.actions.explore")}
              <FaArrowRight />
            </a>
          </div>
        </section>

        {!acceptingOrders && (
          <div className="showcase-closed-note showcase-closed-note--banner" role="status">
            {notTakingOrdersText}
          </div>
        )}

        {notice && (
          <div className="showcase-notice" role="status">
            <FaCheck />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("companyShowcase.actions.close")}
            >
              <FaXmark />
            </button>
          </div>
        )}

        {paymentNotice && (
          <div className="showcase-payment-notice" role="status">
            <FaMoneyBillWave aria-hidden="true" />
            <div>
              <strong>{t("companyShowcase.payment.title")}</strong>
              {paymentNotice.reference && (
                <small>{t("companyShowcase.payment.reference", { reference: paymentNotice.reference })}</small>
              )}
              {String(pageConfiguration?.paymentInstructions || "").trim() && (
                <p className="showcase-payment-notice__text">{pageConfiguration.paymentInstructions}</p>
              )}
              <p>{t("companyShowcase.payment.comingSoon")}</p>
            </div>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              aria-label={t("companyShowcase.actions.close")}
            >
              <FaXmark />
            </button>
          </div>
        )}

        <section className="showcase-results" id="showcase-products">
          <div className="showcase-results__heading">
            <div>
              <h2>{t("companyShowcase.products.title")}</h2>
              <p>
                {t("companyShowcase.products.resultCount", {
                  count: filteredProducts.length,
                })}
              </p>
            </div>
            {searchTerm && (
              <span>
                {t("companyShowcase.products.searchingFor", {
                  search: searchTerm,
                })}
              </span>
            )}
          </div>

          {categoryChips.length > 0 && (
            <div className="showcase-categories" role="group" aria-label={t("companyShowcase.categories.label")}>
              <button
                type="button"
                className={selectedCategory === "" ? "is-active" : ""}
                aria-pressed={selectedCategory === ""}
                onClick={() => chooseCategory("")}
              >
                {t("companyShowcase.categories.all")}
                <span>{companyProducts.length}</span>
              </button>
              {categoryChips.map((chip) => (
                <button
                  type="button"
                  key={chip.name}
                  className={selectedCategory === chip.name ? "is-active" : ""}
                  aria-pressed={selectedCategory === chip.name}
                  onClick={() => chooseCategory(chip.name)}
                >
                  {chip.name}
                  <span>{chip.count}</span>
                </button>
              ))}
            </div>
          )}

          {!loadingProducts && !loadError && <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="showcase-product-card" key={product.id}>
                <div
                  className={`showcase-product-card__image${product.image ? " is-zoomable" : ""}`}
                  {...(product.image && {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": t("companyShowcase.product.zoomImage", { product: product.name }),
                    onClick: () => setZoomProduct(product),
                    onKeyDown: (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setZoomProduct(product);
                      }
                    },
                  })}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name || t("companyShowcase.fallbacks.productName")} />
                  ) : (
                    <div className="showcase-product-card__image-fallback" role="img" aria-label={t("companyShowcase.fallbacks.imageUnavailable")}>
                      <FaImage />
                      <span>{t("companyShowcase.fallbacks.imageUnavailable")}</span>
                    </div>
                  )}
                  {/* Internal category id and product code are kept in the
                      product data (search, orders, WhatsApp message) but are
                      not shown to the customer. */}
                  {product.allowsBooking && (
                    <em>
                      <FaCalendarCheck />
                      {t("companyShowcase.product.bookingAvailable")}
                    </em>
                  )}
                </div>

                <div className="showcase-product-card__content">
                  <div>
                    <h3>{product.name || t("companyShowcase.fallbacks.productName")}</h3>
                    <p>{product.description || t("companyShowcase.fallbacks.productDescription")}</p>
                  </div>
                  <strong className="showcase-product-card__price">
                    {formatPrice(product.price, product.currencySymbol)}
                  </strong>
                </div>

                {renderProductActions(product)}
              </article>
            ))}
          </div>}

          {loadingProducts && (
            <div className="showcase-empty" role="status">
              <span className="showcase-loading-dot" aria-hidden="true" />
              <h3>{t("companyShowcase.products.loadingTitle")}</h3>
              <p>{t("companyShowcase.products.loadingDescription")}</p>
            </div>
          )}

          {!loadingProducts && loadError && (
            <div className="showcase-empty showcase-empty--error" role="alert">
              <FaStore />
              <h3>{t("companyShowcase.products.errorTitle")}</h3>
              <p>{t("companyShowcase.products.errorDescription")}</p>
            </div>
          )}

          {!loadingProducts && !loadError && !visibleProducts.length && (
            <div className="showcase-empty">
              <FaMagnifyingGlass />
              <h3>{t("companyShowcase.products.emptyTitle")}</h3>
              <p>{t("companyShowcase.products.emptyDescription")}</p>
            </div>
          )}

          {!loadingProducts && !loadError && filteredProducts.length > 0 && (
            <nav className="showcase-pagination" aria-label={t("companyShowcase.pagination.label")}>
              <p>
                {t("companyShowcase.pagination.summary", {
                  start: firstResult + 1,
                  end: Math.min(
                    firstResult + PRODUCTS_PER_PAGE,
                    filteredProducts.length,
                  ),
                  total: filteredProducts.length,
                })}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  aria-label={t("companyShowcase.pagination.previous")}
                >
                  <FaArrowLeft />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      type="button"
                      key={page}
                      className={page === safePage ? "is-active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safePage === totalPages}
                  aria-label={t("companyShowcase.pagination.next")}
                >
                  <FaArrowRight />
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>

      {zoomProduct && (
        <ProductZoomDialog
          product={zoomProduct}
          priceText={formatPrice(zoomProduct.price, zoomProduct.currencySymbol)}
          bookingText={t("companyShowcase.product.bookingAvailable")}
          closeText={t("companyShowcase.actions.close")}
          brandColor={company.brandColor}
          actions={renderProductActions(zoomProduct, "zoom")}
          onClose={() => setZoomProduct(null)}
        />
      )}

      {showCart && (
        <div className="showcase-overlay" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button type="button" className="showcase-overlay__backdrop" onClick={closeCart} aria-label={t("companyShowcase.actions.close")} />
          <aside className="showcase-cart">
            <header>
              <div>
                <span><HiShoppingCart /></span>
                <div>
                  <h2 id="cart-title">{t("companyShowcase.cart.title")}</h2>
                  <p>{t("companyShowcase.cart.itemCount", { count: cartQuantity })}</p>
                </div>
              </div>
              <button type="button" onClick={closeCart} aria-label={t("companyShowcase.actions.close")}>
                <FaXmark />
              </button>
            </header>

            <div className="showcase-cart__body">
              {!cartItems.length && (
                <div className="showcase-cart__empty">
                  <HiShoppingCart />
                  <h3>{t("companyShowcase.cart.emptyTitle")}</h3>
                  <p>{t("companyShowcase.cart.emptyDescription")}</p>
                </div>
              )}

              {cartItems.length > 0 && checkoutMode === null && (
                <>
                  <div className="cart-lines">
                    {cartItems.map(({ product, quantity }) => (
                      <article key={product.id}>
                        {product.image ? (
                          <button
                            type="button"
                            className="cart-line__zoom"
                            onClick={() => setZoomProduct(product)}
                            aria-label={t("companyShowcase.product.zoomImage", { product: product.name })}
                          >
                            <img src={product.image} alt="" />
                          </button>
                        ) : (
                          <img src={product.image} alt="" />
                        )}
                        <div>
                          <strong>{product.name}</strong>
                          <span>{formatPrice(product.price, product.currencySymbol)}</span>
                        </div>
                        <div className="quantity-control">
                          <button type="button" onClick={() => changeQuantity(product.id, -1)}><FaMinus /></button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => changeQuantity(product.id, 1)}><FaPlus /></button>
                        </div>
                        <button
                          type="button"
                          className="cart-line__remove"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={t("companyShowcase.cart.remove", { product: product.name })}
                        >
                          <FaTrash />
                        </button>
                      </article>
                    ))}
                  </div>

                  <section className="checkout-choice">
                    <div className="cart-total">
                      <span>{t("companyShowcase.cart.subtotal")}</span>
                      <strong>{formatPrice(cartTotal, cartCurrencySymbol)}</strong>
                    </div>
                    {!acceptingOrders ? (
                      <p className="showcase-closed-note" role="status">{notTakingOrdersText}</p>
                    ) : (
                    <>
                    <p>{t("companyShowcase.cart.checkoutDescription")}</p>

                    <button
                      type="button"
                      className="showcase-button showcase-button--primary"
                      onClick={openAccountCheckout}
                    >
                      <FaRightToBracket />
                      {authText(mockUser ? "continueAccount" : "signIn")}
                    </button>
                    <button
                      type="button"
                      className="showcase-button showcase-button--secondary"
                      onClick={openGuestCheckout}
                    >
                      <FaCircleUser />
                      {t("companyShowcase.checkout.continueAsGuest")}
                    </button>
                    </>
                    )}
                  </section>
                </>
              )}

              {checkoutMode === "guest" && (
                <form className="showcase-form" onSubmit={submitGuestOrder}>
                  <div className="showcase-form__heading">
                    <button type="button" onClick={() => setCheckoutMode(null)}><FaArrowLeft /></button>
                    <div>
                      <h3>{t("companyShowcase.checkout.guestTitle")}</h3>
                      <p>{t("companyShowcase.checkout.guestDescription")}</p>
                    </div>
                  </div>

                  <label>
                    <span>{t("companyShowcase.form.name")}</span>
                    <div className="showcase-field"><FaUser /><input name="name" value={guestForm.name} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.phone")}</span>
                    <div className="showcase-field"><FaPhone /><input name="phone" value={guestForm.phone} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.email")}</span>
                    <div className="showcase-field"><FaEnvelope /><input type="email" name="email" value={guestForm.email} onChange={updateGuestForm} required /></div>
                  </label>
                  <label className="showcase-delivery-check">
                    <input
                      type="checkbox"
                      name="needsDelivery"
                      checked={guestForm.needsDelivery}
                      onChange={(event) =>
                        setGuestForm((current) => ({
                          ...current,
                          needsDelivery: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {t("companyShowcase.form.needsDelivery", {
                        defaultValue: "I need delivery (otherwise I will pick it up)",
                      })}
                    </span>
                  </label>

                  {guestForm.needsDelivery ? (
                    <>
                      <label>
                        <span>{t("companyShowcase.form.address")}</span>
                        <div className="showcase-field"><FaLocationDot /><input name="address" value={guestForm.address} onChange={updateGuestForm} required={guestForm.needsDelivery && !guestForm.location} /></div>
                      </label>
                      <GuestLocationPicker
                        value={guestForm.location}
                        onChange={(location) => setGuestForm((current) => ({ ...current, location }))}
                        t={t}
                        locale={locale}
                        disabled={guestSaving}
                      />
                    </>
                  ) : (
                    <p className="showcase-pickup-note">
                      {t("companyShowcase.form.pickupNote", {
                        defaultValue: "You chose pickup: you will collect the order at the company.",
                      })}
                    </p>
                  )}
                  <label>
                    <span>{t("companyShowcase.form.preferredContact")}</span>
                    <select name="preferredContact" value={guestForm.preferredContact} onChange={updateGuestForm}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="messenger">Messenger</option>
                      <option value="social">
                        {t("companyShowcase.form.socialOption", { defaultValue: "Social network" })}
                      </option>
                      <option value="email">{t("companyShowcase.form.emailOption")}</option>
                      <option value="phone">{t("companyShowcase.form.phoneOption")}</option>
                    </select>
                  </label>

                  {/* Dynamic contact-value field, based on the chosen method. */}
                  <label>
                    <span>
                      {guestForm.preferredContact === "email"
                        ? t("companyShowcase.form.contactEmail", { defaultValue: "Add your email" })
                        : guestForm.preferredContact === "messenger" ||
                          guestForm.preferredContact === "social"
                        ? t("companyShowcase.form.contactSocial", { defaultValue: "Add your social network link" })
                        : t("companyShowcase.form.contactPhone", { defaultValue: "Add your cellphone" })}
                    </span>
                    <div className="showcase-field">
                      {guestForm.preferredContact === "email" ? (
                        <FaEnvelope />
                      ) : guestForm.preferredContact === "messenger" ||
                        guestForm.preferredContact === "social" ? (
                        <FaLink />
                      ) : (
                        <FaPhone />
                      )}
                      <input
                        type={guestForm.preferredContact === "email" ? "email" : "text"}
                        name="contactValue"
                        value={guestForm.contactValue}
                        onChange={updateGuestForm}
                        placeholder={
                          guestForm.preferredContact === "email"
                            ? "name@example.com"
                            : guestForm.preferredContact === "messenger" ||
                              guestForm.preferredContact === "social"
                            ? "https://..."
                            : "+506 8888 7777"
                        }
                        required
                      />
                    </div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.notes")}</span>
                    <textarea name="notes" rows="3" value={guestForm.notes} onChange={updateGuestForm} placeholder={t("companyShowcase.form.notesPlaceholder")} />
                  </label>
                  {legalNotice}
                  <CaptchaWidget captcha={orderCaptcha} language={locale} />
                  {orderCaptcha.loadError && <p className="showcase-form__hint">{captchaPendingText}</p>}
                  <button type="submit" className="showcase-button showcase-button--primary" disabled={guestSaving}>
                    <FaCheck />
                    {guestSaving
                      ? t("companyShowcase.checkout.sending", { defaultValue: "Sending..." })
                      : t("companyShowcase.checkout.submitGuestOrder")}
                  </button>
                </form>
              )}

              {checkoutMode === "account" && mockUser && (
                <form className="showcase-form" onSubmit={submitAccountOrder}>
                  <div className="showcase-form__heading">
                    <button type="button" onClick={() => setCheckoutMode(null)} aria-label={authText("backToCart")}><FaArrowLeft /></button>
                    <div>
                      <h3 ref={accountReviewRef} tabIndex={-1}>{authText("reviewOrder")}</h3>
                      <p className="showcase-account-email">{mockUser.email}</p>
                    </div>
                  </div>

                  {/* Same fields as the guest form (the user reference is added
                      on the server from the session). */}
                  <label>
                    <span>{t("companyShowcase.form.name")}</span>
                    <div className="showcase-field"><FaUser /><input name="name" value={guestForm.name} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.phone")}</span>
                    <div className="showcase-field"><FaPhone /><input name="phone" value={guestForm.phone} onChange={updateGuestForm} required /></div>
                  </label>

                  <label className="showcase-delivery-check">
                    <input
                      type="checkbox"
                      name="needsDelivery"
                      checked={guestForm.needsDelivery}
                      onChange={(event) =>
                        setGuestForm((current) => ({
                          ...current,
                          needsDelivery: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {t("companyShowcase.form.needsDelivery", {
                        defaultValue: "I need delivery (otherwise I will pick it up)",
                      })}
                    </span>
                  </label>

                  {guestForm.needsDelivery ? (
                    <>
                      <label>
                        <span>{t("companyShowcase.form.address")}</span>
                        <div className="showcase-field"><FaLocationDot /><input name="address" value={guestForm.address} onChange={updateGuestForm} required={guestForm.needsDelivery && !guestForm.location} /></div>
                      </label>
                      <GuestLocationPicker
                        value={guestForm.location}
                        onChange={(location) => setGuestForm((current) => ({ ...current, location }))}
                        t={t}
                        locale={locale}
                        disabled={guestSaving}
                      />
                    </>
                  ) : (
                    <p className="showcase-pickup-note">
                      {t("companyShowcase.form.pickupNote", {
                        defaultValue: "You chose pickup: you will collect the order at the company.",
                      })}
                    </p>
                  )}

                  <label>
                    <span>{t("companyShowcase.form.preferredContact")}</span>
                    <select name="preferredContact" value={guestForm.preferredContact} onChange={updateGuestForm}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="messenger">Messenger</option>
                      <option value="social">
                        {t("companyShowcase.form.socialOption", { defaultValue: "Social network" })}
                      </option>
                      <option value="email">{t("companyShowcase.form.emailOption")}</option>
                      <option value="phone">{t("companyShowcase.form.phoneOption")}</option>
                    </select>
                  </label>

                  <label>
                    <span>
                      {guestForm.preferredContact === "email"
                        ? t("companyShowcase.form.contactEmail", { defaultValue: "Add your email" })
                        : guestForm.preferredContact === "messenger" ||
                          guestForm.preferredContact === "social"
                        ? t("companyShowcase.form.contactSocial", { defaultValue: "Add your social network link" })
                        : t("companyShowcase.form.contactPhone", { defaultValue: "Add your cellphone" })}
                    </span>
                    <div className="showcase-field">
                      {guestForm.preferredContact === "email" ? (
                        <FaEnvelope />
                      ) : guestForm.preferredContact === "messenger" ||
                        guestForm.preferredContact === "social" ? (
                        <FaLink />
                      ) : (
                        <FaPhone />
                      )}
                      <input
                        type={guestForm.preferredContact === "email" ? "email" : "text"}
                        name="contactValue"
                        value={guestForm.contactValue}
                        onChange={updateGuestForm}
                        placeholder={
                          guestForm.preferredContact === "email"
                            ? "name@example.com"
                            : guestForm.preferredContact === "messenger" ||
                              guestForm.preferredContact === "social"
                            ? "https://..."
                            : "+506 8888 7777"
                        }
                        required
                      />
                    </div>
                  </label>

                  <label>
                    <span>{t("companyShowcase.form.notes")}</span>
                    <textarea name="notes" rows="3" value={guestForm.notes} onChange={updateGuestForm} placeholder={t("companyShowcase.form.notesPlaceholder")} />
                  </label>

                  <ul className="showcase-account-items">
                    {cartItems.map((item) => (
                      <li key={item.product.id}>
                        <span>{item.product.name} × {item.quantity}</span>
                        <strong>{formatPrice(item.product.price * item.quantity, item.product.currencySymbol)}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="cart-total">
                    <span>{t("companyShowcase.cart.subtotal")}</span>
                    <strong>{formatPrice(cartTotal, cartCurrencySymbol)}</strong>
                  </div>

                  {legalNotice}
                  <CaptchaWidget captcha={orderCaptcha} language={locale} />
                  {orderCaptcha.loadError && <p className="showcase-form__hint">{captchaPendingText}</p>}
                  <button type="submit" className="showcase-button showcase-button--primary" disabled={guestSaving}>
                    <FaCheck />
                    {guestSaving
                      ? t("companyShowcase.checkout.sending", { defaultValue: "Sending..." })
                      : t("companyShowcase.checkout.submitGuestOrder")}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      )}

      {authOrigin && (
        <ShowcaseAuthDialog
          user={mockUser}
          text={authText}
          brandColor={company.brandColor}
          onClose={() => setAuthOrigin(null)}
          onComplete={(user) => {
            setMockUser(user);
            if (authOrigin === "checkout") setCheckoutMode("account");
            setAuthOrigin(null);
          }}
          onSignOut={async () => {
            await firebaseSignOut();
            await showcaseLoginService.logout();
            setMockUser(null);
            setAuthOrigin(null);
            setShowMyRequests(false);
            if (checkoutMode === "account") setCheckoutMode(null);
          }}
          onOpenMyRequests={() => {
            setAuthOrigin(null);
            setShowMyRequests(true);
          }}
        />
      )}

      {showMyRequests && mockUser && (
        <MyRequests
          t={t}
          locale={locale}
          companyKey={companySlug}
          formatPrice={formatPrice}
          onClose={() => setShowMyRequests(false)}
        />
      )}

      {bookingProduct && (
        <div className="showcase-overlay showcase-overlay--center" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button type="button" className="showcase-overlay__backdrop" onClick={closeBooking} aria-label={t("companyShowcase.actions.close")} />
          <form
            className="booking-dialog"
            onSubmit={submitBooking}
            ref={bookingDialogRef}
            onScroll={(event) => setBookingShowTop(event.currentTarget.scrollTop > 280)}
          >
            <header>
              <div>
                <span><FaCalendarCheck /></span>
                <div>
                  <p>{bookingProduct.name}</p>
                  <h2 id="booking-title">{t("companyShowcase.booking.title")}</h2>
                </div>
              </div>
              <button type="button" onClick={closeBooking} aria-label={t("companyShowcase.actions.close")}><FaXmark /></button>
            </header>

            <div className="booking-dialog__body">
              <p className="booking-dialog__intro">
                {t("companyShowcase.booking.description")}
              </p>
              <div className="booking-form-grid">
                <div className="booking-form-grid__full booking-calendar-block">
                  <span className="booking-field-label">
                    {t("companyShowcase.booking.preferredDate", { defaultValue: "Choose a date" })}
                  </span>

                  <div className="booking-calendar">
                    <div className="booking-calendar__header">
                      <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                        <FaArrowLeft />
                      </button>
                      <strong>
                        {calendarMonth.toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>
                      <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
                        <FaArrowRight />
                      </button>
                    </div>

                    <div className="booking-calendar__grid">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={`wd-${i}`} className="booking-calendar__weekday">{d}</span>
                      ))}
                      {calendarDays.map((day, index) => {
                        if (!day) return <span key={`empty-${index}`} />;
                        const key = `${calendarMonth.getFullYear()}-${String(
                          calendarMonth.getMonth() + 1,
                        ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isPast = key < todayKey;
                        const isSelected = bookingForm.preferredDate === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={[
                              "booking-calendar__day",
                              isSelected ? "is-selected" : "",
                              isPast ? "is-past" : "",
                            ].filter(Boolean).join(" ")}
                            onClick={() => pickCalendarDay(day)}
                            disabled={isPast}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slots for the chosen date */}
                  {bookingForm.preferredDate && (
                    <div className="booking-slots" ref={bookingSlotsRef}>
                      <span className="booking-field-label">
                        {t("companyShowcase.booking.availableSlots", { defaultValue: "Available times" })}
                      </span>

                      {slotTakenNotice && (
                        <p className="booking-slots__hint booking-slots__hint--error" role="alert">{slotTakenNotice}</p>
                      )}

                      {slotsLoading ? (
                        <p className="booking-slots__hint">
                          {t("companyShowcase.booking.loadingSlots", { defaultValue: "Loading times..." })}
                        </p>
                      ) : slotsError ? (
                        <p className="booking-slots__hint booking-slots__hint--error">{slotsError}</p>
                      ) : daySlots.length === 0 ? (
                        <p className="booking-slots__hint">
                          {t("companyShowcase.booking.noSlots", { defaultValue: "No times available for this date." })}
                        </p>
                      ) : (
                        renderSlotGroups()
                      )}

                      {slotsZoneInfo && (
                        <p className="booking-slots__zone">
                          {t("companyShowcase.booking.timesShownIn", {
                            defaultValue: "Times shown in: {{zone}} ({{offset}}).",
                            zone: slotsZoneInfo.zoneName,
                            offset: slotsZoneInfo.offset,
                          })}
                          {slotsZoneInfo.differentZone &&
                            ` ${t("companyShowcase.booking.otherZoneHint", {
                              defaultValue: "Your device is in another time zone: each time also shows your time.",
                            })}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Your information (2026-11-08): last part of the form. After a
                  time is chosen the window scrolls here ("Your choice" on top). */}
              <section className="booking-info" ref={bookingInfoRef} aria-labelledby="booking-info-title">
                {selectedSlot && bookingForm.preferredDate && (
                  <div className="booking-choice" ref={bookingChoiceRef} role="status" aria-live="polite">
                    <FaCalendarCheck aria-hidden="true" />
                    <div>
                      <strong>{t("companyShowcase.booking.yourChoice", { defaultValue: "Your choice" })}</strong>
                      <p>
                        {choiceWhenText(bookingForm.preferredDate, selectedSlot)}
                      </p>
                      {selectedSlot.locationName && (
                        <p className="booking-choice__place">
                          <FaLocationDot aria-hidden="true" />
                          {[selectedSlot.locationName, selectedSlot.locationAddress].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <small>
                        {t("companyShowcase.booking.changeChoice", {
                          defaultValue: "To change it, pick another date or time above.",
                        })}
                      </small>
                    </div>
                  </div>
                )}
                <h3 id="booking-info-title" className="booking-info__title">
                  {t("companyShowcase.booking.yourInfo", { defaultValue: "Your information" })}
                </h3>
                <div className="booking-form-grid">
                  <label>
                    <span>{t("companyShowcase.form.name")}</span>
                    <input name="name" value={bookingForm.name} onChange={updateBookingForm} required />
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.phone")}</span>
                    <input name="phone" value={bookingForm.phone} onChange={updateBookingForm} required />
                  </label>
                  <label className="booking-form-grid__full">
                    <span>{t("companyShowcase.form.email")}</span>
                    <input type="email" name="email" value={bookingForm.email} onChange={updateBookingForm} required />
                  </label>

                  <label>
                    <span>
                      {t("companyShowcase.form.preferredContact", { defaultValue: "Preferred contact" })}
                    </span>
                    <select name="preferredContact" value={bookingForm.preferredContact} onChange={updateBookingForm}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">{t("companyShowcase.form.phoneOption", { defaultValue: "Phone call" })}</option>
                      <option value="messenger">Messenger</option>
                      <option value="social">{t("companyShowcase.form.socialOption", { defaultValue: "Social network" })}</option>
                      <option value="email">{t("companyShowcase.form.emailOption", { defaultValue: "Email" })}</option>
                    </select>
                  </label>

                  <label>
                    <span>
                      {bookingForm.preferredContact === "email"
                        ? t("companyShowcase.form.contactEmail", { defaultValue: "Contact email" })
                        : bookingForm.preferredContact === "messenger" ||
                          bookingForm.preferredContact === "social"
                        ? t("companyShowcase.form.contactSocial", { defaultValue: "Profile / link" })
                        : t("companyShowcase.form.contactPhone", { defaultValue: "Contact number" })}
                    </span>
                    <input
                      type={bookingForm.preferredContact === "email" ? "email" : "text"}
                      name="contactValue"
                      value={bookingForm.contactValue}
                      onChange={updateBookingForm}
                      placeholder={
                        bookingForm.preferredContact === "email"
                          ? "name@example.com"
                          : bookingForm.preferredContact === "messenger" ||
                            bookingForm.preferredContact === "social"
                          ? "https://..."
                          : "+506 8888 7777"
                      }
                    />
                  </label>

                  <label className="booking-form-grid__full">
                    <span>{t("companyShowcase.form.notes")}</span>
                    <textarea name="notes" rows="4" value={bookingForm.notes} onChange={updateBookingForm} placeholder={t("companyShowcase.booking.notesPlaceholder")} />
                  </label>
                </div>
              </section>
            </div>

            {legalNotice && <div className="booking-legal">{legalNotice}</div>}
            <CaptchaWidget captcha={bookingCaptcha} language={locale} style={{ padding: "0 20px" }} />
            <footer>
              <button type="button" className="showcase-button showcase-button--secondary" onClick={closeBooking}>
                {t("companyShowcase.actions.cancel")}
              </button>
              <button type="submit" className="showcase-button showcase-button--primary" disabled={bookingSaving}>
                <FaCalendarCheck />
                {bookingSaving
                  ? t("companyShowcase.booking.sending", { defaultValue: "Sending..." })
                  : t("companyShowcase.booking.submit")}
              </button>
            </footer>
            {bookingShowTop && (
              <div className="booking-dialog__top-wrap">
                <button
                  type="button"
                  className="booking-dialog__top"
                  onClick={() => bookingDialogRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                  aria-label={t("companyShowcase.booking.backToTop", { defaultValue: "Back to top" })}
                  title={t("companyShowcase.booking.backToTop", { defaultValue: "Back to top" })}
                >
                  <FaArrowUp aria-hidden="true" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {hasLegalTexts && (
        <footer className="showcase-legal-footer">
          <span>{bannerName || company?.name || ""}</span>
          {legalLinks}
        </footer>
      )}

      <RequestSentDialog
        t={t}
        info={requestSent}
        companyName={bannerName || company?.name || ""}
        contact={{
          whatsapp: pageConfiguration?.contactWhatsapp,
          email: pageConfiguration?.contactEmail,
          socialLink: pageConfiguration?.socialLink,
          socialLinkType: pageConfiguration?.socialLinkType,
        }}
        onClose={closeRequestSent}
      />

      {/* AlephK (2026-10-25): small "Powered by Kuantum K" line. */}
      <PoweredBy label={t("brand.poweredBy", { defaultValue: "Powered by" })} />

      {legalDoc && (
        <ShowcaseLegalDialog
          title={legalDoc === "terms" ? legalLabel("terms", "Terms and conditions") : legalLabel("privacy", "Privacy policy")}
          body={legalDoc === "terms" ? termsText : privacyText}
          closeText={legalLabel("close", "Close")}
          brandColor={company?.brandColor}
          onClose={() => setLegalDoc(null)}
        />
      )}

      {/* The AI assistant is a plan feature: hidden when the company's plan
          does not include it (shao returns assistantEnabled: false). */}
      {pageConfiguration?.assistantEnabled !== false && (
      <ShowcaseAssistant
        t={t}
        locale={locale}
        companyId={company?.id || companySlug}
        companyName={bannerName || company?.name || ""}
        cart={cart}
        onAction={handleAssistantAction}
      />
      )}
    </main>
  );
}
