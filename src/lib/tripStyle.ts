export const TRIP_COLORS = [
  "#D6336C", // pink/red
  "#C99A2E", // gold/olive
  "#1971C2", // blue
  "#E8590C", // orange
  "#2F9E44", // green
  "#7A5FA0", // purple
  "#0C8599", // teal
  "#495057", // slate
];

export function pickTripColor(seed?: string) {
  if (!seed) return TRIP_COLORS[Math.floor(Math.random() * TRIP_COLORS.length)];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TRIP_COLORS[hash % TRIP_COLORS.length];
}

const FLAGS: [string, string][] = [
  ["alemanha", "🇩🇪"],
  ["germany", "🇩🇪"],
  ["inglaterra", "🇬🇧"],
  ["reino unido", "🇬🇧"],
  ["londres", "🇬🇧"],
  ["escócia", "🏴"],
  ["escocia", "🏴"],
  ["país de gales", "🏴"],
  ["cardiff", "🏴"],
  ["holanda", "🇳🇱"],
  ["países baixos", "🇳🇱"],
  ["amsterdã", "🇳🇱"],
  ["amsterda", "🇳🇱"],
  ["frança", "🇫🇷"],
  ["franca", "🇫🇷"],
  ["paris", "🇫🇷"],
  ["itália", "🇮🇹"],
  ["italia", "🇮🇹"],
  ["espanha", "🇪🇸"],
  ["portugal", "🇵🇹"],
  ["lisboa", "🇵🇹"],
  ["porto", "🇵🇹"],
  ["irlanda", "🇮🇪"],
  ["bélgica", "🇧🇪"],
  ["belgica", "🇧🇪"],
  ["áustria", "🇦🇹"],
  ["austria", "🇦🇹"],
  ["suíça", "🇨🇭"],
  ["suica", "🇨🇭"],
  ["república tcheca", "🇨🇿"],
  ["praga", "🇨🇿"],
  ["grécia", "🇬🇷"],
  ["grecia", "🇬🇷"],
  ["croácia", "🇭🇷"],
  ["croacia", "🇭🇷"],
  ["dinamarca", "🇩🇰"],
  ["noruega", "🇳🇴"],
  ["suécia", "🇸🇪"],
  ["suecia", "🇸🇪"],
  ["japão", "🇯🇵"],
  ["japao", "🇯🇵"],
  ["estados unidos", "🇺🇸"],
  ["eua", "🇺🇸"],
  ["califórnia", "🇺🇸"],
  ["california", "🇺🇸"],
  ["nova york", "🇺🇸"],
  ["canadá", "🇨🇦"],
  ["canada", "🇨🇦"],
  ["méxico", "🇲🇽"],
  ["mexico", "🇲🇽"],
  ["argentina", "🇦🇷"],
  ["chile", "🇨🇱"],
  ["peru", "🇵🇪"],
  ["brasil", "🇧🇷"],
  ["rio grande do norte", "🇧🇷"],
];

export function flagForDestination(destination?: string | null) {
  if (!destination) return null;
  const norm = destination.toLowerCase();
  for (const [key, flag] of FLAGS) {
    if (norm.includes(key)) return flag;
  }
  return null;
}
