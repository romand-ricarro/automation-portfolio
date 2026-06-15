import os
import glob
from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain.embeddings.openai import OpenAIEmbeddings  # Remove/Comment out this line
# from langchain.vectorstores import Chroma                # Remove/Comment out this line

# NEW imports:
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

def build_and_save_vectorstore(transcript_folder="transcripts", persist_directory="chroma_db"):
    transcript_files = glob.glob(f"{transcript_folder}/*.txt")

    all_texts = []
    for file in transcript_files:
        with open(file, 'r', encoding='utf-8') as f:
            all_texts.append(f.read())

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    docs = []
    for text in all_texts:
        docs.extend(text_splitter.split_text(text))

    # Create embeddings from langchain_openai
    embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))

    # Build a Chroma vector store and persist to disk
    vectorstore = Chroma.from_texts(
        texts=docs,
        embedding=embeddings,
        collection_name="dish_sop",
        persist_directory=persist_directory
    )

    # If using Chroma 0.4.x+, you can remove the manual persist() if you see warnings:
    # vectorstore.persist()

    print(f"Vector store built and saved to: {persist_directory}")

if __name__ == "__main__":
    build_and_save_vectorstore("transcripts", "chroma_db")
