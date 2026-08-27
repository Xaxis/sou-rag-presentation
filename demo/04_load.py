"""DEMO 04 - Step one, load the files.          (Lesson 02, section 05)

Read every matching file off disk into a list of LangChain Document objects,
one per file - without the archived langchain-community loader package.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

from pathlib import Path

from langchain_core.documents import Document

from _demo import DOCS_PATH, note, section, title

title("04", "Load the documents off disk")


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

    return documents


documents = load_documents(DOCS_PATH)
print(f"\nLoaded {len(documents)} documents")
for doc in documents:
    name = doc.metadata["source"].split("/")[-1]
    print(f"  {name:<24} {len(doc.page_content):>8,} characters")



section("What one Document object actually is")
first = documents[0]
print()
print("     .page_content   the entire text of the file, as one long string")
print(f"                     {first.page_content[:64].strip()!r} ...")
print(f"                     ({len(first.page_content):,} characters in total)")
print()
print("     .metadata       a dictionary - here, the file we read it from")
print(f"                     {first.metadata}")

note("")
note("Five files in, five Document objects out.")
note("Metadata survives everything. When a document is chunked, each chunk")
note("inherits its parent's metadata. That is how a RAG system can tell a")
note("user which file an answer came from.")

section("Two gotchas")
note("")
note("We sort the files, so the order is stable and repeatable.")
note("DirectoryLoader did NOT sort - it walked the directory in whatever")
note("order the filesystem returned, which is a classic source of")
note(f"irreproducible results. Here index 0 is {documents[0].metadata['source'].split('/')[-1]}.")
note("")
note("Other formats still need real parsers: PDFs, spreadsheets, HTML. Reach")
note("for a maintained provider package then - langchain-unstructured, or")
note("pypdf directly. The output is the same: Document objects.")
print()
