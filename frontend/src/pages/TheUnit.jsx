import { useEffect, useRef, useState } from "react";
import "./TheUnit.css";

const photo = (slug, name) => `/images/unit/${slug}-${name}`;

// DESIGN: display-only price (replace with accommodation.price when you pass it in)
const PRICE_PER_NIGHT = 2500;
const formatPrice = (n) => `₱${n.toLocaleString("en-PH")}`;

const AREAS = [
  { slug: "living-room", label: "Living room" },
  { slug: "bedroom", label: "Bedroom area" },
  { slug: "kitchen-dining", label: "Kitchen & dining" },
  { slug: "bathroom", label: "Bathroom" },
  { slug: "balcony", label: "Balcony" },
  { slug: "pool", label: "Pool area" },
].map((area) => ({
  ...area,
  main: photo(area.slug, "main-image"),
  images: [1, 2, 3, 4].map((n) => photo(area.slug, `sub-image-${n}`)),
}));

const icon = (path) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const HIGHLIGHTS = [
  {
    title: "Thoughtful design",
    text: "Warm, calm interiors",
    icon: icon(
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />,
    ),
  },
  {
    title: "Self check-in",
    text: "Easy arrival",
    icon: icon(
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l9-9M16 7l3 3" />
      </>,
    ),
  },
  {
    title: "Guest favorites",
    text: "Highly rated stays",
    icon: icon(
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
    ),
  },
];

const EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
// The option sitting inside the two lines is always the one being previewed.
// Slot 2 is the third of 6 rows, which is exactly where the lines are (see CSS).
const CENTER_SLOT = 2;
const ROTATE_MS = 700; // time between steps while the cursor stays on the top / bottom edge
const AUTO_MS = 6000; // how long each option stays inside the lines
const SLIDE_MS = 400; // matches the slide transition in the CSS
const CLICK_STEP_MS = 200; // speed of the slide when you click an option

// Remembers which extension worked for each photo, so re-rendering
// a photo doesn't probe the other extensions again.
const resolvedExt = new Map();

// Warms the cache so a previewed photo is ready the moment it slides in.
function preload(base) {
  if (resolvedExt.has(base)) return;
  const tryExt = (i) => {
    if (i >= EXTENSIONS.length) return;
    const img = new Image();
    img.onload = () => resolvedExt.set(base, i);
    img.onerror = () => tryExt(i + 1);
    img.src = `${base}.${EXTENSIONS[i]}`;
  };
  tryExt(0);
}

