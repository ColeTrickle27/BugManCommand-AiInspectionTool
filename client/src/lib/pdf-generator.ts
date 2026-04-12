import jsPDF from "jspdf";
import type Konva from "konva";
import type { InspectionData } from "@/components/InspectionForm";
import type { CanvasMarker, CanvasSymbol, CanvasPhoto } from "@/lib/canvas-types";
import { MARKER_CONFIG, SYMBOL_CONFIG, FINDINGS_CHECKLIST } from "@/lib/canvas-types";

// ─── Color palette ──────────────────────────────────────────────────────────
// red:  #B91C1C  →  [185, 28, 28]
// dk:   near-black text
// mt:   muted/secondary text
// bd:   border/divider lines
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePdf(
  stageRef: React.RefObject<Konva.Stage | null>,
  data: InspectionData,
  photos: CanvasPhoto[],
  markers: CanvasMarker[],
  symbols: CanvasSymbol[],
  ftPerGrid: number,
  companyLogo?: string,  // NEW — dataURL of uploaded logo
): Promise<void> {
  const pdf = new jsPDF("p", "mm", "letter");
  const pw = 215.9;
  const ph = 279.4;
  const m = 16;
  const cw = pw - m * 2;
  let y = m;

  // ── Palette ────────────────────────────────────────────────────────────────
  const red  = [185, 28,  28]  as const;
  const dk   = [30,  30,  30]  as const;
  const mt   = [110, 110, 105] as const;
  const bd   = [210, 208, 200] as const;
  const lgrey= [240, 240, 238] as const; // logo box fill

  // ── Utilities ──────────────────────────────────────────────────────────────
  const hexToRgb = (hex: string): readonly [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as const;

  const hLine = (y1: number, color: readonly [number, number, number] = bd) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(0.25);
    pdf.line(m, y1, pw - m, y1);
  };

  const addWatermark = () => {
    pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }));
    pdf.setFontSize(48);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(150, 150, 150);
    const cx = pw / 2;
    const cy = ph / 2;
    pdf.text("HOLLOMAN EXTERMINATORS", cx, cy, { align: "center", angle: 45 });
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  };

  const footer = () => {
    const fy = ph - 8;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(mt[0], mt[1], mt[2]);
    pdf.text("Holloman Exterminators  |  Termite Inspection Report", m, fy);
    pdf.text(
      `Page ${pdf.getNumberOfPages()}  |  Generated ${new Date().toLocaleDateString()}`,
      pw - m,
      fy,
      { align: "right" },
    );
    hLine(fy - 3);
    addWatermark();
  };

  const addPage = () => {
    pdf.addPage();
    y = m;
    footer();
  };

  const checkBreak = (need: number) => {
    if (y + need > ph - m - 12) addPage();
  };

  // ── Section heading ────────────────────────────────────────────────────────
  const sectionHeading = (title: string) => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(dk[0], dk[1], dk[2]);
    pdf.text(title, m, y);
    y += 1.5;
    hLine(y, red);
    y += 4.5;
  };

  // ── Two-column label / value rows ──────────────────────────────────────────
  const infoSection = (title: string, rows: [string, string][]) => {
    const validRows = rows.filter(([, v]) => v && v.trim() !== "");
    if (validRows.length === 0) return;
    checkBreak(10 + validRows.length * 5);
    sectionHeading(title);
    pdf.setFontSize(8.5);
    validRows.forEach(([label, value]) => {
      checkBreak(5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(mt[0], mt[1], mt[2]);
      pdf.text(label + ":", m, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(dk[0], dk[1], dk[2]);
      const wrapped = pdf.splitTextToSize(value, cw - 40);
      pdf.text(wrapped, m + 40, y);
      y += 4.5 * (wrapped.length > 1 ? wrapped.length : 1);
    });
    y += 3;
  };

  // ── Wrapped text section ───────────────────────────────────────────────────
  const textSection = (title: string, text: string) => {
    if (!text || !text.trim()) return;
    checkBreak(18);
    sectionHeading(title);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(dk[0], dk[1], dk[2]);
    const lines = pdf.splitTextToSize(text, cw);
    lines.forEach((line: string) => {
      checkBreak(4.5);
      pdf.text(line, m, y);
      y += 4.2;
    });
    y += 3;
  };

  // ── Label lookup maps ──────────────────────────────────────────────────────
  const structureLabels: Record<string, string> = {
    "single-family": "Single Family Home",
    "multi-family": "Multi-Family",
    duplex: "Duplex",
    manufactured: "Manufactured Home",
    townhouse: "Townhouse",
    commercial: "Commercial Building",
    other: "Other",
  };
  const constructionLabels: Record<string, string> = {
    "wood-frame": "Wood Frame",
    block: "Block / CMU",
    brick: "Brick",
    steel: "Steel Frame",
    mixed: "Mixed",
  };
  const foundationLabels: Record<string, string> = {
    slab: "Slab",
    crawlspace: "Crawl Space",
    basement: "Basement",
    "pier-beam": "Pier & Beam",
    combination: "Combination",
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 1  —  Inspection Data
  // ══════════════════════════════════════════════════════════════════════════

  footer();

  // ── Header bar ─────────────────────────────────────────────────────────────
  const headerH = 24;
  pdf.setFillColor(red[0], red[1], red[2]);
  pdf.roundedRect(m, y, cw, headerH, 2, 2, "F");

  // Logo area (left side of header bar)
  const logoW = 60;
  const logoH = 18;
  const logoX = m + 3;
  const logoY = y + (headerH - logoH) / 2;

  if (companyLogo && companyLogo.length > 0) {
    // Render the actual uploaded logo image
    try {
      pdf.addImage(companyLogo, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      // Fallback to placeholder if image fails
      pdf.setFillColor(lgrey[0], lgrey[1], lgrey[2]);
      pdf.setDrawColor(180, 180, 178);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(logoX, logoY, logoW, logoH, 1.5, 1.5, "FD");
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(140, 140, 135);
      pdf.text("COMPANY LOGO", logoX + logoW / 2, logoY + logoH / 2 + 1, { align: "center" });
    }
  } else {
    // Fallback placeholder when no logo is uploaded
    pdf.setFillColor(lgrey[0], lgrey[1], lgrey[2]);
    pdf.setDrawColor(180, 180, 178);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(logoX, logoY, logoW, logoH, 1.5, 1.5, "FD");
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(140, 140, 135);
    pdf.text("COMPANY LOGO", logoX + logoW / 2, logoY + logoH / 2 + 1, { align: "center" });
  }

  // Company name & report type (right of logo placeholder)
  const textX = logoX + logoW + 5;
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("HOLLOMAN EXTERMINATORS", textX, y + 11);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Termite Inspection Report", textX, y + 18);

  // Date top-right inside header
  if (data.inspectionDate) {
    const dateStr = new Date(data.inspectionDate + "T12:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 220, 220);
    pdf.text(dateStr, pw - m - 4, y + 11, { align: "right" });
  }

  y += headerH + 8;

  // ── Customer Information ───────────────────────────────────────────────────
  infoSection("Customer Information", [
    ["Name",    data.customerName],
    ["Address", data.customerAddress],
    ["Phone",   data.customerPhone],
    ["Email",   data.customerEmail],
  ]);

  // ── Inspection Details ─────────────────────────────────────────────────────
  infoSection("Inspection Details", [
    ["Inspector",            data.inspectorName],
    ["Inspection Date",      data.inspectionDate
      ? new Date(data.inspectionDate + "T12:00:00").toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : ""],
    ["Structure Type",       structureLabels[data.structureType] || data.structureType],
    ["Construction",         constructionLabels[data.constructionType] || data.constructionType],
    ["Foundation",           foundationLabels[data.foundationType] || data.foundationType],
    ["Foundation Walls",     data.foundationWalls],
    ["Wall Height",          data.foundationWallHeight],
    ["Crawlspace Clearance", data.crawlspaceClearance],
    ["Linear Footage",       data.linearFootage ? `${data.linearFootage} LF` : ""],
    ["Square Footage",       data.squareFootage  ? `${data.squareFootage} SF` : ""],
  ]);

  // ── Key Features ───────────────────────────────────────────────────────────
  const keyFeatureLines: string[] = [];

  if (data.crawlspaceEncapsulated) {
    let line = "Crawlspace: Encapsulated";
    if (data.encapsulationCondition) {
      const condLabel = data.encapsulationCondition.charAt(0).toUpperCase() + data.encapsulationCondition.slice(1);
      line += ` — Condition: ${condLabel}`;
    }
    keyFeatureLines.push(line);
  } else if (data.partiallyEncapsulated) {
    let line = "Crawlspace: Partially Encapsulated";
    if (data.encapsulationCondition) {
      const condLabel = data.encapsulationCondition.charAt(0).toUpperCase() + data.encapsulationCondition.slice(1);
      line += ` — Condition: ${condLabel}`;
    }
    keyFeatureLines.push(line);
  }

  if (data.moistureBarrier) {
    let line = "Moisture Barrier: In place";
    if (data.moistureBarrierCondition) {
      const condLabel = data.moistureBarrierCondition.charAt(0).toUpperCase() + data.moistureBarrierCondition.slice(1);
      line += ` — Condition: ${condLabel}`;
    }
    if (data.moistureBarrierThickness) {
      line += `, Thickness: ${data.moistureBarrierThickness}`;
    }
    keyFeatureLines.push(line);
  }

  if (data.dehumidifierInPlace) {
    if (data.dehumidifierOperational) {
      keyFeatureLines.push("Dehumidifier: In place, Operational");
    } else {
      const reason = data.dehumidifierNotOperationalReason
        ? ` — ${data.dehumidifierNotOperationalReason}`
        : "";
      keyFeatureLines.push(`Dehumidifier: In place, Not operational${reason}`);
    }
  }
  if (data.additionalDehumidifierNeeded) {
    keyFeatureLines.push("Additional dehumidifier needed");
  }
  if (data.frenchDrainInPlace) {
    keyFeatureLines.push("French Drain: In place");
  }
  if (data.sumpPumpInPlace) {
    if (data.sumpPumpOperational) {
      keyFeatureLines.push("Sump Pump: In place, Operational");
    } else {
      const reason = data.sumpPumpNotOperationalReason
        ? ` — ${data.sumpPumpNotOperationalReason}`
        : "";
      keyFeatureLines.push(`Sump Pump: In place, Not operational${reason}`);
    }
  }

  if (keyFeatureLines.length > 0) {
    checkBreak(10 + keyFeatureLines.length * 5);
    sectionHeading("Key Features");
    pdf.setFontSize(8.5);
    keyFeatureLines.forEach((line) => {
      checkBreak(5);
      // bullet dot
      pdf.setFillColor(red[0], red[1], red[2]);
      pdf.circle(m + 1.5, y - 1.2, 1, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(dk[0], dk[1], dk[2]);
      const wrapped = pdf.splitTextToSize(line, cw - 8);
      pdf.text(wrapped, m + 5, y);
      y += 4.5 * Math.max(wrapped.length, 1);
    });
    y += 3;
  }

  // ── Findings Checklist ─────────────────────────────────────────────────────
  if (data.findingsChecked.length > 0 || data.findingsOther) {
    checkBreak(10 + (data.findingsChecked.length + (data.findingsOther ? 1 : 0)) * 5);
    sectionHeading("Findings");
    pdf.setFontSize(8.5);

    data.findingsChecked.forEach((item) => {
      checkBreak(5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(red[0], red[1], red[2]);
      pdf.text("☑", m, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(dk[0], dk[1], dk[2]);
      pdf.text(item, m + 5, y);
      y += 4.5;
    });

    if (data.findingsOther) {
      checkBreak(5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(red[0], red[1], red[2]);
      pdf.text("☑", m, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(dk[0], dk[1], dk[2]);
      pdf.text(`Other: ${data.findingsOther}`, m + 5, y);
      y += 4.5;
    }
    y += 3;
  }

  // ── Notes & Recommendations ────────────────────────────────────────────────
  textSection("Inspection Notes",   data.notes);
  textSection("Recommendations",    data.recommendations);

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 2  —  Structure Diagram  (full page, legend overlaid)
  // ══════════════════════════════════════════════════════════════════════════

  if (stageRef.current) {
    addPage();

    // Section title
    sectionHeading("Structure Diagram");

    try {
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 3 });

      const stageW = stageRef.current.width();
      const stageH = stageRef.current.height();
      const ratio  = stageW / stageH;

      // Reserve space: full content area minus title strip and footer gap
      const maxW = cw;
      const maxH = ph - m * 2 - 20; // leaves room for title and footer
      let imgW: number;
      let imgH: number;
      if (ratio > maxW / maxH) {
        imgW = maxW;
        imgH = maxW / ratio;
      } else {
        imgH = maxH;
        imgW = maxH * ratio;
      }

      // Center horizontally
      const imgX = m + (cw - imgW) / 2;

      checkBreak(imgH + 4);
      pdf.setDrawColor(bd[0], bd[1], bd[2]);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(imgX, y, imgW, imgH, 1, 1, "S");
      pdf.addImage(dataUrl, "PNG", imgX + 0.5, y + 0.5, imgW - 1, imgH - 1);

      // ── Overlaid legend (bottom-left corner of diagram) ──────────────────
      const usedMarkerTypes = [...new Set(markers.map((mk) => mk.type))];
      const usedSymbolTypes = [...new Set(symbols.map((s)  => s.type))];

      if (usedMarkerTypes.length > 0 || usedSymbolTypes.length > 0) {
        const legendLineH = 4.2;
        const legendPad   = 3;
        const markerCount = usedMarkerTypes.length > 0 ? usedMarkerTypes.length + 1 : 0; // +1 heading
        const symbolCount = usedSymbolTypes.length > 0 ? usedSymbolTypes.length + 1 : 0;
        const totalLines  = markerCount + symbolCount;
        const legendH     = totalLines * legendLineH + legendPad * 2;
        const legendW     = 68;
        const legendX     = imgX + 2;
        const legendY     = y + imgH - legendH - 2;

        // Semi-transparent white background
        pdf.setFillColor(255, 255, 255);
        pdf.setGState(new (pdf as any).GState({ opacity: 0.88 }));
        pdf.roundedRect(legendX, legendY, legendW, legendH, 1.5, 1.5, "F");
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

        pdf.setDrawColor(180, 178, 170);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(legendX, legendY, legendW, legendH, 1.5, 1.5, "S");

        let ly = legendY + legendPad + legendLineH - 1;

        pdf.setFontSize(7);

        if (usedMarkerTypes.length > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(mt[0], mt[1], mt[2]);
          pdf.text("MARKERS", legendX + legendPad, ly);
          ly += legendLineH;

          usedMarkerTypes.forEach((type) => {
            const cfg = MARKER_CONFIG[type];
            const rgb = hexToRgb(cfg.color);
            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            if (cfg.shape === "square" || cfg.shape === "dashed-line") {
              pdf.roundedRect(legendX + legendPad, ly - 2.5, 4, 4, 0.4, 0.4, "F");
            } else {
              pdf.circle(legendX + legendPad + 2, ly - 0.8, 2, "F");
            }
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(dk[0], dk[1], dk[2]);
            const label = cfg.label.length > 28 ? cfg.label.slice(0, 26) + "…" : cfg.label;
            pdf.text(`${cfg.abbr}  ${label}`, legendX + legendPad + 6, ly);
            ly += legendLineH;
          });
        }

        if (usedSymbolTypes.length > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(mt[0], mt[1], mt[2]);
          pdf.text("SYMBOLS", legendX + legendPad, ly);
          ly += legendLineH;

          usedSymbolTypes.forEach((type) => {
            const cfg = SYMBOL_CONFIG[type];
            const rgb = hexToRgb(cfg.color);
            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            pdf.roundedRect(legendX + legendPad, ly - 2.5, 4, 4, 0.4, 0.4, "F");
            pdf.setFontSize(4.5);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(255, 255, 255);
            pdf.text(cfg.abbr.replace(/[^\x00-\x7F]/g, "?"), legendX + legendPad + 2, ly - 0.3, { align: "center" });
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(dk[0], dk[1], dk[2]);
            const label = cfg.label.length > 28 ? cfg.label.slice(0, 26) + "…" : cfg.label;
            pdf.text(`${cfg.abbr}  ${label}`, legendX + legendPad + 6, ly);
            ly += legendLineH;
          });
        }
      }

      y += imgH + 4;
    } catch (err) {
      console.error("Canvas export error:", err);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(mt[0], mt[1], mt[2]);
      pdf.text("(Diagram unavailable)", m, y);
      y += 8;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 3+  —  Inspection Photos  (separate page, only if photos exist)
  // ══════════════════════════════════════════════════════════════════════════

  // ---- Photo index label helper (A, B, C ... Z, AA, AB ...) ----
  const photoLabel = (idx: number): string => {
    let label = '';
    let n = idx;
    do {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
  };

  if (photos.length > 0) {
    addPage();

    sectionHeading("Inspection Photos");

    const cols      = 2;
    const gap       = 4;
    const photoW    = (cw - gap * (cols - 1)) / cols;
    const photoH    = 54;
    const captionH  = 8;
    const rowH      = photoH + captionH + gap;
    const rowsPerPage = 3;
    let rowOnPage   = 0;

    for (let i = 0; i < photos.length; i += cols) {
      // Start a new page after every 3 rows (except first group which starts fresh)
      if (rowOnPage >= rowsPerPage) {
        addPage();
        sectionHeading("Inspection Photos (continued)");
        rowOnPage = 0;
      }

      checkBreak(rowH);

      for (let j = 0; j < cols && i + j < photos.length; j++) {
        const photoIdx = i + j;
        const photo = photos[photoIdx];
        const xPos  = m + j * (photoW + gap);
        const lbl = photoLabel(photoIdx);

        try {
          pdf.setDrawColor(bd[0], bd[1], bd[2]);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(xPos, y, photoW, photoH, 1, 1, "S");
          pdf.addImage(photo.dataUrl, "JPEG", xPos + 0.5, y + 0.5, photoW - 1, photoH - 1);
        } catch (err) {
          console.error("Photo render error:", err);
          // Draw placeholder
          pdf.setFillColor(lgrey[0], lgrey[1], lgrey[2]);
          pdf.roundedRect(xPos, y, photoW, photoH, 1, 1, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(mt[0], mt[1], mt[2]);
          pdf.text("Photo unavailable", xPos + photoW / 2, y + photoH / 2, { align: "center" });
        }

        // Photo identifier badge (top-left corner) — matches canvas icon label
        const badgeSize = 7;
        pdf.setFillColor(red[0], red[1], red[2]);
        pdf.roundedRect(xPos + 1, y + 1, badgeSize, badgeSize, 1, 1, "F");
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(lbl, xPos + 1 + badgeSize / 2, y + 1 + badgeSize / 2 + 1, { align: "center" });

        // Caption with identifier prefix
        const captionText = photo.caption ? `${lbl}: ${photo.caption}` : `Photo ${lbl}`;
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(mt[0], mt[1], mt[2]);
        pdf.text(captionText, xPos, y + photoH + 5, { maxWidth: photoW });
      }

      y += rowH;
      rowOnPage++;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SAVE
  // ══════════════════════════════════════════════════════════════════════════

  const safeName = data.customerName
    ? data.customerName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_")
    : "Report";
  const dateStamp = data.inspectionDate || new Date().toISOString().split("T")[0];
  pdf.save(`Termite_Report_${safeName}_${dateStamp}.pdf`);
}
