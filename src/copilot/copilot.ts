import { Static, TSchema } from "@sinclair/typebox";
import { Feature, FeatureDocument } from "./feature/feature.js";
import { DB } from "./db/db.js";
import { guess } from "./guess/guess.js";
import { DialogMessage } from "./types/types.js";

type CopilotOptions<T extends TSchema> = {
  feature: Feature<T>;
  location: string;
}

class Copilot<T extends TSchema> {
  #options: CopilotOptions<T>;
  #dbPromise?: Promise<DB<T>>;

  constructor(options: CopilotOptions<T>) {
    this.#options = options;
  }

  #setup = async () => {
    const { location, feature } = this.#options;
    const db = new DB<T>({
      location,
    });

    if (feature.seed) {
      await db.add(feature.seed);
    }

    return db;
  }

  public getDb = async () => {
    if (!this.#dbPromise) {
      this.#dbPromise = this.#setup();
      this.#dbPromise.catch(() => {
        this.#dbPromise = undefined;
      });
    }
    return await this.#dbPromise;
  }

  public add = async (items: FeatureDocument<T>[]) => {
    const db = await this.getDb();
    await db.add(items);
  }

  public guess = async (prompt: string) => {
    const { feature } = this.#options;
    const db = await this.getDb();
    const items = await db.search(prompt, 5);
    const ragPrompt = feature.ragPrompt(prompt, items);
    const dialog: DialogMessage[] = [];

    if (feature.systemPrompt) {
      dialog.push({
        role: 'system',
        content: feature.systemPrompt,
      });
    }

    dialog.push({
      role: 'user',
      content: ragPrompt,
    })

    const result = await guess({
      dialog,
      schema: feature.schema,
      model: feature.models?.answer,
      tools: feature.tools,
    });

    if (!result) {
      throw new Error('No response from LLM');
    }

    return JSON.parse(result) as Static<T>;
  }
}

export { Copilot };
