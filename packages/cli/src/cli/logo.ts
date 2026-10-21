const wordmark = [
  "██╗   ██╗███╗   ███╗ ██████╗ ██████╗ ██████╗ ███████╗",
  "╚██╗ ██╔╝████╗ ████║██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  " ╚████╔╝ ██╔████╔██║██║     ██║   ██║██║  ██║█████╗  ",
  "  ╚██╔╝  ██║╚██╔╝██║██║     ██║   ██║██║  ██║██╔══╝  ",
  "   ██║   ██║ ╚═╝ ██║╚██████╗╚██████╔╝██████╔╝███████╗",
  "   ╚═╝   ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
]

const blank = wordmark.map(() => "")

export const logo = {
  left: wordmark,
  right: blank,
}

export const logoThin = {
  left: wordmark,
  right: blank,
}

export const logos = {
  thin: logoThin,
  classic: logo,
} as const

export type LogoKey = keyof typeof logos

export const go = {
  left: ["    ", "█▀▀█", "█  █", "▀▀▀▀"],
  right: ["    ", "█▀▀▀", "█ __", "▀▀▀▀"],
}

export const marks = "_^~,"
