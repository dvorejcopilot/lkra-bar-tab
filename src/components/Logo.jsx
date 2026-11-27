// Logo baru. Samostatný soubor, aby šlo logo vyměnit bez zásahu do zbytku appky.
export const LKRALogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="LKRA">
    <circle cx="40" cy="40" r="38" fill="#1a3a6b" stroke="#c8a84b" strokeWidth="3"/>
    <path d="M12 42 Q40 22 68 42" stroke="#c8a84b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M25 42 L40 35 L55 42" fill="#c8a84b" opacity="0.9"/>
    <path d="M38 35 L36 48 L44 48 L42 35Z" fill="#fff" opacity="0.85"/>
    <path d="M36 48 Q40 50 44 48" stroke="#c8a84b" strokeWidth="1.5" fill="none"/>
    <text x="40" y="65" textAnchor="middle" fill="#c8a84b" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="2">LKRA</text>
  </svg>
);

export default LKRALogo;
