import { c } from "./colors.js";

export function formatMarkdown(text: string): string {
  // Bold: **text** → ANSI bold
  text = text.replace(/\*\*(.+?)\*\*/g, `${c.bold}$1${c.reset}`);
  // Italic: *text* → ANSI dim (terminal italic support is spotty, dim looks good)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `${c.dim}$1${c.reset}`);
  return text;
}

export function createStreamFormatter(write: (s: string) => void) {
  let held = "";

  return {
    push(text: string) {
      held += text;
      let output = "";
      let i = 0;

      while (i < held.length) {
        if (held[i] === "*" && i + 1 < held.length && held[i + 1] === "*") {
          // Bold: **...**
          const end = held.indexOf("**", i + 2);
          if (end === -1) break; // incomplete, hold rest
          output += `${c.bold}${held.slice(i + 2, end)}${c.reset}`;
          i = end + 2;
        } else if (held[i] === "*") {
          // Italic: *...*
          const end = held.indexOf("*", i + 1);
          if (end === -1) break; // incomplete, hold rest
          output += `${c.dim}${held.slice(i + 1, end)}${c.reset}`;
          i = end + 1;
        } else {
          output += held[i];
          i++;
        }
      }

      held = held.slice(i);
      if (output) write(output);
    },

    flush() {
      if (held) write(held);
      held = "";
    },
  };
}
