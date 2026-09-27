import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Blob
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    
    // Load PDF
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    // Split text
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

    // Store in Pinecone
    await PineconeStore.fromDocuments(splitDocs, new OpenAIEmbeddings(), {
      pineconeIndex,
      maxConcurrency: 5, // Maximum number of batch requests to allow at once.
    });

    return NextResponse.json({ success: true, message: "PDF indexed successfully" });
  } catch (error: any) {
    console.error("Error indexing PDF:", error);
    return NextResponse.json({ error: error.message || "Failed to index PDF" }, { status: 500 });
  }
}
