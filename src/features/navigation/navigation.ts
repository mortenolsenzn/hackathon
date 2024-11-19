
import 'dotenv/config.js';
import assert from 'assert';
import { Type } from '@sinclair/typebox';
import { Copilot } from "../../copilot/copilot.js";
import { createFeature } from '../../copilot/feature/feature.js';
import { getPort } from './navigator.tools.js';
import { writeFile } from 'fs/promises';

// We need an OpenAI API key to run this
assert(process.env.OPENAI_API_KEY, 'No OPENAI_API_KEY');

const coordinate = Type.Object({
  lon: Type.String(),
  lat: Type.String(),
}, {
  additionalProperties: false,
});

const point = Type.Object({
  coordinate,
}, {
  additionalProperties: false,
})
// The schema that we want our system to fill
const schema = Type.Object({
  destination: Type.Object({
    coordinate,
  }, {
    description: 'The target distination of the voyage',
    additionalProperties: false,
  }),
  startingPoint: Type.Object({
    coordinate,
  }, {
    description: 'The starting point of the voyage',
    additionalProperties: false,
  }),
  additionalWaypoints: Type.Array(point, {
    description: 'Additional waypoint to reach along the route',
  }),
}, {
  additionalProperties: false,
});

// Our color picker feature
// This describe the core of the given feature, such as RAG prompt generation, system prompt
// models to use, tools availabel etc.
const navigator = createFeature<typeof schema>({
  schema,
  models: {
    answer: 'gpt-4o',
  },
  tools: [
    getPort,
  ],
  systemPrompt: [
    'You are responsible for taking a user input and convert it into an output in a given JSON response',
    'The request will be to create a navigational route for a vessel',
    'You will be provided with the starting position, and then based on the input you will have',
    'to find the best route to the distination and add any additional requested waypoints'
  ].join('\n'),
  ragPrompt: (prompt, items) => [
    `The user asked: ${prompt}`,
    '',
    'The vessels current position is: { lon: 56.3973616, lat: 10.9262833 }',
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
  location: './data/navigator',
  feature: navigator,
});

// Test one: fill in the form based on a user request from a cold database
const prompt1 = 'I want to get to the Singaport port and I want to go north of the Taiwan straight';
const guess1 = await copilot.guess(prompt1);

await writeFile('route.json', JSON.stringify(guess1));
console.log('guess1', guess1);
