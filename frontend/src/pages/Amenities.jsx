import "./Amenities.css";

const Icon = ({ children }) => (
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
    {children}
  </svg>
);

// Listed top-to-bottom in the left column first, then the right column
const AMENITIES = [
  {
    label: "Free Fast Wifi",
    icon: (
      <Icon>
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.86a10 10 0 0 1 14 0" />
        <path d="M8.5 16.43a5 5 0 0 1 7 0" />
      </Icon>
    ),
  },
  {
    label: "Air Conditioning",
    icon: (
      <Icon>
        <path d="M2 12h20M12 2v20" />
        <path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4" />
      </Icon>
    ),
  },
  {
    label: "Smart TV / Netflix",
    icon: (
      <Icon>
        <rect x="2" y="7" width="20" height="15" rx="2" />
        <path d="m17 2-5 5-5-5" />
      </Icon>
    ),
  },
  {
    label: "Hot & Cold Shower",
    icon: (
      <Icon>
        <path d="M14 5V3H8a3 3 0 0 0-3 3v15" />
        <path d="M9 10h10a5 5 0 0 0-10 0z" />
        <path d="M11 13v2M14 13v3M17 13v2M12.5 18v1.5M15.5 19v1.5" />
      </Icon>
    ),
  },
  {
    label: "Kitchenette & cooking utensils",
    icon: (
      <Icon>
        <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7" />
      </Icon>
    ),
  },
  {
    label: "Electric kettle / rice cooker / microwave",
    icon: (
      <Icon>
        <rect x="2" y="4" width="20" height="15" rx="2" />
        <rect x="5" y="8" width="10" height="7" rx="1" />
        <path d="M18.5 9h.01M18.5 13h.01M6 19v2M18 19v2" />
      </Icon>
    ),
  },
  {
    label: "Balcony",
    icon: (
      <Icon>
        <path d="M3 10h18M3 20h18" />
        <path d="M6 10v10M10 10v10M14 10v10M18 10v10" />
        <path d="M7 6a5 5 0 0 1 10 0" />
      </Icon>
    ),
  },
  {
    label: "Smart lock / self check-in",
    icon: (
      <Icon>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        <path d="M12 16h.01" />
      </Icon>
    ),
  },
  {
    label: "Comfortable bed & fresh linens",
    icon: (
      <Icon>
        <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
        <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
        <path d="M12 4v6M2 18h20" />
      </Icon>
    ),
  },
  {
    label: "Swimming pool access",
    icon: (
      <Icon>
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      </Icon>
    ),
  },
];

export default function Amenities() {
  return (
    <section id="amenities" className="amenities">
      <div className="amenities__inner">
        <h3 className="amenities__title">What this place offers</h3>

        <ul className="amenities__list">
          {AMENITIES.map((item) => (
            <li key={item.label} className="amenities__item">
              <span className="amenities__icon">{item.icon}</span>
              <span className="amenities__label">{item.label}</span>
            </li>
          ))}
        </ul>

        <hr className="amenities__divider" />
      </div>
    </section>
  );
}
