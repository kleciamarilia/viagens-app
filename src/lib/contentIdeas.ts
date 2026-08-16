import type { Activity, ActivityType } from "@/lib/database.types";

export interface ContentIdeas {
  reels: string[];
  youtube: string | null;
}

function byType(activities: Activity[], type: ActivityType) {
  return activities.filter((a) => a.type === type);
}

export function generateContentIdeas(activities: Activity[], city: string | null): ContentIdeas {
  if (activities.length === 0) return { reels: [], youtube: null };

  const comida = byType(activities, "comida");
  const experiencia = byType(activities, "experiencia");
  const transporte = byType(activities, "transporte");
  const atracoes = [...byType(activities, "atracao"), ...byType(activities, "tour_guiado")];

  const reels: string[] = [];
  const used = new Set<string>();

  if (comida[0]) {
    reels.push(
      `🍽️ Comida — "${comida[0].title}"${comida[0].location ? ` em ${comida[0].location}` : ""}: grave a primeira mordida em close, reação sincera na câmera e o preço na tela.`
    );
    used.add(comida[0].id);
  }

  if (experiencia[0]) {
    reels.push(
      `🍻 Bebida/experiência — "${experiencia[0].title}": mostre o brinde, a cor/textura, e conte uma curiosidade local em 15 segundos.`
    );
    used.add(experiencia[0].id);
  }

  if (transporte[0]) {
    reels.push(
      `🧭 Logística — como foi ${transporte[0].location ? `ir até ${transporte[0].location}` : "o deslocamento"} hoje: trajeto, bilhete e tempo gasto, formato "custou isso e vale a pena?".`
    );
    used.add(transporte[0].id);
  } else if (atracoes[0]) {
    reels.push(
      `🗺️ Planejamento — bastidor de "${atracoes[0].title}"${city ? ` em ${city}` : ""}: o que ninguém conta antes de ir (fila, preço, melhor horário).`
    );
    used.add(atracoes[0].id);
  }

  for (const a of activities) {
    if (reels.length >= 3) break;
    if (used.has(a.id)) continue;
    reels.push(`✨ "${a.title}" — registre o momento e conte em 3 frases por que valeu a pena.`);
    used.add(a.id);
  }

  const highlight = activities
    .slice()
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
    .map((a) => a.title)
    .slice(0, 4)
    .join(", ");

  const youtube = `📹 YouTube — vlog do dia em ${city ?? "destino"}: ${highlight}. Monte em ordem cronológica, do primeiro compromisso até a noite, com os custos do dia aparecendo na tela.`;

  return { reels: reels.slice(0, 3), youtube };
}