// Tries each extension in turn; if none exists it hides itself,
// so the grey placeholder shows instead of a broken image.
function Photo({ base, alt, className }) {
  const [extIndex, setExtIndex] = useState(resolvedExt.get(base) ?? 0);
  if (extIndex >= EXTENSIONS.length) return null;
  return (
    <img
      className={className}
      src={`${base}.${EXTENSIONS[extIndex]}`}
      alt={alt}
      loading="lazy"
      onLoad={() => resolvedExt.set(base, extIndex)}
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

export default function TheUnit() {
  // visual order of the area buttons (Living room starts inside the lines).
  // "wrapped" is the button that just jumped from one end to the other,
  // it skips its slide so it doesn't fly across the other options.
  const [wheel, setWheel] = useState({
    order: [4, 5, 0, 1, 2, 3],
    wrapped: null,
  });
  const { order, wrapped } = wheel;
  const [target, setTarget] = useState(null); // option clicked, wheel is sliding to it
  const [paused, setPaused] = useState(false); // cursor is on the options
  const [edge, setEdge] = useState(null); // "up" | "down" | null
  // small photo currently shown in the big image: { area, src } | null
  const [featured, setFeatured] = useState(null);

  // whichever option has landed inside the lines is the one shown in the previews
  // (it updates just after the slide finishes)
  const centerIndex = target ?? order[CENTER_SLOT];
  const [shownIndex, setShownIndex] = useState(centerIndex);
  useEffect(() => {
    const id = setTimeout(() => setShownIndex(centerIndex), SLIDE_MS * 0.8);
    return () => clearTimeout(id);
  }, [centerIndex]);
  const viewArea = AREAS[shownIndex];

  // The big image shows the hovered small photo and goes back when the cursor leaves it
  const showInMain = (src) => setFeatured({ area: shownIndex, src });
  // touch: tap a small photo to show it in the big image, tap it again to put it back
  const toggleInMain = (src) =>
    setFeatured((f) =>
      f && f.area === shownIndex && f.src === src
        ? null
        : { area: shownIndex, src },
    );
  const pointerType = useRef("mouse");

  // tapping / clicking anywhere except a small photo puts the big image back
  useEffect(() => {
    if (!featured) return;
    const away = (e) => {
      if (!e.target.closest(".unit__tile")) setFeatured(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [featured]);
  const mainSrc =
    featured && featured.area === shownIndex ? featured.src : viewArea.main;

  // one step of the wheel: "up" brings the next option into the lines
  const step = (dir) =>
    setWheel(({ order: o }) =>
      dir === "up"
        ? { order: [...o.slice(1), o[0]], wrapped: o[0] }
        : {
            order: [o[o.length - 1], ...o.slice(0, -1)],
            wrapped: o[o.length - 1],
          },
    );

  // clicking / tapping an option slides the wheel to it
  const rotateTo = (i) => setTarget(i);

  useEffect(() => {
    if (target === null) return;
    const up =
      (((order.indexOf(target) - CENTER_SLOT) % order.length) + order.length) %
      order.length;
    if (up === 0) {
      setTarget(null);
      return;
    }
    const id = setTimeout(
      () => step(up <= order.length / 2 ? "up" : "down"),
      CLICK_STEP_MS,
    );
    return () => clearTimeout(id);
  }, [target, order]);

  // Cursor at the top edge: options move up. Cursor at the bottom edge: options move down.
  useEffect(() => {
    if (!edge) return;
    setTarget(null);
    step(edge);
    const id = setInterval(() => step(edge), ROTATE_MS);
    return () => clearInterval(id);
  }, [edge]);

  // The options turn on their own, slowly. They wait while the cursor is on
  // the options or while a small photo is being previewed.
  useEffect(() => {
    if (paused || featured || target !== null) return;
    const id = setTimeout(() => step("up"), AUTO_MS);
    return () => clearTimeout(id);
  }, [order, paused, featured, target]);

  useEffect(() => {
    AREAS.forEach((a) => [a.main, ...a.images].forEach(preload));
  }, []);

  return (
    <section id="unit" className="unit">
      <div className="unit__inner">
        <p className="unit__eyebrow">A peaceful stay in the city</p>
        <h2 className="unit__title">A slower kind of stay.</h2>
        <p className="unit__subtitle">
          A thoughtfully designed space to pause, unwind, and feel at home.
        </p>

        <div className="unit__gallery">
          {/* Big image */}
          <div className="unit__main">
            <Photo key={mainSrc} base={mainSrc} alt={viewArea.label} />

            {/* DESIGN: small price tag on the photo */}
            <a
              className="unit__price-tag"
              href="#book"
              aria-label={`From ${formatPrice(PRICE_PER_NIGHT)} per night. Book now`}
            >
              <span className="unit__price-tag-amount">
                {formatPrice(PRICE_PER_NIGHT)}
              </span>
              <span className="unit__price-tag-unit">/ night</span>
              <span className="unit__price-tag-go" aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </a>
          </div>

          {/* 4 feature images: display only, they follow the hovered / selected area */}
          <div className="unit__grid">
            {viewArea.images.map((src, i) => (
              <div
                key={i}
                className={`unit__tile ${mainSrc === src ? "is-showing" : ""}`}
                onPointerEnter={(e) => {
                  pointerType.current = e.pointerType;
                  if (e.pointerType === "mouse") showInMain(src); // hover (desktop)
                }}
                onPointerLeave={(e) =>
                  e.pointerType === "mouse" && setFeatured(null)
                }
                onClick={() =>
                  pointerType.current !== "mouse" && toggleInMain(src)
                } // tap (touch)
              >
                <Photo key={src} base={src} alt="" />
              </div>
            ))}
          </div>

          {/* Area buttons: the list turns by itself or from the top / bottom edge, the option inside the lines is previewed */}
          <div
            className="unit__areas"
            role="group"
            aria-label="Browse by area"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => {
              setPaused(false);
              setEdge(null);
            }}
          >
            {/* Hover just above the first / below the last option to move the list */}
            <div
              className="unit__edge unit__edge--up"
              aria-hidden="true"
              onPointerEnter={(e) => e.pointerType === "mouse" && setEdge("up")}
              onPointerLeave={(e) => e.pointerType === "mouse" && setEdge(null)}
            />
            <div
              className="unit__edge unit__edge--down"
              aria-hidden="true"
              onPointerEnter={(e) =>
                e.pointerType === "mouse" && setEdge("down")
              }
              onPointerLeave={(e) => e.pointerType === "mouse" && setEdge(null)}
            />

            {AREAS.map((a, i) => (
              <div
                key={a.slug}
                className="unit__area-item"
                style={{
                  transform: `translateY(calc((${order.indexOf(i) - i} + 0.5) * (100% + 8px)))`,
                  transition: wrapped === i ? "none" : undefined,
                }}
              >
                <button
                  type="button"
                  className={`unit__area ${i === shownIndex ? "is-active" : ""}`}
                  onClick={() => rotateTo(i)}
                  aria-pressed={i === shownIndex}
                >
                  <span className="unit__area-thumb">
                    <Photo base={a.main} alt="" />
                  </span>
                  <span className="unit__area-label">{a.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <h3 className="unit__heading">Entire staycation unit · 1 bedroom</h3>
        <p className="unit__meta">Up to 4 guests · 1 bedroom · 1 bath</p>

        <hr className="unit__divider" />

        <div className="unit__highlights">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="unit__highlight">
              <span className="unit__highlight-icon">{h.icon}</span>
              <div>
                <p className="unit__highlight-title">{h.title}</p>
                <p className="unit__highlight-text">{h.text}</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="unit__divider" />

        <h3 className="unit__heading">Make yourself at home</h3>
        <p className="unit__about">
          A cozy city escape with soft natural textures, considered details, and
          everything you need for a comfortable short stay. Whether it’s a quiet
          weekend or a quick city break, this is your place to slow down.
        </p>

        <hr className="unit__divider unit__divider--end" />

        {/* DESIGN: sticky price bar, mobile / tablet only */}
        <div className="unit__bar">
          <div>
            <span className="unit__bar-from">From</span>
            <p className="unit__bar-price">
              <strong>{formatPrice(PRICE_PER_NIGHT)}</strong> / night
            </p>
          </div>
          <a href="#book" className="unit__bar-btn">
            Book now
          </a>
        </div>
      </div>
    </section>
  );
}
