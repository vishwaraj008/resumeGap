"""
PDF text extraction (PyMuPDF / fitz).

`extract_text_from_pdf` turns validated upload bytes into plain text for the skill
extractor. Raises ValueError on unreadable files or scanned/image-only PDFs that
yield no selectable text, so the caller can return a clear 400 instead of feeding
empty text downstream.
"""
import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts plain text from a PDF file's raw bytes. Raises ValueError if the file
    can't be opened or parsed (e.g. corrupted upload, password-protected, or not a real PDF)."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Could not open PDF: {e}")

    try:
        text = ""
        for page in doc:
            text += page.get_text()
    except Exception as e:
        raise ValueError(f"Could not extract text from PDF: {e}")
    finally:
        doc.close()

    if not text.strip():
        raise ValueError("PDF appears to contain no extractable text (possibly a scanned image, not real text)")

    return text