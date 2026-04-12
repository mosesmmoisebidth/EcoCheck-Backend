declare module 'svg-to-pdfkit' {
  import type PDFDocument from 'pdfkit';

  type SvgToPdfOptions = {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
  };

  const SVGtoPDF: (doc: PDFDocument, svg: string, x: number, y: number, options?: SvgToPdfOptions) => void;

  export default SVGtoPDF;
}
