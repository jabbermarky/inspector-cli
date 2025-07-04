import OpenAI from "openai";
import fs from 'fs';
import { SYSTEM_PROMPT_2 } from "./prompts.js";
import { createModuleLogger } from "./utils/logger.js";
import { getConfig } from "./utils/config.js";
import { withRetryOpenAI } from "./utils/retry.js";

const logger = createModuleLogger('genai');
const BRANDI_JSON = 'asst_KetBa5TJspGM51mMsie3hBd5';

// Lazy initialization of OpenAI client to avoid requiring API key at startup
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = getConfig();
    
    // Validate OpenAI configuration strictly when actually needed
    if (!config.openai.apiKey || config.openai.apiKey.length === 0) {
      throw new Error('OPENAI_API_KEY is required for AI-powered commands. Please set it in your environment or .env file.');
    }
    
    if (!config.openai.apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY must start with "sk-"');
    }
    
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
    logger.debug('OpenAI client initialized');
  }
  return openaiClient;
}

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

  const config = getConfig();
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
    const openai = getOpenAIClient();
    const response = await withRetryOpenAI(
      () => openai.chat.completions.create(createParams),
      'OpenAI Chat API call'
    );
    if (response.choices && response.choices.length > 0 && response.choices[0].message) { 
      logger.debug('Chat API call successful', { messageLength: response.choices[0].message.content?.length });
      return { content: response.choices[0].message.content };
    } else {
      logger.warn('Chat API returned unexpected response format', { response });
      return { content: JSON.stringify(response, null, 2) };
    }

  } catch (err) {
    logger.error('Chat API call failed after retries', { error: (err as Error).message });
    return { error: (err as Error).message };
  }
}
interface fileMessageBuilderResponse {
  error?: string;
  message?: OpenAI.Beta.Threads.ThreadCreateAndRunParams.Thread.Message;
}

export async function callAssistant(params: CallAssistantParams): Promise<CallAssistantResponse> {
  logger.debug('Starting assistant API call', { params: { ...params, screenshot: params.screenshot ? '[HIDDEN]' : undefined } });
  
  if (!params.screenshot && !params.url) {
    logger.error('Missing required parameters for assistant API call');
    return { error: "no image parameter is defined" };
  }
  
  // Track uploaded files for cleanup
  const uploadedFileIds: string[] = [];
  async function fileMessageBuilder(filename: string): Promise<fileMessageBuilderResponse> {
    // Validate file exists and is readable
    if (!fs.existsSync(filename)) {
      logger.error(`File not found: ${filename}`);
      return { error: `File not found: ${filename}` };
    }
    
    try {
      const stats = fs.statSync(filename);
      if (stats.size === 0) {
        logger.error(`File is empty: ${filename}`);
        return { error: `File is empty: ${filename}` };
      }
      
      // Check file size limit (OpenAI has a 20MB limit)
      if (stats.size > 20 * 1024 * 1024) {
        logger.error(`File too large: ${filename} (${stats.size} bytes)`);
        return { error: `File too large: ${filename} (${stats.size} bytes, max 20MB)` };
      }
      
      logger.debug(`Uploading file: ${filename}`, { size: stats.size });
    } catch (err) {
      logger.error(`Error checking file: ${filename}`, { error: (err as Error).message });
      return { error: `Error checking file: ${(err as Error).message}` };
    }
    
    // upload file
    let file: OpenAI.Files.FileObject;
    try {
      const openai = getOpenAIClient();
      file = await withRetryOpenAI(
        () => openai.files.create({ file: fs.createReadStream(filename), purpose: 'vision' }),
        `File upload: ${filename}`
      );
      
      logger.debug(`File uploaded successfully: ${filename}`, { fileId: file.id });
      
      // Track file for cleanup
      uploadedFileIds.push(file.id);
      
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
      logger.error(`Failed to upload file: ${filename}`, { error: (err as Error).message });
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

    const openai = getOpenAIClient();
    const thread = await withRetryOpenAI(
      () => openai.beta.threads.create({ messages }),
      'Create thread'
    );
    const thread_id = thread.id;
    const run = await withRetryOpenAI(
      () => openai.beta.threads.runs.createAndPoll(thread_id, createPollParams),
      'Create and poll thread run'
    );

    if (run.status === 'completed') {
      const messages = await withRetryOpenAI(
        () => openai.beta.threads.messages.list(run.thread_id),
        'List thread messages'
      );
      
      // Clean up uploaded files
      await cleanupUploadedFiles(uploadedFileIds);
      
      logger.info('Assistant API call completed successfully', { threadId: run.thread_id });
      return { data: messages.data, messages, run:run };

    } else {
      logger.warn('Assistant run did not complete', { status: run.status, threadId: run.thread_id });
      
      // Clean up uploaded files even on failure
      await cleanupUploadedFiles(uploadedFileIds);
      
      return { content: JSON.stringify(run, null, 2) };
    }
  } catch (err) {
    logger.error('Assistant API call failed', { error: (err as Error).message, stack: (err as Error).stack });
    
    // Clean up uploaded files on error
    await cleanupUploadedFiles(uploadedFileIds);
    
    return { error: (err as Error).message };
  }
}

async function cleanupUploadedFiles(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  
  logger.debug('Cleaning up uploaded files', { fileIds });
  
  const openai = getOpenAIClient();
  for (const fileId of fileIds) {
    try {
      await withRetryOpenAI(
        () => openai.files.del(fileId),
        `Delete file: ${fileId}`
      );
      logger.debug(`File deleted successfully: ${fileId}`);
    } catch (err) {
      logger.warn(`Failed to delete file: ${fileId}`, { error: (err as Error).message });
      // Continue with other files even if one fails
    }
  }
}

export async function getOpenAIAssistants(): Promise<any> {
  try {
    const openai = getOpenAIClient();
    const response = await withRetryOpenAI(
      () => openai.beta.assistants.list(),
      'List OpenAI assistants'
    );
    logger.info('Successfully fetched OpenAI assistants', { count: response.data.length });
    return { list: response.data };
  } catch (err) {
    logger.error('Error fetching OpenAI assistants', { error: (err as Error).message });
    return { error: err };
  }
}
