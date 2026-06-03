export const styleTheme = {
  breakpoints: {
    mobile: "480px",
    tablet: "768px",
    desktop: "1024px",
    large: "1440px",
  },

  // Emotion media query helpers
  media: {
    mobile: `@media (max-width: 480px)`,
    tablet: `@media (max-width: 768px)`,
    desktop: `@media (min-width: 1024px)`,
    large: `@media (min-width: 1440px)`,
    hover: `@media (hover: hover) and (pointer: fine)`,
    reducedMotion: `@media (prefers-reduced-motion: reduce)`,
  },

  // Fonts
  // - webSafeA/webSafeB: 대부분의 웹/OS에서 바로 사용 가능한 스택
  // - fallback: 특정 환경(예: Safari/특정 OS)에서 폰트 미지원 시 대체 스택
  // - apocalypse: 타이틀/로고/등급표기 등에 어울리는 디스플레이용 폰트(셀프호스팅 권장)
  fonts: {
    webSafeA:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    webSafeB:
      '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif',
    fallback:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
    apocalypse:
      '"Oxanium", "Rajdhani", "Bebas Neue", system-ui, -apple-system, "Segoe UI", sans-serif',
    body:
      '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  },

  // App에서 폰트를 "같이 다운로드"되게 하려면(오프라인/사파리 포함 안정적)
  // 폰트 파일(.woff2/.woff)을 프로젝트에 포함해서 @font-face로 등록하는 방식이 가장 확실합니다.
  fontAssets: {
    pretendard: ["/fonts/Pretendard-Regular.woff2", "/fonts/Pretendard-Bold.woff2"],
    apocalypse: ["/fonts/Oxanium-SemiBold.woff2"],
  },
  colors: {
    // Apocalypse neutrals (UI base)
    ashBlack: "#0B0D0C",
    soot: "#141816",
    bunker: "#1B1F1D",
    gunmetal: "#252C29",
    rustSteel: "#3A433E",
    concrete: "#6B726E",
    fog: "#A9B0AA",
    bone: "#E6E0D2",

    // Earth / decay accents
    driedMud: "#5A3F2C",
    rottenOlive: "#4B5A2A",
    toxicMoss: "#7A8F3A",
    bloodRust: "#8B2B1F",
    embers: "#C44A1A",
    hazardAmber: "#F2B705",
    acidLime: "#B6FF3B",
    radiationGreen: "#9DFF00",
    infectionPurple: "#5B2A86",
    bruiseViolet: "#3B1F4A",
    driedBlood: "#5A0F18",
    burntUmber: "#4A2A1A",
    scorchedSand: "#B58A4A",
    warningStripe: "#FFD000",
    graffitiTurquoise: "#2DD4BF",
    neonSignBlue: "#2A9DFF",
    coldSteel: "#8FA3B3",
    lead: "#4B5563",
    leather: "#3B2A22",
    paper: "#F2E7D0",
    parchment: "#D8C6A1",
    smoke: "#2B3230",
    nightSky: "#0A1020",
    stormBlue: "#22324A",
    dirtyWater: "#1E3A3A",
    iceBlue: "#BEE7FF",

    // Situation colors (alerts / states)
    danger: "#D72638",
    warning: "#FFB000",
    success: "#2FA36B",
    info: "#3A7BD5",
    energyCyan: "#20E3B2",

    // Highlight / rare bright
    signalMagenta: "#FF2E88",

    // Basic colors (common UI usage)
    white: "#FFFFFF",
    black: "#000000",
    red: "#FF0000",
    green: "#00FF00",
    blue: "#0000FF",
    yellow: "#FFFF00",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    brown: "#A52A2A",
    lime: "#32CD32",
    teal: "#008080",
    navy: "#000080",
    maroon: "#800000",
    olive: "#808000",
    gray: "#808080",
    silver: "#C0C0C0",
    gold: "#FFD700",

    // Transparent overlays
    glassBlack: "rgba(11, 13, 12, 0.7)",
    dimOverlay: "rgba(0, 0, 0, 0.5)",
  },
  // Responsive font sizes using clamp(min, preferred, max)
  // - min: smaller screens
  // - max: target px size
  // - preferred: scales with viewport width
  fontSizes: {
    14: "clamp(12px, calc(11px + 0.25vw), 14px)",
    16: "clamp(14px, calc(13px + 0.30vw), 16px)",
    18: "clamp(16px, calc(15px + 0.35vw), 18px)",
    20: "clamp(17px, calc(16px + 0.40vw), 20px)",
    22: "clamp(18px, calc(17px + 0.45vw), 22px)",
    24: "clamp(19px, calc(18px + 0.50vw), 24px)",
    26: "clamp(20px, calc(19px + 0.55vw), 26px)",
    28: "clamp(21px, calc(20px + 0.60vw), 28px)",
    30: "clamp(22px, calc(21px + 0.65vw), 30px)",
    32: "clamp(23px, calc(22px + 0.70vw), 32px)",
    34: "clamp(24px, calc(23px + 0.75vw), 34px)",
    36: "clamp(25px, calc(24px + 0.80vw), 36px)",
    38: "clamp(26px, calc(25px + 0.85vw), 38px)",
    40: "clamp(27px, calc(26px + 0.90vw), 40px)",
  },
  fontWeights: {
    300: 300,
    400: 400,
    500: 500,
    600: 600,
    700: 700,
    800: 800,
    900: 900,
  },
  padding: {
    10: "clamp(8px, calc(7px + 0.35vw), 10px)",
    15: "clamp(12px, calc(11px + 0.50vw), 15px)",
    20: "clamp(16px, calc(15px + 0.60vw), 20px)",
    25: "clamp(19px, calc(18px + 0.75vw), 25px)",
    30: "clamp(22px, calc(21px + 0.85vw), 30px)",
    35: "clamp(25px, calc(24px + 1.00vw), 35px)",
    40: "clamp(28px, calc(27px + 1.10vw), 40px)",
  },
  margin: {
    10: "clamp(8px, calc(7px + 0.35vw), 10px)",
    15: "clamp(12px, calc(11px + 0.50vw), 15px)",
    20: "clamp(16px, calc(15px + 0.60vw), 20px)",
    25: "clamp(19px, calc(18px + 0.75vw), 25px)",
    30: "clamp(22px, calc(21px + 0.85vw), 30px)",
    35: "clamp(25px, calc(24px + 1.00vw), 35px)",
    40: "clamp(28px, calc(27px + 1.10vw), 40px)",
  },
  gap: {
    10: "clamp(8px, calc(7px + 0.35vw), 10px)",
    15: "clamp(12px, calc(11px + 0.50vw), 15px)",
    20: "clamp(16px, calc(15px + 0.60vw), 20px)",
    25: "clamp(19px, calc(18px + 0.75vw), 25px)",
    30: "clamp(22px, calc(21px + 0.85vw), 30px)",
    35: "clamp(25px, calc(24px + 1.00vw), 35px)",
    40: "clamp(28px, calc(27px + 1.10vw), 40px)",
  },
  gradients: {
    // Stops are ordered (start -> end). Use with linear-gradient(...) etc.
    firestorm: ["#1A0B08", "#8B2B1F", "#C44A1A", "#F2B705"],
    ashFall: ["#0B0D0C", "#1B1F1D", "#3A433E", "#A9B0AA"],
    toxicSpill: ["#141816", "#4B5A2A", "#7A8F3A", "#20E3B2"],
    rustedBlood: ["#0B0D0C", "#5A3F2C", "#8B2B1F", "#D72638"],
    duskRuin: ["#0B0D0C", "#252C29", "#3A7BD5", "#A9B0AA"],
  },
  borderColors: {
    // Item rarity borders
    common: "#FFFFFF", // 일반
    advanced: "#2FA36B", // 고급 (green)
    rare: "#3A7BD5", // 희귀 (blue)
    heroic: "#8E44AD", // 영웅 (purple)
    legendary: "#FFD700", // 전설 (yellow)
    epic: "#D72638", // 에픽 (red)
  },
  shadowColors: {
    // Shadow colors by base + opacity
    black: {
      0.2: "rgba(0, 0, 0, 0.2)",
      0.4: "rgba(0, 0, 0, 0.4)",
      0.6: "rgba(0, 0, 0, 0.6)",
      0.8: "rgba(0, 0, 0, 0.8)",
    },
    white: {
      0.2: "rgba(255, 255, 255, 0.2)",
      0.4: "rgba(255, 255, 255, 0.4)",
      0.6: "rgba(255, 255, 255, 0.6)",
      0.8: "rgba(255, 255, 255, 0.8)",
    },
    gray: {
      0.2: "rgba(128, 128, 128, 0.2)",
      0.4: "rgba(128, 128, 128, 0.4)",
      0.6: "rgba(128, 128, 128, 0.6)",
      0.8: "rgba(128, 128, 128, 0.8)",
    },
  },
  utils: {
    gradient: (name, direction = "to bottom") => {
      const stops = styleTheme.gradients?.[name];
      if (!stops || stops.length === 0) return "none";
      return `linear-gradient(${direction}, ${stops.join(", ")})`;
    },
    mediaUp: (key) => {
      const bp = styleTheme.breakpoints?.[key];
      if (!bp) return "";
      return `@media (min-width: ${bp})`;
    },
    mediaDown: (key) => {
      const bp = styleTheme.breakpoints?.[key];
      if (!bp) return "";
      return `@media (max-width: ${bp})`;
    },
    mediaBetween: (minKey, maxKey) => {
      const min = styleTheme.breakpoints?.[minKey];
      const max = styleTheme.breakpoints?.[maxKey];
      if (!min || !max) return "";
      return `@media (min-width: ${min}) and (max-width: ${max})`;
    },
    shadowColor: (base = "black", opacity = 0.4) => {
      const table = styleTheme.shadowColors?.[base];
      if (!table) return "rgba(0, 0, 0, 0)";
      return table[String(opacity)] ?? "rgba(0, 0, 0, 0)";
    },
    shadow: ({
      x = 0,
      y = 8,
      blur = 24,
      spread = 0,
      base = "black",
      opacity = 0.4,
    } = {}) => {
      const color = styleTheme.utils.shadowColor(base, opacity);
      return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    },
  },
};

