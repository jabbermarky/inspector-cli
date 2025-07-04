import OpenAI from "openai";
import fs from 'fs';
import { SYSTEM_PROMPT_2 } from "./prompts.js";
import { createModuleLogger } from "./utils/logger.js";
import { getConfig } from "./utils/config.js";

const logger = createModuleLogger('genai');
const config = getConfig();

const openai = new OpenAI({ apiKey: config.openai.apiKey });
const BRANDI_JSON = 'asst_KetBa5TJspGM51mMsie3hBd5';

export interface CallAssistantParams {
  screenshot?: string | Array<string>; // filename
  url?: string;
  model?: string;
  prompt?: string;
  assistant?: string; // assistant id
  temperature?: number;
  top_p?: number;
}

export interface CallAssistantResponse {
  content?: string | null;
  error?: string;
  data?: any;
  messages?: any;
  run?: OpenAI.Beta.Threads.Runs.Run;
}

function readBase64File(filePath: string): string | null {
  // Read the file as binary data
  const fileData = fs.readFileSync(filePath);

  if (fileData) {
    // Convert the binary data to Base64
    const base64Data = fileData.toString('base64');
    return base64Data;
  }
  return null;
}

export async function callChat(params: CallAssistantParams): Promise<CallAssistantResponse> {
  logger.debug('Starting chat API call', { params: { ...params, screenshot: params.screenshot ? '[HIDDEN]' : undefined } });
  
  if (!params.screenshot && !params.url) {
    logger.error('Missing required parameters for chat API call');
    return { error: "no image parameter is defined" };
  }

  const createParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: params.model || config.openai.model,
    response_format: { "type": "json_object" },
    messages: [],
    max_tokens: config.openai.maxTokens,
    temperature: params.temperature || config.openai.temperature,
    top_p: params.top_p || config.openai.topP,
  }

  logger.info('Calling OpenAI Chat API', { model: createParams.model, maxTokens: createParams.max_tokens });

  if (params.screenshot && typeof params.screenshot === 'string') {
    logger.debug(`Processing single screenshot file: ${params.screenshot}`);
    // Validate file path
    if (!fs.existsSync(params.screenshot)) {
      logger.error(`Screenshot file not found: ${params.screenshot}`);
      return { error: "screenshot file does not exist" };
    }
    // Proceed with processing screenshot file
    try {
      // Read the file as base64 encoded data
      const base64_image: string | null = readBase64File(params.screenshot);
      createParams.messages = [
        { role: "system", content: SYSTEM_PROMPT_2 },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64_image}`, detail: "high" }
            }
          ]
        }
      ];
    } catch (err) {
      return { error: (err as Error).message };
    }
  } else if (params.screenshot && Array.isArray(params.screenshot)) {
    console.log(`callChat screenshot is ${JSON.stringify(params.screenshot,null,2)}`);
    const images: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    for (const screenshot of params.screenshot) {
      // Validate file path
      if (!fs.existsSync(screenshot)) {
        return { error: `screenshot file does not exist: ${screenshot}` };
      }
      // Proceed with processing screenshot file
      try {
        // Read the file as base64 encoded data
        const base64_image: string | null = readBase64File(screenshot);
        images.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64_image}`, detail: "high" }
            }
          ]
        });
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
    createParams.messages = [
      { role: "system", content: SYSTEM_PROMPT_2 },
      ...images
    ];
  }

  // Call the OpenAI API with createParams
  try {
    const response = await openai.chat.completions.create(createParams);
    if (response.choices && response.choices.length > 0 && response.choices[0].message) { 
      //console.log('callChat response', JSON.stringify(response.choices[0].message, null, 2));
      return { content: response.choices[0].message.content };
    } else {
      console.log('callChat response', JSON.stringify(response, null, 2));
      return { content: JSON.stringify(response, null, 2) };
    }

  } catch (err) {
    return { error: (err as Error).message };
  }
}
interface fileMessageBuilderResponse {
  error?: string;
  message?: OpenAI.Beta.Threads.ThreadCreateAndRunParams.Thread.Message;
}

export async function callAssistant(params: CallAssistantParams): Promise<CallAssistantResponse> {
  if (!params.screenshot && !params.url) {
    return { error: "no image parameter is defined" };
  }
  async function fileMessageBuilder( filename:string): Promise<fileMessageBuilderResponse> {
    // upload file
    let file: OpenAI.Files.FileObject;
    try {
      file = await openai.files.create({ file: fs.createReadStream(filename), purpose: 'vision' });
      const message: OpenAI.Beta.Threads.ThreadCreateAndRunParams.Thread.Message = {
        role: "user",
        content: [
          {
            "type": "image_file",
            "image_file": {
              "file_id": file.id,
              "detail": "auto",
            }
          }
        ]
      }
      return { message };    
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  try {
    const messages: OpenAI.Beta.Threads.ThreadCreateAndRunParams.Thread.Message[] = [];

    if (params.url && !params.screenshot) {
      messages.push({ role: "user", content: `What can you tell me about ${params.url}?` });
    } else if (params.screenshot && typeof params.screenshot === 'string') {
      // single file in params.screenshot
      const fileMessageResponse = await fileMessageBuilder(params.screenshot);
      if (fileMessageResponse.message) {
        messages.push(fileMessageResponse.message);
      } else {
        return { error: fileMessageResponse.error };
      }
    } else if (params.screenshot && Array.isArray(params.screenshot)) {
      for (const screenshot of params.screenshot) {
        // multiple files in params.screenshot
        const fileMessageResponse = await fileMessageBuilder(screenshot);
        if (fileMessageResponse.message) {
          messages.push(fileMessageResponse.message);
        } else {
          return { error: fileMessageResponse.error };
        }
      }
    }
    const createPollParams: OpenAI.Beta.Threads.ThreadCreateAndRunPollParams = {
      assistant_id: params.assistant || BRANDI_JSON
    };
    if (params.assistant) {
      console.log('using assistant id: ', params.assistant);
    }
    if (params.model) {
      console.log('using model: ', params.model);
      createPollParams.model = params.model;
    }
    if (params.temperature) {
      console.log('using temperature: ', params.temperature);
      createPollParams.temperature = params.temperature;
    }
    if (params.top_p) {
      console.log('using top_p: ', params.top_p);
      createPollParams.top_p = params.top_p;
    }

    const thread = await openai.beta.threads.create({ messages });
    const thread_id = thread.id;
    const run = await openai.beta.threads.runs.createAndPoll(thread_id, createPollParams);

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(
        run.thread_id
      );
      //console.log('run', JSON.stringify(run, null, 2));
      return { data: messages.data, messages, run:run };

    } else {
      console.log(run.status);
      return { content: JSON.stringify(run, null, 2) };
    }
  } catch (err) {
    console.error("Got error calling OpenAI assistant", err);
    console.log("stack: ", JSON.stringify((err as Error), null, 2));
    return { error: (err as Error).message };
  }
}

export async function getOpenAIAssistants(): Promise<any> {
  try {
    const response = await openai.beta.assistants.list();
    return { list: response.data };
  } catch (err) {
    console.error("Error fetching OpenAI assistants:", err);
    return { error: err };
  }
}
