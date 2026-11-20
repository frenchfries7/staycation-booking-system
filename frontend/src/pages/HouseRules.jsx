import "./HouseRules.css";
import {
  useStay,
  formatTime,
  DEFAULT_CHECK_IN,
  DEFAULT_CHECK_OUT,
} from "../context/StayContext";

const Icon = ({ children }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const POOL_RATES = [
  { label: "Regular days", price: "₱250" },
  { label: "Holidays", price: "₱300" },
];

const RULE_GROUPS = [
  {
    title: "Guests & check-in",
    rules: [
      {
        text: "Only registered guests allowed",
        icon: (
          <Icon>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m16 11 2 2 4-4" />
          </Icon>
        ),
      },
      {
        text: "Early check-in / late check-out",
        note: "Subject to availability and corresponding fee",
        icon: (
          <Icon>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: "Respect the space",
    rules: [
      {
        text: "Keep noise low, especially from 10 PM onwards",
        icon: (
          <Icon>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
          </Icon>
        ),
      },
      {
        text: "Smoking and vaping are strictly prohibited inside the unit",
        icon: (
          <Icon>
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: "Care for the unit",
    rules: [
      {
        text: "Keep the unit clean and dispose of trash properly",
        icon: (
          <Icon>
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
          </Icon>
        ),
      },
      {
        text: "Damages or missing items charged accordingly",
        icon: (
          <Icon>
            <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z" />
            <path d="M12 9v4M12 17h.01" />
          </Icon>
        ),
      },
      {
        text: "Turn off appliances when leaving and keep doors locked",
        icon: (
          <Icon>
            <path d="M12 2v10" />
            <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
          </Icon>
        ),
      },
    ],
  },
];

export default function HouseRules() {
  // Times the guest picked in the booking form (empty until they choose)
  const { checkIn, checkOut } = useStay();

  const facts = [
    { label: "Guests", value: "Up to 4" },
    { label: "Quiet hours", value: "From 10 PM" },
    {
      label: "Check-in",
      value: formatTime(checkIn || DEFAULT_CHECK_IN),
      hint: !checkIn
        ? "Standard time"
        : checkIn < DEFAULT_CHECK_IN
          ? "Early check-in · fee may apply"
          : "Your selected time",
    },
    {
      label: "Check-out",
      value: formatTime(checkOut || DEFAULT_CHECK_OUT),
      hint: !checkOut
        ? "Standard time"
        : checkOut > DEFAULT_CHECK_OUT
          ? "Late check-out · fee may apply"
          : "Your selected time",
    },
  ];

  return (
    <section id="house-rules" className="things">
      <div className="things__inner">
        <h3 className="things__title">Things to know</h3>

        <div className="things__grid">
          {/* Left: pool + quick facts */}
          <div className="things__col things__col--left">
            <h4 className="things__heading">Swimming Pool Access</h4>
            <div className="things__rates">
              {POOL_RATES.map((rate) => (
                <div key={rate.label} className="things__rate">
                  <span className="things__rate-label">{rate.label}</span>
                  <span className="things__rate-price">
                    {rate.price}
                    <small> / person</small>
                  </span>
                </div>
              ))}
            </div>

            <h4 className="things__heading things__heading--spaced">
              Quick facts
            </h4>
            <div className="things__facts">
              {facts.map((fact) => (
                <div key={fact.label} className="things__fact">
                  <span className="things__fact-label">{fact.label}</span>
                  <span className="things__fact-value">{fact.value}</span>
                  {fact.hint && (
                    <span className="things__fact-hint">{fact.hint}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: grouped house rules */}
          <div className="things__col things__col--right">
            <h4 className="things__heading">House Rules</h4>

            {RULE_GROUPS.map((group) => (
              <div key={group.title} className="things__group">
                <p className="things__group-title">{group.title}</p>
                <ul className="things__rules">
                  {group.rules.map((rule) => (
                    <li key={rule.text} className="things__rule">
                      <span className="things__rule-icon">{rule.icon}</span>
                      <span className="things__rule-text">
                        {rule.text}
                        {rule.note && (
                          <span className="things__rule-note">{rule.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="things__divider" />
      </div>
    </section>
  );
}
