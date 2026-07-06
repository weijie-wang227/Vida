import { useId, type KeyboardEvent } from "react";
import {
  Activity,
  Brain,
  Lightbulb,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { vidaCategory } from "../lib/types";

export type VidaLogoPortion = vidaCategory;

export type VidaLogoLevels = Record<VidaLogoPortion, number>;

type VidaProgressLogoProps = {
  levels: VidaLogoLevels;
  onPortionClick?: (portion: VidaLogoPortion) => void;
  size?: "compact" | "expanded";
};

type PortionConfig = {
  id: VidaLogoPortion;
  label: string;
  path: string;
  gradient: string[];
  Icon: LucideIcon;
};

const portions: PortionConfig[] = [
  {
    id: "physical",
    label: "Physical",
    path: "M27 18H67C80 18 90 25 96 36L115 78C123 96 112 112 93 112H62C48 112 38 105 31 93L9 55C-1 36 8 18 27 18Z",
    gradient: ["#45d878", "#34b967"],
    Icon: Activity,
  },
  {
    id: "social",
    label: "Social",
    path: "M173 18H213C232 18 241 36 231 55L209 93C202 105 192 112 178 112H147C128 112 117 96 125 78L144 36C150 25 160 18 169 18Z",
    gradient: ["#ffd06a", "#f4a936"],
    Icon: Users,
  },
  {
    id: "cognitive",
    label: "Cognitive",
    path: "M58 116H95C109 116 118 125 118 139V220C104 218 93 211 85 198L54 139C46 126 44 116 61 116Z",
    gradient: ["#f052b6", "#cf3c9d"],
    Icon: Lightbulb,
  },
  {
    id: "creative",
    label: "Creative",
    path: "M182 116H145C131 116 122 125 122 139V220C136 218 147 211 155 198L186 139C194 126 196 116 179 116Z",
    gradient: ["#7282ff", "#5263f3"],
    Icon: Brain,
  },
];

function clampLevel(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function VidaProgressLogo({
  levels,
  onPortionClick,
  size = "compact",
}: VidaProgressLogoProps) {
  const idPrefix = useId().replace(/:/g, "");

  const handleKeyDown =
    (portion: VidaLogoPortion) => (event: KeyboardEvent<SVGGElement>) => {
      if (!onPortionClick) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPortionClick(portion);
      }
    };

  return (
    <div
      className={`vida-progress-logo vida-progress-logo--${size} ${
        onPortionClick ? "vida-progress-logo--interactive" : ""
      }`}
    >
      <svg
        viewBox="0 0 240 240"
        aria-label="vida progress logo"
        className="vida-progress-logo__svg"
        role="img"
      >
        <defs>
          <filter
            id={`${idPrefix}-portion-shadow`}
            x="-20%"
            y="-20%"
            width="140%"
            height="150%"
          >
            <feDropShadow
              dx="0"
              dy="9"
              stdDeviation="8"
              floodColor="#080812"
              floodOpacity="0.28"
            />
          </filter>
          {portions.map((portion) => (
            <linearGradient
              key={portion.id}
              id={`${idPrefix}-${portion.id}-gradient`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={portion.gradient[0]} />
              <stop offset="100%" stopColor={portion.gradient[1]} />
            </linearGradient>
          ))}
          {portions.map((portion) => (
            <clipPath key={portion.id} id={`${idPrefix}-${portion.id}-clip`}>
              <path d={portion.path} />
            </clipPath>
          ))}
        </defs>

        {portions.map((portion) => {
          const level = clampLevel(levels[portion.id] ?? 0);
          const fillHeight = (240 * level) / 100;
          const fillY = 240 - fillHeight;

          return (
            <g
              key={portion.id}
              className="vida-progress-logo__portion"
              filter={`url(#${idPrefix}-portion-shadow)`}
              onClick={() => onPortionClick?.(portion.id)}
              onKeyDown={handleKeyDown(portion.id)}
              role={onPortionClick ? "button" : undefined}
              tabIndex={onPortionClick ? 0 : undefined}
              aria-label={`${portion.label} ${Math.round(level)} percent full`}
            >
              <title>{`${portion.label} ${Math.round(level)}% full`}</title>
              <path d={portion.path} className="vida-progress-logo__empty" />
              <g clipPath={`url(#${idPrefix}-${portion.id}-clip)`}>
                <rect
                  x="0"
                  y={fillY}
                  width="240"
                  height={fillHeight}
                  fill={`url(#${idPrefix}-${portion.id}-gradient)`}
                  className="vida-progress-logo__fill"
                />
              </g>
              <path d={portion.path} className="vida-progress-logo__outline" />
            </g>
          );
        })}
      </svg>

      <div className="vida-progress-logo__icons" aria-hidden="true">
        {portions.map(({ id, Icon }) => (
          <Icon
            key={id}
            className={`vida-progress-logo__icon vida-progress-logo__icon--${id}`}
          />
        ))}
      </div>
    </div>
  );
}
