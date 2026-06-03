import { css } from "@emotion/react";

export const GlobalStyle = (theme) => css`
  *,
  *::before,
  *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html,
  body {
    height: 100%;
  }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: 'Pretendard', -apple-system, sans-serif;
    background-color: ${theme.colors.ashBlack};
    color: ${theme.colors.bone};
    line-height: 1.6;
    overflow-x: hidden;
  }

  #root {
    min-height: 100%;
    isolation: isolate;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  ul,
  ol {
    list-style: none;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
    color: inherit;
  }

  button {
    border: none;
    outline: none;
    background: none;
    cursor: pointer;
  }

  input,
  textarea {
    border: none;
    outline: none;
    background: transparent;
  }

  textarea {
    resize: vertical;
  }

  table {
    border-collapse: collapse;
    border-spacing: 0;
  }

  :focus-visible {
    outline: 2px solid ${theme.colors.energyCyan};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

