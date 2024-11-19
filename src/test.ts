import 'dotenv/config.js';
import { Copilot } from "./copilot/copilot";
import assert from 'assert';
import { Type } from '@sinclair/typebox';
import { createFeature } from './copilot/feature/feature';

// We need an OpenAI API key to run this
assert(process.env.OPENAI_API_KEY, 'No OPENAI_API_KEY');

// The schema that we want our system to fill
const schema = Type.Object({
  color: Type.Object({
    r: Type.Number({
      description: 'Value between 0 and 255',
    }),
    b: Type.Number(),
    g: Type.Number(),
  }, {
    additionalProperties: false,
  })
}, {
  additionalProperties: false,
});

// Our color picker feature
// This describe the core of the given feature, such as RAG prompt generation, system prompt
// models to use, tools availabel etc.
const colorPicker = createFeature<typeof schema>({
  schema,
  models: {
    answer: 'gpt-4o-mini',
  },
  systemPrompt: [
    'You are responsible for taking a user input and convert it into an output in a given JSON response',
    'You will also be provided a list of previous similar requests',
    'When creating your answer remeber to consider these previous requests to see if it can help you provide a better result'
  ].join('\n'),
  ragPrompt: (prompt, items) => [
    `The user asked: ${prompt}`,
    '',
    'Below is a list of documents from previous times the user has performed a similar request',
    'it contains both the original prompt, your first attempt and the final version the user accepted',
    '',
    ...items.map((item) => [
      '---',
      '',
      'The user asked:',
      JSON.stringify(item.prompt),
      '',
      'You replied:',
      JSON.stringify(item.initialResponse),
      '',
      'The user actually wanted:',
      JSON.stringify(item.finalResponse),
    ]),

  ].join('\n'),
});

// We create a new "copilot" "AI" system  based on our feature
const copilot = new Copilot({
  location: './data/color-test',
  feature: colorPicker,
});

// Test one: fill in the form based on a user request from a cold database
const prompt1 = 'Set the color to something sunny'
const guess1 = await copilot.guess(prompt1);

// Save the response back into our database for future requests.
// We pretend here that the user actually changed the result #ffff00
await copilot.add([{
  prompt: prompt1,
  initialResponse: guess1,
  finalResponse: {
    color: {
      r: 255,
      b: 255,
      g: 0,
    }
  },
}]);

// We now make the same guess, but this time with the previous session in the database
// The hope is that it will now use that and output the same result as the user ended
// out choosing
const guess2 = await copilot.guess(prompt1);

// We also test the memorisation by asking the model to recall output from a previous
// request
const guess3 = await copilot.guess('Set the color to the same choose last time');

console.table({
  guess1: JSON.stringify(guess1),
  guess2: JSON.stringify(guess2),
  guess3: JSON.stringify(guess3),
});
