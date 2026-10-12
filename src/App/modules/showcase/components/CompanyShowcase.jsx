import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
// Install once in the frontend project: npm install leaflet@1.9.4
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HiShoppingCart } from "react-icons/hi";
import {
  FaApple,
  FaGoogle,
  FaFacebookF,
  FaMicrosoft,
  FaArrowLeft,
  FaArrowRight,
  FaCalendarCheck,
  FaCartPlus,
  FaCartShopping,
  FaCheck,
  FaChevronDown,
  FaCircleUser,
  FaEnvelope,
  FaFacebookMessenger,
  FaLink,
  FaLocationDot,
  FaImage,
  FaMagnifyingGlass,
  FaMinus,
  FaPhone,
  FaPlus,
  FaRightToBracket,
  FaStore,
  FaTrash,
  FaUser,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import "./CompanyShowcase.scss";
import { useParams } from "react-router-dom";
import ShowcaseService from "../services/ShowcaseService";
import { mapShowcaseItems } from "../services/showcaseMappers";
import BookingSlotsService from "../services/BookingSlotsService";
import AppointmentRequestService from "../services/AppointmentRequestService";
import WebOrderRequestService from "../services/WebOrderRequestService";
import ShowcaseLoginService from "../services/ShowcaseLoginService";
import {
  firebaseEmailLogin,
  firebaseEmailRegister,
  firebaseSocialLogin,
  firebaseSignOut,
} from "../services/showcaseFirebaseAuth";

const bookingSlotsService = new BookingSlotsService();
const appointmentRequestService = new AppointmentRequestService();
const webOrderRequestService = new WebOrderRequestService();
const showcaseLoginService = new ShowcaseLoginService();

const showcaseService = new ShowcaseService();

const SHOWCASE_HERO_IMAGE = "/assets/showcase-hero.png";


export const COMPANY_SHOWCASE_ROUTE = "/:companySlug";

// Replace these companies with a public company-profile service.
const MOCK_COMPANIES = [
  {
    id: "company-001",
    slug: "maderas-finas-cr",
    name: "Maderas Finas CR",
    shortDescription: "Handcrafted in Costa Rica",
    description: "Sustainable woods. Timeless craftsmanship.",
    brandColor: "#3459e6",
    accentColor: "#8a5a30",
    whatsappNumber: "50688887777",
    messengerHandle: "maderasfinascr",
    currency: "USD",
  },
  {
    id: "company-002",
    slug: "servicios-auto-cr",
    name: "Servicios Auto CR",
    shortDescription: "Automotive care you can trust",
    description: "Diagnostics, maintenance, and scheduled technical services.",
    brandColor: "#176b87",
    accentColor: "#e28a32",
    whatsappNumber: "50687776666",
    messengerHandle: "serviciosautocr",
    currency: "USD",
  },
];

// Replace this collection with a public product-search service.
const MOCK_PRODUCTS = [
  {
    id: "prd-001",
    companyId: "company-001",
    code: "WCB-3040",
    name: "Walnut Cutting Board",
    category: "Cutting boards",
    description: "Premium walnut with a smooth finish, designed for everyday use.",
    price: 75,
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-002",
    companyId: "company-001",
    code: "TMB-4050",
    name: "Teak and Maple End Grain Board",
    category: "Cutting boards",
    description: "End-grain construction with natural contrast and lasting durability.",
    price: 85,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-003",
    companyId: "company-001",
    code: "LES-3555",
    name: "Engraved Live Edge Serving Board",
    category: "Personalized products",
    description: "A live-edge serving board personalized with your name or company logo.",
    price: 90,
    image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-004",
    companyId: "company-001",
    code: "GCB-3050",
    name: "Guanacaste Cutting Board",
    category: "Cutting boards",
    description: "Strong native wood with a unique natural grain in every piece.",
    price: 65,
    image: "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-005",
    companyId: "company-001",
    code: "HWS-8018",
    name: "Handmade Wall Shelf",
    category: "Home furniture",
    description: "A compact solid-wood shelf with a warm finish and hidden supports.",
    price: 95,
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "svc-001",
    companyId: "company-001",
    code: "ENG-CUSTOM",
    name: "Custom Engraving Service",
    category: "Services",
    description: "Personalize wood pieces with names, logos, dates, or special designs.",
    price: null,
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: true,
  },
  {
    id: "prd-006",
    companyId: "company-001",
    code: "RST-4520",
    name: "Rustic Serving Tray",
    category: "Serving pieces",
    description: "A practical wooden tray with forged handles and a protective finish.",
    price: 55,
    image: "https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-007",
    companyId: "company-001",
    code: "CHB-5030",
    name: "Charcuterie Board",
    category: "Serving pieces",
    description: "An elegant board for cheese, fruit, appetizers, and special occasions.",
    price: 78,
    image: "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-008",
    companyId: "company-001",
    code: "DSK-11055",
    name: "Compact Writing Desk",
    category: "Home furniture",
    description: "A clean, compact solid-wood desk made for home offices and studios.",
    price: 260,
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-009",
    companyId: "company-001",
    code: "SGN-6040",
    name: "Personalized Wooden Sign",
    category: "Personalized products",
    description: "Custom carved signage for homes, offices, restaurants, and events.",
    price: 70,
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-010",
    companyId: "company-001",
    code: "KNF-4530",
    name: "Magnetic Knife Holder",
    category: "Kitchen accessories",
    description: "A wall-mounted solid-wood holder with concealed high-strength magnets.",
    price: 48,
    image: "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-011",
    companyId: "company-001",
    code: "SRV-SET4",
    name: "Four-Piece Serving Set",
    category: "Serving pieces",
    description: "A coordinated handmade set for family gatherings and celebrations.",
    price: 110,
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "svc-002",
    companyId: "company-001",
    code: "RESTORE-01",
    name: "Wood Restoration Assessment",
    category: "Services",
    description: "Book an evaluation for furniture repairs, refinishing, or restoration.",
    price: null,
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "svc-003",
    companyId: "company-001",
    code: "CONSULT-01",
    name: "Custom Furniture Consultation",
    category: "Services",
    description: "Discuss measurements, materials, design options, and delivery expectations.",
    price: null,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "auto-001",
    companyId: "company-002",
    code: "DIAG-01",
    name: "Vehicle Diagnostic",
    category: "Diagnostics",
    description: "Initial inspection and computerized diagnostic for your vehicle.",
    price: 45,
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "auto-002",
    companyId: "company-002",
    code: "OIL-01",
    name: "Oil Change Service",
    category: "Maintenance",
    description: "Scheduled oil and filter replacement with a basic safety inspection.",
    price: 65,
    image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
];

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
    demo: "Demo only. Use sample details; no real account is created.",
    signedIn: "Signed in (demo)",
    sessionHint: "This preview session ends when you refresh the page.",
    email: "Email", password: "Password", confirmPassword: "Confirm password",
    passwordHint: "Use at least 8 characters.",
    mismatch: "The passwords do not match.",
    continueWith: "Or continue with", providerAction: "Continue with",
    noAccount: "Don’t have an account?", hasAccount: "Already have an account?",
    signOut: "Sign out", close: "Close account dialog",
    continueAccount: "Continue with my account", reviewOrder: "Review your order",
    orderDemo: "Demo checkout only. No real order will be sent.",
    placeDemoOrder: "Place order (demo)", backToCart: "Back to cart",
    demoOrderComplete: "Demo order completed. No real order was sent.",
  },
  es: {
    signIn: "Iniciar sesión", register: "Crear cuenta",
    loginTitle: "Iniciar sesión", registerTitle: "Crear cuenta",
    loginSubtitle: "Te damos la bienvenida. Ingresa tus datos.",
    registerSubtitle: "Una cuenta para comprar en toda la plataforma.",
    account: "Tu cuenta",
    demo: "Solo demostración. Usa datos de ejemplo; no se crea una cuenta real.",
    signedIn: "Sesión iniciada (demo)",
    sessionHint: "Esta sesión de prueba termina al recargar la página.",
    email: "Correo electrónico", password: "Contraseña", confirmPassword: "Confirmar contraseña",
    passwordHint: "Usa al menos 8 caracteres.",
    mismatch: "Las contraseñas no coinciden.",
    continueWith: "O continúa con", providerAction: "Continuar con",
    noAccount: "¿No tienes una cuenta?", hasAccount: "¿Ya tienes una cuenta?",
    signOut: "Cerrar sesión", close: "Cerrar ventana de cuenta",
    continueAccount: "Continuar con mi cuenta", reviewOrder: "Revisa tu pedido",
    orderDemo: "Compra de demostración. No se enviará ningún pedido real.",
    placeDemoOrder: "Realizar pedido (demo)", backToCart: "Volver al carrito",
    demoOrderComplete: "Pedido de demostración completado. No se envió ningún pedido real.",
  },
};

