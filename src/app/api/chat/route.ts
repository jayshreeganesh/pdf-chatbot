import { NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
const formatDocumentsAsString = (documents: any[]) => documents.map((doc) => doc.pageContent).join("\n\n");
import { RunnableSequence } from '@langchain/core/runnables';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const currentMessageContent = messages[messages.length - 1].content;

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    const retriever = vectorStore.asRetriever({
      k: 5,
    });

    const llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      streaming: true,
      temperature: 0.2,
    });

    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant analyzing an uploaded document.
Answer the user's question accurately using the context provided below. If the context does not contain enough information to answer, state clearly that the uploaded document does not appear to contain that information.

Context:
{context}

User Question: {question}
Answer:
    `);

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: (input: string) => input,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    const stream = await chain.stream(currentMessageContent);

    const iterator = (async function* () {
      for await (const chunk of stream) {
        yield chunk;
      }
    })();

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(value)}\n`));
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
