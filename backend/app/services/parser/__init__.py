"""
Parser service - registry for PDF format parsers.
"""
from typing import Protocol, BinaryIO, Dict, Any, runtime_checkable


@runtime_checkable
class PDFParserProtocol(Protocol):
    """Protocol that all PDF parsers must implement."""
    def parse(self, file_obj: BinaryIO, filename: str) -> Dict[str, Any]: ...


# Registry mapping format keys to parser instances
PDF_FORMAT_REGISTRY: Dict[str, PDFParserProtocol] = {}


def _register_parsers():
    """Lazy registration to avoid circular imports."""
    if PDF_FORMAT_REGISTRY:
        return

    from app.services.pdf_parser import pdf_parser
    PDF_FORMAT_REGISTRY["ccna"] = pdf_parser

    from app.services.parser.cc_parser import cc_parser
    PDF_FORMAT_REGISTRY["cc"] = cc_parser


def get_pdf_parser(format: str) -> PDFParserProtocol:
    """Get a PDF parser by format key. Raises ValueError if unknown."""
    _register_parsers()
    if format not in PDF_FORMAT_REGISTRY:
        available = ", ".join(PDF_FORMAT_REGISTRY.keys())
        raise ValueError(f"Unknown PDF format '{format}'. Available: {available}")
    return PDF_FORMAT_REGISTRY[format]


def get_available_pdf_formats() -> list[str]:
    """Return list of available PDF format keys."""
    _register_parsers()
    return list(PDF_FORMAT_REGISTRY.keys())
