import OpenAI from 'openai';
import { TSchema } from '@sinclair/typebox';
import { logger } from '../../logger.js';
import { DialogMessage, Tool } from '../types/types.js';

type GuessOptions<T extends TSchema> = {
  maxTokens?: number;
  dialog: DialogMessage[];
  schema: T;
  tools?: Tool[];
  model?: string;
}
const guess = async <T extends TSchema>(options: GuessOptions<T>) => {
  const guessLogger = logger.child({
    action: 'guess',
  });

  const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
  });

  guessLogger.debug({
    input: options,
  }, 'Running guess')

  if (options.tools) {
    const runner = client.beta.chat.completions.runTools({
      messages: options.dialog,
      max_tokens: options.maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'output',
          strict: true,
          schema: options.schema,
        },
      },
      tools: options.tools?.map((tool) => ({
        type: 'function',
        function: {
          function: (input) => {
            logger.info({
              action: 'tool-call',
              descption: tool.description,
              input,
            })
            return tool.handle(input);
          },
          parse: JSON.parse,
          description: tool.description,
          parameters: tool.input,
        },
      })) || [],
      model: options.model || 'gpt-4o-mini',
    })
    const finalContent = await runner.finalContent();

    return finalContent;
  } else {
    const completion = await client.chat.completions.create({
      messages: options.dialog,
      max_tokens: options.maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'output',
          strict: true,
          schema: options.schema,
        },
      },
      model: options.model || 'gpt-4o-mini',
    })

    return completion.choices[0]?.message?.content;
  }
}

export { guess };
