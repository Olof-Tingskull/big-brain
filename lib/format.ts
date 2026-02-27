import { c } from "./colors.js";

export function formatMarkdown(text: string): string {
  // Bold: **text** → ANSI bold
  text = text.replace(/\*\*(.+?)\*\*/g, `${c.bold}$1${c.reset}`);
  // Italic: *text* → ANSI dim (terminal italic support is spotty, dim looks good)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `${c.dim}$1${c.reset}`);
  return text;
}
