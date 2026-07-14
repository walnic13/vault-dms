// Shared Vault palette — byte-identical to vault-theo/src/theme.ts `C` (== vault-origin tailwind
// `theo-*`). The DMS browser renders native to Origin using these tokens + the SANS stack.
export const C = {
  bg: "#FAF9F5", sidebar: "#F0EEE6", bubble: "#EDEAE0", card: "#FFFFFF",
  ink: "#28261F", ink2: "#6B6A63", ink3: "#94928A",
  line: "#E4E1D6", line2: "#D8D4C7",
  coral: "#D97757", coralDk: "#BD5D3A", coralSoft: "#F4E6DD", coralTint: "#EFE4DC",
} as const;

export const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
