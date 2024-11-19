import { Static, TSchema } from '@sinclair/typebox';
import { Tool } from '../types/types';


type FeatureDocument<T extends TSchema> = {
  prompt: string;
  initialResponse: Static<T>;
  finalResponse: Static<T>;
}

type Feature<T extends TSchema = TSchema> = {
  schema: TSchema;
  systemPrompt?: string;
  ragPrompt: (prompt: string, items: FeatureDocument<T>[]) => string;
  models?: {
    answer?: string;
  },
  tools?: Tool;
  seed?: FeatureDocument<T>[];
}

const createFeature = <T extends TSchema>(feature: Feature<T>) => feature;

export { createFeature, type Feature, type FeatureDocument };
