import type { CopyEntries } from "./types";

/** Unidade Alva's EMP, Memory Overload, spyware and cards. */
export const alvaCopy = {
  emp: {
    title: "PULSO ELETROMAGNÉTICO!",
    tone: "text-sky-300",
    subtitle: ({ count }) => `Apagão: ${count ?? 0} oponentes sem cartas e sem habilidade por 2 rodadas`,
  },
  memoryOverload: {
    title: "SOBRECARGA DE MEMÓRIA!",
    tone: "text-sky-300",
    subtitle: ({ count }) =>
      count ? `Mãos com mais de 5 cartas queimam: ${count} cartas destruídas` : "Ninguém passou de 5 cartas",
  },
  corrupted: {
    title: "CARTA CORROMPIDA!",
    tone: "text-lime-300",
    subtitle: ({ count }, name) => `${name} recebeu ${count ?? 0} spyware na mão: a Unidade Alva vê tudo`,
  },
  firewall: {
    title: "TRAVA DE FIREWALL!",
    tone: "text-sky-200",
    subtitle: ({ count }, name) => `${name} não joga cartas por ${count ?? 0} rodadas`,
  },
  dataCollapse: {
    title: "COLAPSO GRAVITACIONAL!",
    tone: "text-violet-300",
    subtitle: ({ count }, name) => `${name} carrega ${count ?? 0} cartas de peso puro`,
  },
  alvaThrust: {
    title: "PROPULSORES!",
    tone: "text-sky-200",
    subtitle: ({ count }, name) => `${name} voa ${count ?? 0} casas`,
  },
  apocalypse: {
    title: "PROTOCOLO APOCALIPSE!",
    tone: "text-red-300",
    subtitle: () => "Infecção global, detonação do núcleo, colheita de propulsão",
  },
} satisfies CopyEntries;