const MOCK_AUTH_PROVIDERS = [
  { id: "google", label: "Google", Icon: FaGoogle },
  { id: "facebook", label: "Facebook", Icon: FaFacebookF },
  { id: "microsoft", label: "Microsoft", Icon: FaMicrosoft },
  { id: "apple", label: "Apple", Icon: FaApple },
];

export function ShowcaseAuthDialog({ user, text, brandColor, onClose, onComplete, onSignOut }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [errorKey, setErrorKey] = useState("");
  const dialogRef = useRef(null);
  const titleId = useId();
  const demoId = useId();
  const passwordHintId = useId();
  const registering = mode === "register";

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
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
  };

  const updateForm = (event) => {
    const { name, value } = event.target;
    setErrorKey("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  // Real email/password auth against Firebase, then the backend /login (or
  // /createuser first when registering). The backend sets the session cookie.
  const submitAuth = async (event) => {
    event.preventDefault();
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
      aria-describedby={demoId}
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
            <p>{text("sessionHint")}</p>
            <button type="button" className="showcase-auth__submit" onClick={onSignOut}>{text("signOut")}</button>
          </div>
        ) : (
          <>
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
              <button type="submit" className="showcase-auth__submit" disabled={authBusy}>
                {authBusy ? "..." : text(registering ? "register" : "signIn")}
              </button>
            </form>
            <div className="showcase-auth__divider"><span>{text("continueWith")}</span></div>
            <div className="showcase-auth__providers" role="group" aria-label={text("continueWith")}>
              {MOCK_AUTH_PROVIDERS.map(({ id, label, Icon }) => (
                <button key={id} type="button" aria-label={`${text("providerAction")} ${label}`}
                  disabled={authBusy}
                  onClick={() => handleSocial(id)}>
                  <Icon aria-hidden="true" /><span>{label}</span>
                </button>
              ))}
            </div>
            <p className="showcase-auth__switch">
              {text(registering ? "hasAccount" : "noAccount")}{" "}
              <button type="button" onClick={() => changeMode(registering ? "login" : "register")}>
                {text(registering ? "signIn" : "register")}
              </button>
            </p>
          </>
        )}
        <p className="showcase-auth__demo" id={demoId}>{text("demo")}</p>
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

export default function CompanyShowcase({ t, locale = "en-US" }) {
  const routeParams = useParams();
  const [companySlug] = useState(
    () =>
      (routeParams?.companySlug || "").trim() || resolveCompanySlugFromPath(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [contactProductId, setContactProductId] = useState(null);
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
  const [daySlots, setDaySlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [guestSaving, setGuestSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [remoteProducts, setRemoteProducts] = useState([]);
  const [remoteCompany, setRemoteCompany] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState("");

  const matchedCompany =
    MOCK_COMPANIES.find((item) => item.slug === companySlug) || null;

  // The route value is the companyId (public link is {base}/showcase/{companyId}).
  // Keep mock branding when it matches; otherwise build a generic company so the
  // public page renders with the real products. A public company-info endpoint
  // can replace this fallback later.
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
    matchedCompany ||
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

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return companyProducts;

    return companyProducts.filter((product) =>
      `${product.name} ${product.description} ${product.code}`
        .toLowerCase()
        .includes(term),
    );
  }, [companyProducts, searchTerm]);

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

  const bookingProduct =
    companyProducts.find((product) => product.id === bookingProductId) || null;

  const formatPrice = (price) => {
    if (price === null || price === undefined) {
      return t("companyShowcase.product.customQuote");
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: company?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);
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

    setGuestSaving(true);
    try {
      const response = await webOrderRequestService.createWebOrder({
        companyId,
        order,
      });
      const code =
        response?.result?.requestCode ||
        response?.result?.request_code ||
        "";
      setCart([]);
      setShowCart(false);
      setCheckoutMode(null);
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
        error?.message ||
          t("companyShowcase.messages.orderError", {
            defaultValue: "Your order could not be sent. Please try again.",
          }),
      );
    } finally {
      setGuestSaving(false);
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

    setGuestSaving(true);
    try {
      const response = await webOrderRequestService.createWebOrder({
        companyId,
        order,
      });
      const code =
        response?.result?.requestCode ||
        response?.result?.request_code ||
        "";
      setCart([]);
      setShowCart(false);
      setCheckoutMode(null);
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
        error?.message ||
          t("companyShowcase.messages.orderError", {
            defaultValue: "Your order could not be sent. Please try again.",
          }),
      );
    } finally {
      setGuestSaving(false);
    }
  };

  const openBooking = (product) => {
    setBookingProductId(product.id);
    setBookingForm(EMPTY_BOOKING_FORM);
    setSelectedSlotKey("");
    setSelectedSlot(null);
    setDaySlots([]);
    setSlotsError("");
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setContactProductId(null);
    setNotice("");
  };

  const closeBooking = () => {
    setBookingProductId(null);
    setBookingForm(EMPTY_BOOKING_FORM);
    setSelectedSlotKey("");
    setSelectedSlot(null);
    setDaySlots([]);
    setSlotsError("");
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
  }, [bookingProductIdForSlots, bookingForm.preferredDate, companyIdForSlots]);

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

  const todayKey = (() => {
    const n = new Date();
    return toDateKey(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  const pickCalendarDay = (day) => {
    if (!day) return;
    const key = toDateKey(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    if (key < todayKey) return; // no past dates
    setBookingForm((current) => ({ ...current, preferredDate: key }));
  };

  const moveMonth = (delta) => {
    setCalendarMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };

  const selectSlot = (slot) => {
    const key = `${slot.startTime}-${slot.endTime}`;
    setSelectedSlotKey(key);
    setSelectedSlot(slot);
    setBookingForm((current) => ({
      ...current,
      preferredTime: slot.allDay ? "" : slot.startTime,
    }));
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
      comments:
        `Preferred contact: ${bookingForm.preferredContact}. ` +
        (bookingForm.notes || ""),
    };

    setBookingSaving(true);
    setSlotsError("");
    try {
      const response = await appointmentRequestService.createRequest({
        companyId,
        request,
      });
      const reference =
        response?.result?.appointmentId ||
        response?.result?.appointment_id ||
        buildReference("BKG");
      setNotice(
        t("companyShowcase.messages.bookingCreated", {
          defaultValue:
            "Your booking request was sent. Reference: {reference}. The company will confirm it.",
          reference,
          service: bookingProduct.name,
        }).replace("{reference}", String(reference)),
      );
      closeBooking();
    } catch (error) {
      console.error("Error sending booking request:", error);
      setSlotsError(
        error?.message ||
          t("companyShowcase.booking.submitError", {
            defaultValue: "Your request could not be sent. Please try again.",
          }),
      );
    } finally {
      setBookingSaving(false);
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

  // A product has WhatsApp if it carries a contact phone; Messenger if it
  // carries a messenger link. The buttons are enabled accordingly.
  const productWhatsappNumber = (product) =>
    String(product?.webContactPhone || "").replace(/[^0-9]/g, "");

  const productMessengerLink = (product) =>
    String(product?.webMessengerLink || "").trim();

  const hasWhatsapp = (product) => productWhatsappNumber(product).length > 0;
  const hasMessenger = (product) => productMessengerLink(product).length > 0;

  // WhatsApp deep link using the PRODUCT'S own phone (empty if none).
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

  // Messenger link using the PRODUCT'S own link (empty if none).
  const messengerUrl = (product) => productMessengerLink(product);

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
      }}
    >
      <header className="showcase-header">
        <a className="showcase-brand" href={`/showcase/${company.slug}`}>
          <span><FaStore /></span>
          <div>
            <strong>{t("companyShowcase.brandName")}</strong>
            <small>{t("companyShowcase.publicStore")}</small>
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
          className="showcase-company-banner"
          style={{ "--showcase-hero": `url(${SHOWCASE_HERO_IMAGE})` }}
        >
          <div className="showcase-company-banner__content">
            <span className="showcase-company-banner__eyebrow">
              <FaCheck /> {t("companyShowcase.verifiedCompany")}
            </span>
            <h1>{company.name}</h1>
            <p>{company.shortDescription || company.description || t("companyShowcase.fallbacks.companyDescription")}</p>
            <a href="#showcase-products" className="showcase-company-banner__cta">
              {t("companyShowcase.actions.explore")}
              <FaArrowRight />
            </a>
          </div>
        </section>

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

          {!loadingProducts && !loadError && <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="showcase-product-card" key={product.id}>
                <div className="showcase-product-card__image">
                  {product.image ? (
                    <img src={product.image} alt={product.name || t("companyShowcase.fallbacks.productName")} />
                  ) : (
                    <div className="showcase-product-card__image-fallback" role="img" aria-label={t("companyShowcase.fallbacks.imageUnavailable")}>
                      <FaImage />
                      <span>{t("companyShowcase.fallbacks.imageUnavailable")}</span>
                    </div>
                  )}
                  <span>{product.category || t("companyShowcase.fallbacks.category")}</span>
                  {product.allowsBooking && (
                    <em>
                      <FaCalendarCheck />
                      {t("companyShowcase.product.bookingAvailable")}
                    </em>
                  )}
                </div>

                <div className="showcase-product-card__content">
                  <div>
                    <small>{product.code || t("companyShowcase.fallbacks.code")}</small>
                    <h3>{product.name || t("companyShowcase.fallbacks.productName")}</h3>
                    <p>{product.description || t("companyShowcase.fallbacks.productDescription")}</p>
                  </div>
                  <strong className="showcase-product-card__price">
                    {formatPrice(product.price)}
                  </strong>
                </div>

                <div className="showcase-product-card__actions">
                  {product.allowsOnlineOrder && (
                    <button
                      type="button"
                      className="showcase-button showcase-button--primary"
                      onClick={() => addToCart(product)}
                    >
                      <FaCartPlus />
                      {t("companyShowcase.actions.orderHere")}
                    </button>
                  )}

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
                      <div className="contact-menu">
                        {/* WhatsApp: enabled only when the product has a phone. */}
                        {hasWhatsapp(product) ? (
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
                        ) : (
                          <span
                            className="contact-menu__item contact-menu__item--disabled"
                            aria-disabled="true"
                          >
                            <FaWhatsapp />
                            <span>
                              <strong>WhatsApp</strong>
                              <small>
                                {t("companyShowcase.contact.notAvailable", {
                                  defaultValue: "Not available",
                                })}
                              </small>
                            </span>
                          </span>
                        )}

                        {/* Messenger: enabled only when the product has a link. */}
                        {hasMessenger(product) ? (
                          <a href={messengerUrl(product)} target="_blank" rel="noreferrer">
                            <FaFacebookMessenger />
                            <span>
                              <strong>Messenger</strong>
                              <small>{t("companyShowcase.contact.externalChannel")}</small>
                            </span>
                          </a>
                        ) : (
                          <span
                            className="contact-menu__item contact-menu__item--disabled"
                            aria-disabled="true"
                          >
                            <FaFacebookMessenger />
                            <span>
                              <strong>Messenger</strong>
                              <small>
                                {t("companyShowcase.contact.notAvailable", {
                                  defaultValue: "Not available",
                                })}
                              </small>
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {product.allowsBooking && (
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
                        <img src={product.image} alt="" />
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.code}</small>
                          <span>{formatPrice(product.price)}</span>
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
                      <strong>{formatPrice(cartTotal)}</strong>
                    </div>
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
                        <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="cart-total">
                    <span>{t("companyShowcase.cart.subtotal")}</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>

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
            if (checkoutMode === "account") setCheckoutMode(null);
          }}
        />
      )}

      {bookingProduct && (
        <div className="showcase-overlay showcase-overlay--center" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button type="button" className="showcase-overlay__backdrop" onClick={closeBooking} aria-label={t("companyShowcase.actions.close")} />
          <form className="booking-dialog" onSubmit={submitBooking}>
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
                    <div className="booking-slots">
                      <span className="booking-field-label">
                        {t("companyShowcase.booking.availableSlots", { defaultValue: "Available times" })}
                      </span>

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
                        <div className="booking-slots__list">
                          {daySlots.map((slot, i) => {
                            const key = `${slot.startTime}-${slot.endTime}`;
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
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <label className="booking-form-grid__full">
                  <span>{t("companyShowcase.form.notes")}</span>
                  <textarea name="notes" rows="4" value={bookingForm.notes} onChange={updateBookingForm} placeholder={t("companyShowcase.booking.notesPlaceholder")} />
                </label>
              </div>
            </div>

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
          </form>
        </div>
      )}
    </main>
  );
}
