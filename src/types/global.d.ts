// PDF.js types
declare module 'pdfjs-dist' {
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNum: number): Promise<PDFPageProxy>;
  }
  interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }
  interface PDFTextContent {
    items: Array<{ str: string }>;
  }
  function getDocument(params: { data: ArrayBuffer }): { promise: Promise<PDFDocumentProxy> };
  const GlobalWorkerOptions: { workerSrc: string };
}
declare module 'pdfjs-dist/build/pdf.worker.min.js' {}
