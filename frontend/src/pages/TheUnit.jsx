import { useState } from "react";
import "./TheUnit.css";

// Put your photos in: frontend/public/images/unit/
// Naming per area (slug = the first part of the file name):
//   <slug>-main-image.jpg       -> big image + the area button thumbnail
//   <slug>-sub-image-1.jpg ...4 -> the 4 small images
// No extension here: Photo tries .jpg, .png, .jpeg and .webp automatically
const photo = (slug, name) => `/images/unit/${slug}-${name}`;

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

// Tries each extension in turn; if none exists it hides itself,
// so the grey placeholder shows instead of a broken image.
function Photo({ base, alt }) {
  const [extIndex, setExtIndex] = useState(0);
  if (extIndex >= EXTENSIONS.length) return null;
  return (
    <img
      src={`${base}.${EXTENSIONS[extIndex]}`}
      alt={alt}
      loading="lazy"
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

export default function TheUnit() {
  const [areaIndex, setAreaIndex] = useState(0);
  // null = show the area's main image in the big spot
  const [imageIndex, setImageIndex] = useState(null);

  const area = AREAS[areaIndex];
  const activeImage = imageIndex === null ? area.main : area.images[imageIndex];

  const selectArea = (i) => {
    setAreaIndex(i);
    setImageIndex(null);
  };

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
            <Photo key={activeImage} base={activeImage} alt={area.label} />
          </div>

          {/* 4 feature images of the selected area */}
          <div className="unit__grid">
            {area.images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`unit__tile ${i === imageIndex ? "is-active" : ""}`}
                onClick={() => setImageIndex(i)}
                aria-label={`${area.label} photo ${i + 1}`}
                aria-pressed={i === imageIndex}
              >
                <Photo base={src} alt="" />
              </button>
            ))}
          </div>

          {/* Area buttons */}
          <div className="unit__areas" role="group" aria-label="Browse by area">
            {AREAS.map((a, i) => (
              <button
                key={a.slug}
                type="button"
                className={`unit__area ${i === areaIndex ? "is-active" : ""}`}
                onClick={() => selectArea(i)}
                aria-pressed={i === areaIndex}
              >
                <span className="unit__area-thumb">
                  <Photo base={a.main} alt="" />
                </span>
                <span className="unit__area-label">{a.label}</span>
              </button>
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
      </div>
    </section>
  );
}
