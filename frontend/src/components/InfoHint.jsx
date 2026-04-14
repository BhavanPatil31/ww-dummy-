import { useEffect, useRef, useState } from "react";
import { FiInfo } from "react-icons/fi";
import "../styles/InfoHint.css";

export default function InfoHint({ text, label = "More info" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <span className="ww-info-hint" ref={ref}>
      <button
        type="button"
        className="ww-info-btn"
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FiInfo size={13} />
      </button>
      <span className={`ww-info-tip ${open ? "open" : ""}`}>{text}</span>
    </span>
  );
}

