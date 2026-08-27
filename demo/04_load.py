"""DEMO 04 - Step one, load the files.          (Lesson 02, section 05)

DirectoryLoader reads every matching file off disk and hands back a list of
LangChain Document objects - one per file.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

import os

from langchain_community.document_loaders import DirectoryLoader, TextLoader

from _demo import DOCS_PATH, note, section, title

title("04", "Load the documents off disk")


def load_documents(docs_path):
    # Fail loudly and early rather than silently loading nothing
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"Directory not found: {docs_path}")

    loader = DirectoryLoader(
        docs_path,
        glob="*.txt",             # only text files, ignore everything else
        loader_cls=TextLoader,    # how to read each matched file
    )

    documents = loader.load()

    if len(documents) == 0:
        raise ValueError(f"No .txt files found in {docs_path}")

    print(f"\nLoaded {len(documents)} documents")
    for doc in documents:
        source = os.path.basename(doc.metadata["source"])
        print(f"  {source:<24} {len(doc.page_content):>8,} characters")

    return documents


documents = load_documents(DOCS_PATH)

section("What one Document object actually is")
first = documents[0]
print()
print("     .page_content   the entire text of the file, as one long string")
print(f"                     {first.page_content[:64].strip()!r} ...")
print(f"                     ({len(first.page_content):,} characters in total)")
print()
print("     .metadata       a dictionary, filled in for you by the loader")
print(f"                     {first.metadata}")

note("")
note("Five files in, five Document objects out.")
note("Metadata survives everything. When a document is chunked, each chunk")
note("inherits its parent's metadata. That is how a RAG system can tell a")
note("user which file an answer came from.")

section("Two gotchas")
note("")
note("Order is not guaranteed. The loader does not read files alphabetically.")
note("Do not write code that assumes index 0 is Google. Here it is:")
note(f"  -> index 0 is {os.path.basename(documents[0].metadata['source'])}")
note("")
note("Other file types need other loaders: PyPDFLoader for PDFs, CSVLoader")
note("for CSVs, WebBaseLoader for pages. Swap loader_cls and change the glob.")
print()
