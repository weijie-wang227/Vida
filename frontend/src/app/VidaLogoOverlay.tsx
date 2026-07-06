import { X } from "lucide-react";
import {
  VidaProgressLogo,
  type VidaLogoLevels,
} from "../components/VidaProgressLogo";

export function VidaLogoOverlay({
  levels,
  onAdvance,
  onClose,
}: {
  levels: VidaLogoLevels;
  onAdvance: () => void;
  onClose: () => void;
}) {
  return (
    <div className="vida-logo-overlay">
      <button
        type="button"
        className="vida-logo-close-button"
        onClick={onClose}
        aria-label="Minimize vida progress"
      >
        <X size={18} />
      </button>
      <VidaProgressLogo
        levels={levels}
        onPortionClick={onAdvance}
        size="expanded"
      />
    </div>
  );
}
