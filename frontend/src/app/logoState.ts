import type {
  VidaLogoLevels,
  VidaLogoPortion,
} from "../components/VidaProgressLogo";

export const brandLogoLevels: VidaLogoLevels = {
  physical: 100,
  social: 100,
  cognitive: 100,
  creative: 100,
};

export const emptyLogoLevels: VidaLogoLevels = {
  physical: 0,
  social: 0,
  cognitive: 0,
  creative: 0,
};

export const logoPortionOrder: VidaLogoPortion[] = [
  "physical",
  "social",
  "cognitive",
  "creative",
];
