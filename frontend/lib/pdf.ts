import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export async function exportMirathiPDFByElement(
  elementId: string,
  fileName = "mirathi-report.pdf"
) {
  const node = document.getElementById(elementId);

  if (!node) {
    throw new Error("لم يتم العثور على عنصر التقرير لتصديره.");
  }

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    skipFonts: false,
    style: {
      direction: "rtl",
      background: "#ffffff",
    },
  });

  const img = new Image();
  img.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("تعذر تجهيز صورة التقرير."));
  });

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgWidthPx = img.width;
  const imgHeightPx = img.height;

  const mmPerPx = usableWidth / imgWidthPx;
  const renderedHeightMm = imgHeightPx * mmPerPx;

  if (renderedHeightMm <= usableHeight) {
    pdf.addImage(dataUrl, "PNG", margin, margin, usableWidth, renderedHeightMm);
    pdf.save(fileName);
    return;
  }

  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");

  if (!pageContext) {
    throw new Error("تعذر إنشاء صفحة مؤقتة للتصدير.");
  }

  const sliceHeightPx = Math.max(1, Math.floor(usableHeight / mmPerPx));

  let renderedTopPx = 0;
  let pageIndex = 0;

  while (renderedTopPx < imgHeightPx) {
    const currentSliceHeightPx = Math.min(sliceHeightPx, imgHeightPx - renderedTopPx);

    pageCanvas.width = imgWidthPx;
    pageCanvas.height = currentSliceHeightPx;

    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.fillStyle = "#ffffff";
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    pageContext.drawImage(
      img,
      0,
      renderedTopPx,
      imgWidthPx,
      currentSliceHeightPx,
      0,
      0,
      imgWidthPx,
      currentSliceHeightPx
    );

    const pageData = pageCanvas.toDataURL("image/png");
    const pageRenderedHeightMm = currentSliceHeightPx * mmPerPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(pageData, "PNG", margin, margin, usableWidth, pageRenderedHeightMm);

    renderedTopPx += currentSliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(fileName);
}