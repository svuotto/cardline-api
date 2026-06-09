import * as fs from "fs/promises";
import * as path from "path";

type BlocklistFile = {
  updatedAt: string;
  source: string;
  languages: string[];
  words: string[];
};

const BASE_URL =
  "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "src",
  "common",
  "text-blocklist.json",
);

// Alle Sprachen
const LANGUAGES = [
  "ar",
  "cs",
  "da",
  "de",
  "en",
  "eo",
  "es",
  "fa",
  "fi",
  "fr",
  "hi",
  "hu",
  "it",
  "ja",
  "kab",
  "ko",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "tlh",
  "tr",
  "zh",
];

function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC");
}

async function fetchLanguageWords(lang: string): Promise<string[]> {
  const url = `${BASE_URL}/${lang}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch "${lang}" (${response.status})`);
  }

  const text = await response.text();

  return text
    .split("\n")
    .map(normalizeWord)
    .filter(Boolean);
}

async function main() {
  const words = new Set<string>();
  const failedLanguages: string[] = [];

  console.log(`Starting text blocklist update for ${LANGUAGES.length} languages...`);

  for (const lang of LANGUAGES) {
    try {
      const langWords = await fetchLanguageWords(lang);

      for (const word of langWords) {
        words.add(word);
      }

      console.log(`✓ ${lang}: ${langWords.length} entries loaded`);
    } catch (error) {
      failedLanguages.push(lang);
      console.error(`✗ ${lang}: ${(error as Error).message}`);
    }
  }

  const payload: BlocklistFile = {
    updatedAt: new Date().toISOString(),
    source: BASE_URL,
    languages: LANGUAGES.filter((lang) => !failedLanguages.includes(lang)),
    words: Array.from(words).sort(),
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");

  console.log("");
  console.log(`Done. Saved ${payload.words.length} unique words to:`);
  console.log(OUTPUT_PATH);

  if (failedLanguages.length > 0) {
    console.log("");
    console.warn(`Warning: ${failedLanguages.length} language(s) failed: ${failedLanguages.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error while updating username blocklist:");
  console.error(error);
  process.exit(1);
});