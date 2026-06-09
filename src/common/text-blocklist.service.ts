import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

type BlocklistFile = {
  updatedAt: string;
  source?: string;
  languages: string[];
  words: string[];
};

type ExceptionsFile = {
  updatedAt?: string;
  source?: string;
  phrases: string[];
  tokens: string[];
};

@Injectable()
export class TextBlocklistService implements OnModuleInit {
  private readonly logger = new Logger(TextBlocklistService.name);

  private blockedWords = new Set<string>();
  private blockedCanonicalWords = new Set<string>();
  private exceptionPhrases = new Set<string>();
  private exceptionTokens = new Set<string>();

  private resolveCommonFile(fileName: string): string {
    const candidates = [
      path.join(__dirname, fileName),
      path.join(process.cwd(), "src", "common", fileName),
      path.join(process.cwd(), "dist", "common", fileName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  private readonly blocklistPath = this.resolveCommonFile("text-blocklist.json");

  private readonly manualExceptionsPath = this.resolveCommonFile(
    "text-blocklist-exceptions.json",
  );

  private readonly leaderExceptionsPath = this.resolveCommonFile(
    "leader-name-exceptions.json",
  );

  onModuleInit() {
    this.loadFromDisk();
  }

  loadFromDisk() {
    this.loadBlocklist();
    this.loadExceptions();
  }

  containsBlockedText(value: string): boolean {
    return this.findBlockedMatch(value) !== null;
  }

  findBlockedMatch(value: string): string | null {
    const normalized = this.normalize(value);
    if (!normalized) return null;

    if (this.isExceptionPhrase(normalized)) {
      return null;
    }

    const tokens = normalized
      .split(/[\s._\-&/]+/)
      .map((t) => this.canonicalize(t))
      .filter(Boolean);

    for (const token of tokens) {
      if (this.isExceptionToken(token)) {
        continue;
      }

      const match = this.findBlockedMatchInToken(token);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private findBlockedMatchInToken(token: string): string | null {
    for (const blockedWord of this.blockedCanonicalWords) {
      if (blockedWord.length <= 3) {
        if (token === blockedWord) {
          return blockedWord;
        }
        continue;
      }

      if (token === blockedWord) {
        return blockedWord;
      }

      if (token.startsWith(blockedWord) || token.endsWith(blockedWord)) {
        return blockedWord;
      }
    }

    return null;
  }

  private isExceptionPhrase(normalizedPhrase: string): boolean {
    return this.exceptionPhrases.has(normalizedPhrase);
  }

  private isExceptionToken(canonicalToken: string): boolean {
    return this.exceptionTokens.has(canonicalToken);
  }

  private loadBlocklist() {
    if (!fs.existsSync(this.blocklistPath)) {
      this.logger.warn("text-blocklist.json not found");
      this.blockedWords = new Set();
      this.blockedCanonicalWords = new Set();
      return;
    }

    const raw = fs.readFileSync(this.blocklistPath, "utf8");
    const parsed = JSON.parse(raw) as BlocklistFile;
    const words = parsed.words ?? [];

    const blockedWords = new Set<string>();
    const blockedCanonicalWords = new Set<string>();

    for (const word of words) {
      const normalized = this.normalize(word);
      if (!normalized) continue;

      const canonical = this.canonicalize(normalized);

      blockedWords.add(normalized);

      if (canonical.length >= 3) {
        blockedCanonicalWords.add(canonical);
      }
    }

    this.blockedWords = blockedWords;
    this.blockedCanonicalWords = blockedCanonicalWords;

    this.logger.log(
      `Loaded ${this.blockedWords.size} blocked words (${parsed.languages.length} languages)`,
    );
  }

  private loadExceptions() {
    const phrases = new Set<string>();
    const tokens = new Set<string>();

    for (const filePath of [
      this.manualExceptionsPath,
      this.leaderExceptionsPath,
    ]) {
      this.mergeExceptionsFile(filePath, phrases, tokens);
    }

    this.exceptionPhrases = phrases;
    this.exceptionTokens = tokens;

    this.logger.log(
      `Loaded ${this.exceptionPhrases.size} exception phrases and ${this.exceptionTokens.size} exception tokens`,
    );
  }

  private mergeExceptionsFile(
    filePath: string,
    phrases: Set<string>,
    tokens: Set<string>,
  ) {
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`${path.basename(filePath)} not found`);
      return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as ExceptionsFile;

    for (const phrase of parsed.phrases ?? []) {
      const normalized = this.normalize(phrase);
      if (!normalized) continue;

      phrases.add(normalized);

      for (const token of normalized
        .split(/[\s._\-&/]+/)
        .map((t) => this.canonicalize(t))
        .filter(Boolean)) {
        tokens.add(token);
      }
    }

    for (const token of parsed.tokens ?? []) {
      const canonical = this.canonicalize(this.normalize(token));
      if (canonical) {
        tokens.add(canonical);
      }
    }
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFKC");
  }

  private canonicalize(value: string): string {
    return value.replace(/[._\-\s]/g, "");
  }
}
