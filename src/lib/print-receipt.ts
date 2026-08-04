const RECEIPT_WIDTH_MM = 80;
const CSS_PIXELS_PER_MM = 96 / 25.4;
const PRINT_PAGE_STYLE_ID = "receipt-print-page-size";

export function printReceipt() {
  const receipt = document.querySelector<HTMLElement>(".receipt-ticket");

  if (!receipt) {
    return;
  }

  receipt.classList.add("receipt-ticket--measuring");
  const heightInPixels = receipt.getBoundingClientRect().height;
  receipt.classList.remove("receipt-ticket--measuring");

  // Round upward so fractional layout pixels never clip the final receipt row.
  const heightInMillimeters =
    Math.ceil((heightInPixels / CSS_PIXELS_PER_MM) * 100) / 100;
  const existingStyle = document.getElementById(PRINT_PAGE_STYLE_ID);
  const pageStyle = existingStyle ?? document.createElement("style");

  pageStyle.id = PRINT_PAGE_STYLE_ID;
  pageStyle.textContent = `
    @media print {
      @page {
        size: ${RECEIPT_WIDTH_MM}mm ${heightInMillimeters}mm;
        margin: 0;
      }

      html,
      body {
        height: ${heightInMillimeters}mm !important;
        min-height: ${heightInMillimeters}mm !important;
        max-height: ${heightInMillimeters}mm !important;
      }
    }
  `;

  if (!existingStyle) {
    document.head.appendChild(pageStyle);
  }

  window.print();
}
