import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import { pipeline } from '@xenova/transformers';
import { TSchema } from "@sinclair/typebox";
import { FeatureDocument } from "../feature/feature.js";

const DIMENSIONS = 1024;

type DBOptions = {
  location: string;
}

const extractor = await pipeline('feature-extraction', 'mixedbread-ai/mxbai-embed-large-v1', {
  quantized: true,
});

const embed = async (documents: string[]) => {
  const output = await extractor(documents, { pooling: 'cls' });
  return output.tolist();
}

class DB<T extends TSchema> {
  #options: DBOptions;
  #tablePromise?: Promise<lancedb.Table>;

  constructor(options: DBOptions) {
    this.#options = options;
  }

  #setup = async () => {
    const { location } = this.#options;
    const db = await lancedb.connect(location);

    const schema = new arrow.Schema([
      new arrow.Field(
        "vector",
        new arrow.FixedSizeList(
          DIMENSIONS,
          new arrow.Field("item", new arrow.Float32(), true),
        ),
      ),
      new arrow.Field('prompt', new arrow.Utf8()),
      new arrow.Field('initialResponse', new arrow.Utf8()),
      new arrow.Field('finalResponse', new arrow.Utf8()),
    ]);

    return await db.createEmptyTable("history", schema, {
      mode: 'overwrite',
    });
  }

  public getTable = async () => {
    if (!this.#tablePromise) {
      this.#tablePromise = this.#setup()
      this.#tablePromise.catch(() => {
        this.#tablePromise = undefined;
      });
    }
    return await this.#tablePromise;
  }

  public add = async (items: FeatureDocument<T>[]) => {
    const table = await this.getTable();
    const vectors = await embed(
      items.map((item) => item.prompt),
    );
    await table.add(
      items.map((item, index) => ({
        prompt: item.prompt,
        initialResponse: JSON.stringify(item.initialResponse),
        finalResponse: JSON.stringify(item.finalResponse),
        vector: vectors[index],
      })),
    );
  }

  public search = async (prompt: string, limit = 10): Promise<(FeatureDocument<T> & { distance: number })[]> => {
    const [vector] = await embed([prompt]);
    const table = await this.getTable();
    const results = await table.search(vector).limit(limit).toArray();

    return results.map((result) => ({
      prompt: result.prompt,
      initialResponse: JSON.parse(result.initialResponse || '{}'),
      finalResponse: JSON.parse(result.finalResponse || '{}'),
      distance: result._distance,
    }))
  }
}

export { DB };

