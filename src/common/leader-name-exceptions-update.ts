import * as fs from "fs/promises";
import * as path from "path";
import { AppDataSource } from "../data-source";

type ExceptionsFile = {
  updatedAt: string;
  source: string;
  phrases: string[];
  tokens: string[];
};

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "src",
  "common",
  "leader-name-exceptions.json",
);

const LEADER_LANGS = ["en", "fr", "ja"] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}

function canonicalize(value: string): string {
  return value.replace(/[._\-\s]/g, "");
}

function tokenizePhrase(normalizedPhrase: string): string[] {
  return normalizedPhrase
    .split(/[\s._\-&/]+/)
    .map((t) => canonicalize(t))
    .filter(Boolean);
}

async function fetchLeaderNames(): Promise<string[]> {
  const rows = await AppDataSource.query(
    `
    SELECT DISTINCT TRIM(l.card_localization_name) AS name
    FROM card_localization l
    WHERE l.language_uid = ANY($1::text[])
      AND LOWER(TRIM(l.card_localization_category)) = 'leader'
      AND TRIM(l.card_localization_name) <> ''
    ORDER BY name
    `,
    [LEADER_LANGS],
  );

  return rows
    .map((row: { name: string }) => String(row.name ?? "").trim())
    .filter(Boolean);
}

async function main() {
  await AppDataSource.initialize();

  try {
    const names = await fetchLeaderNames();
    const phrases = new Set<string>();
    const tokens = new Set<string>();

    for (const rawName of names) {
      const phrase = normalize(rawName);
      if (!phrase) continue;

      phrases.add(phrase);

      for (const token of tokenizePhrase(phrase)) {
        tokens.add(token);
      }
    }

    const payload: ExceptionsFile = {
      updatedAt: new Date().toISOString(),
      source: "card_localization.leader",
      phrases: Array.from(phrases).sort(),
      tokens: Array.from(tokens).sort(),
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");

    console.log(
      `Saved ${payload.phrases.length} leader phrases and ${payload.tokens.length} tokens to:`,
    );
    console.log(OUTPUT_PATH);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error("Fatal error while updating leader name exceptions:");
  console.error(error);
  process.exit(1);
});
