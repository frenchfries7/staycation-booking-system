import { useEffect, useRef, useState } from "react";
import "./Location.css";

// Exact address, place name, or coordinates like "14.5351,120.9818"
const MAP_QUERY = "Shore Residences, Mall of Asia Complex, Pasay, Metro Manila";

const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
  MAP_QUERY,
)}&z=16&output=embed`;

export default function Location() {
  const boxRef = useRef(null);
  const [mapKey, setMapKey] = useState(0);

  // Google's embed only draws at the size it had when it loaded. If the box
  // changes width (browser zoom, window resize), reload the map once it settles.
  useEffect(() => {
    const box = boxRef.current;
    let lastWidth = box.offsetWidth;
    let timer;

    const observer = new ResizeObserver(() => {
      if (box.offsetWidth === lastWidth) return;
      lastWidth = box.offsetWidth;
      clearTimeout(timer);
      timer = setTimeout(() => setMapKey((k) => k + 1), 400);
    });
    observer.observe(box);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <section id="location" className="location">
      <div className="location__inner">
        <h3 className="location__title">Where you’ll be</h3>
        <p className="location__place">MOA Shore, Pasay, Manila</p>

        <div ref={boxRef} className="location__map">
          <iframe
            key={mapKey}
            title="Map showing the location of B&R Hideaway"
            src={mapSrc}
            width="100%"
            height="100%"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <p className="location__note">
          Conveniently located near local cafés, dining spots, and everyday
          essentials.
        </p>

        <hr className="location__divider" />
      </div>
    </section>
  );
}
