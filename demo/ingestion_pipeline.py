"""The finished ingestion pipeline from Lesson 02.

This is the file the lesson builds, kept deliberately plain: no caching, no
presentation helpers, no flags. Sixty lines of Python that turn a folder of
text files into a searchable vector database.

    python ingestion_pipeline.py

The numbered demo scripts in this folder take these same steps apart one at
a time for the presentation. This is the whole thing, assembled.
"""
from pathlib import Path

from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

load_dotenv()

DOCS_PATH = "docs"
DB_PATH = "db_chroma"


def load_documents(docs_path):
    """Read every .txt file into a LangChain Document.

    Most tutorials reach for DirectoryLoader from langchain-community here.
    That package was archived in May 2026, and for plain text files it was
    only ever doing this: read the file, attach the path as metadata. Doing
    it by hand removes a dead dependency and shows what a "loader" really is.
    """
    folder = Path(docs_path)
    if not folder.is_dir():
        raise FileNotFoundError(f"Directory not found: {docs_path}")

    documents = [
        Document(
            page_content=path.read_text(encoding="utf-8"),
            metadata={"source": f"{docs_path}/{path.name}"},
        )
        for path in sorted(folder.glob("*.txt"))
    ]

    if len(documents) == 0:
        raise ValueError(f"No .txt files found in {docs_path}")

    print(f"Loaded {len(documents)} documents")
    for doc in documents:
        print(f"  {doc.metadata['source']:24} {len(doc.page_content):>8,} characters")

    return documents


def split_documents(documents, chunk_size=800, chunk_overlap=100):
    splitter = CharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separator="\n\n",         # prefer to break at paragraph boundaries
    )

    chunks = splitter.split_documents(documents)

    print(f"Split {len(documents)} documents into {len(chunks)} chunks")
    for chunk in chunks[:3]:
        print(f"  {chunk.metadata['source']} | {chunk.page_content[:70]}...")

    return chunks


def create_vector_store(chunks, db_path):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=db_path,
        collection_metadata={"hnsw:space": "cosine"},
    )

    print(f"Stored {len(chunks)} vectors in {db_path}/")
    return vector_store


def main():
    documents = load_documents(DOCS_PATH)
    chunks = split_documents(documents)
    create_vector_store(chunks, DB_PATH)


if __name__ == "__main__":
    main()
