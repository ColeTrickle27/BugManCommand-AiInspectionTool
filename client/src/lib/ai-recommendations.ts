// Generates inspection notes and recommendations based on all form inputs and canvas data.
// Runs fully client-side – no API call needed.

import type { CanvasMarker } from "@/lib/canvas-types";
import { MARKER_CONFIG } from "@/lib/canvas-types";

export interface InspectionParams {
  // Customer / job info
  customerName: string;
  address: string;
  inspectionDate: string;
  inspectorName: string;

  // Foundation
  foundationType: string;
  foundationWalls: string;
  crawlspaceClearance: string;
  constructionType: string;

  // Key Features
  crawlspaceEncapsulated: boolean;
  partiallyEncapsulated: boolean;
  moistureBarrier: boolean;
  dehumidifierInPlace: boolean;
  dehumidifierOperational: boolean;
  dehumidifierNotOperationalReason: string;
  additionalDehumidifierNeeded: boolean;
  frenchDrainInPlace: boolean;
  sumpPumpInPlace: boolean;
  sumpPumpOperational: boolean;
  sumpPumpNotOperationalReason: string;

  // New condition/thickness fields
  encapsulationCondition?: string;
  moistureBarrierCondition?: string;
  moistureBarrierThickness?: string;

  // Findings
  findingsChecked: string[];
  findingsOther: string;

  // Canvas
  markers: CanvasMarker[];

  // Manual notes (appended/passed through but not auto-generated)
  notes: string;
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function formatDate(raw: string): string {
  if (!raw) return "an unspecified date";
  // Accept ISO (YYYY-MM-DD) or already-formatted strings
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function foundationLabel(type: string): string {
  const map: Record<string, string> = {
    crawlspace: "crawlspace",
    slab: "slab-on-grade",
    basement: "basement",
    combination: "combination",
    combo: "combination",
    other: "other",
  };
  return map[type?.toLowerCase()] ?? type ?? "unknown";
}

function constructionLabel(type: string): string {
  const map: Record<string, string> = {
    wood: "wood-frame",
    masonry: "masonry",
    brick: "brick",
    "wood-frame": "wood-frame",
    block: "block",
  };
  return map[type?.toLowerCase()] ?? type ?? "";
}

function wallsLabel(walls: string): string {
  if (!walls) return "";
  // Return as-is — values come directly from dropdown options defined in the form
  return walls;
}

function clearanceLabel(clearance: string): string {
  if (!clearance) return "";
  return clearance;
}

/** Collect moisture marker readings from the canvas using marker.moistureReading field directly. */
function getMoistureReadings(markers: CanvasMarker[]): number[] {
  const readings: number[] = [];
  markers.forEach((m) => {
    if (m.type === 'moisture' && typeof m.moistureReading === 'number' && !isNaN(m.moistureReading)) {
      readings.push(m.moistureReading);
    }
  });
  return readings;
}

/** Returns the set of unique finding marker types placed on the canvas. */
function getPlacedFindingTypes(markers: CanvasMarker[]): string[] {
  return Array.from(
    new Set(
      markers
        .filter((m) => MARKER_CONFIG[m.type]?.category === "Finding")
        .map((m) => m.type as string)
    )
  );
}

// ---------------------------------------------------------------------------
// 1. generateInspectionNotes
// ---------------------------------------------------------------------------

/**
 * Auto-generates a professional, customer-facing narrative summary of the
 * inspection based on ALL form inputs and canvas markers.
 */
export function generateInspectionNotes(params: InspectionParams): string {
  const paragraphs: string[] = [];

  // --- Opening sentence ---
  const dateStr = formatDate(params.inspectionDate);
  const addressStr = params.address?.trim() || "the subject property";
  const inspectorStr = params.inspectorName?.trim();
  const customerStr = params.customerName?.trim();

  let opening = `An inspection of the property at ${addressStr} was conducted on ${dateStr}`;
  if (inspectorStr) opening += ` by inspector ${inspectorStr}`;
  if (customerStr) opening += ` on behalf of ${customerStr}`;
  opening += ".";
  paragraphs.push(opening);

  // --- Structure description ---
  const foundLbl = foundationLabel(params.foundationType);
  const constLbl = constructionLabel(params.constructionType);
  const wallsLbl = wallsLabel(params.foundationWalls);
  const clearLbl = clearanceLabel(params.crawlspaceClearance);

  let structureParts: string[] = [];
  if (foundLbl) structureParts.push(`a ${foundLbl} foundation`);
  if (wallsLbl) structureParts.push(`${wallsLbl.toLowerCase()} foundation walls`);
  if (constLbl) structureParts.push(`${constLbl} construction`);

  let structureSentence = "";
  if (structureParts.length > 0) {
    structureSentence = `The structure features ${structureParts.join(", ")}.`;
  }

  const isCrawlspace =
    params.foundationType?.toLowerCase().includes("crawl") ||
    params.foundationType?.toLowerCase().includes("combination") ||
    params.foundationType?.toLowerCase().includes("combo");

  if (isCrawlspace && clearLbl) {
    structureSentence += ` Crawlspace clearance was noted as: ${clearLbl}.`;
  }

  if (structureSentence) paragraphs.push(structureSentence);

  // --- Key Features (crawlspace conditions) ---
  if (isCrawlspace) {
    const featureParts: string[] = [];

    if (params.crawlspaceEncapsulated) {
      featureParts.push("The crawlspace is fully encapsulated.");
    } else if (params.partiallyEncapsulated) {
      featureParts.push("The crawlspace is partially encapsulated.");
    }

    // Encapsulation condition
    if ((params.crawlspaceEncapsulated || params.partiallyEncapsulated) && params.encapsulationCondition) {
      featureParts.push(`Encapsulation condition was noted as ${params.encapsulationCondition}.`);
    }

    if (params.moistureBarrier) {
      featureParts.push("A moisture barrier is in place.");
    }

    // Moisture barrier condition and thickness
    if (params.moistureBarrier && params.moistureBarrierCondition) {
      featureParts.push(`Moisture barrier condition was noted as ${params.moistureBarrierCondition}.`);
    }
    if (params.moistureBarrier && params.moistureBarrierThickness) {
      featureParts.push(`Moisture barrier thickness: ${params.moistureBarrierThickness}.`);
    }

    if (params.dehumidifierInPlace) {
      if (params.dehumidifierOperational) {
        featureParts.push("A crawlspace dehumidifier is installed and operational.");
      } else {
        const reason = params.dehumidifierNotOperationalReason?.trim();
        featureParts.push(
          `A crawlspace dehumidifier is installed but was found to be non-operational${reason ? ` (${reason})` : ""}.`
        );
      }
      if (params.additionalDehumidifierNeeded) {
        featureParts.push("An additional dehumidifier is recommended based on crawlspace conditions.");
      }
    }

    if (params.frenchDrainInPlace) {
      featureParts.push("A French drain system is present.");
    }

    if (params.sumpPumpInPlace) {
      if (params.sumpPumpOperational) {
        featureParts.push("A sump pump is installed and operational.");
      } else {
        const reason = params.sumpPumpNotOperationalReason?.trim();
        featureParts.push(
          `A sump pump is installed but was found to be non-operational${reason ? ` (${reason})` : ""}.`
        );
      }
    }

    if (featureParts.length > 0) {
      paragraphs.push(featureParts.join(" "));
    }
  }

  // --- Moisture readings from canvas ---
  const readings = getMoistureReadings(params.markers);
  if (readings.length > 0) {
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    let moistureSentence: string;
    if (min === max) {
      moistureSentence = `Moisture readings in the crawlspace registered at ${min}%`;
    } else {
      moistureSentence = `Moisture readings in the crawlspace ranged from ${min}% to ${max}%`;
    }
    if (max > 19) {
      moistureSentence += ", indicating dangerously elevated moisture levels that require immediate attention.";
    } else if (max > 16) {
      moistureSentence += ", indicating elevated moisture levels conducive to wood decay and termite activity.";
    } else if (max > 9) {
      moistureSentence += ", which are within an acceptable range.";
    } else {
      moistureSentence += ", which are below normal levels for wood moisture.";
    }
    paragraphs.push(moistureSentence);
  }

  // --- Findings narrative ---
  const findingsSentences: string[] = [];

  const FINDING_DESCRIPTIONS: Record<string, string> = {
    "Live Termite Activity":
      "live termite activity was observed",
    "Evidence of Previous / Inactive Activity":
      "evidence of previous or inactive termite activity was identified",
    "Wood-Decaying Fungus":
      "evidence of wood-decaying fungus was present",
    "Powderpost Beetles":
      "evidence of powderpost beetle activity was found",
    "Old House Borers":
      "old house borer activity was identified",
    "Moisture Damage":
      "moisture damage to wood members was observed",
    "High Moisture":
      "elevated moisture conditions were recorded",
    "Structure Damage":
      "structural damage was noted",
    "Pipe Leak":
      "an active or recent pipe leak was identified",
    "Insulation in Poor Condition":
      "crawlspace insulation was found to be in poor condition",
    "Insulation Missing / Fallen":
      "crawlspace insulation was missing or had fallen",
    "Crawldoor in Poor Condition":
      "the crawlspace access door was found to be in poor condition",
  };

  params.findingsChecked.forEach((f) => {
    const desc = FINDING_DESCRIPTIONS[f];
    if (desc) findingsSentences.push(desc);
  });

  // Also mention finding markers placed on canvas that aren't in the checklist
  const placedFindingTypes = getPlacedFindingTypes(params.markers);
  const MARKER_FINDING_DESCRIPTIONS: Record<string, string> = {
    LT: "live termite activity was observed at locations marked on the graph",
    WDF: "wood-decaying fungus was noted at locations marked on the graph",
    OHB: "old house borer activity was noted at locations marked on the graph",
    PPB: "powderpost beetle activity was noted at locations marked on the graph",
    ETW: "earth-to-wood contact was identified at locations marked on the graph",
    X: "visible pest damage was observed at locations marked on the graph",
    MX: "visible moisture damage was observed at locations marked on the graph",
    "IN-T": "evidence of previous or inactive infestation was marked on the graph",
  };

  placedFindingTypes.forEach((type) => {
    if (type === "moisture") return; // already handled above
    const desc = MARKER_FINDING_DESCRIPTIONS[type];
    // Only add if not already captured from checklist (simple de-dup by keyword)
    if (desc && !findingsSentences.some((s) => s.includes(desc.split(" ").slice(0, 3).join(" ")))) {
      findingsSentences.push(desc);
    }
  });

  if (params.findingsOther?.trim()) {
    findingsSentences.push(`the following additional condition was noted: ${params.findingsOther.trim()}`);
  }

  if (findingsSentences.length > 0) {
    const list = findingsSentences.map(capitalize);
    let findingsParagraph: string;
    if (list.length === 1) {
      findingsParagraph = `During the inspection, ${findingsSentences[0]}.`;
    } else {
      const last = findingsSentences[findingsSentences.length - 1];
      const rest = findingsSentences.slice(0, -1);
      findingsParagraph = `During the inspection, ${rest.join("; ")}; and ${last}.`;
    }
    paragraphs.push(findingsParagraph);
  } else {
    paragraphs.push(
      "No significant pest activity or structural deficiencies were observed during the inspection."
    );
  }

  // --- Treatment markers placed ---
  const treatmentTypes = Array.from(
    new Set(
      params.markers
        .filter((m) => MARKER_CONFIG[m.type]?.category === "Treatment")
        .map((m) => m.type as string)
    )
  );
  if (treatmentTypes.length > 0) {
    const treatmentLabels = treatmentTypes.map(
      (t) => (MARKER_CONFIG as Record<string, { label: string }>)[t]?.label ?? t
    );
    paragraphs.push(
      `The following treatment method${treatmentLabels.length > 1 ? "s are" : " is"} indicated on the accompanying structure diagram: ${treatmentLabels.join(", ")}.`
    );
  }

  // --- Closing ---
  paragraphs.push(
    "This report reflects conditions observed at the time of inspection. Recommendations are provided on the following page."
  );

  return paragraphs.join("\n\n");
}

// ---------------------------------------------------------------------------
// 2. generateRecommendations
// ---------------------------------------------------------------------------

const FINDING_RECS: Record<string, string> = {
  "Live Termite Activity":
    "• Professional termite treatment is recommended",
  "Evidence of Previous / Inactive Activity":
    "• Apply preventive termite treatment to protect against future infestation",
  "Wood-Decaying Fungus":
    "• Treat affected wood with appropriate fungicide; evaluate and replace compromised structural members",
  "Powderpost Beetles":
    "• Treat affected wood; replace heavily damaged sections",
  "Old House Borers":
    "• Evaluate structural timbers; apply appropriate treatment to exposed surfaces; sister or replace severely damaged timbers",
  "Moisture Damage":
    "• Identify and correct moisture source; evaluate and replace damaged wood members as needed",
  "High Moisture":
    "• Reduce crawlspace moisture: install/upgrade vapor barrier, improve ventilation, and/or install dehumidifier",
  "Structure Damage":
    "• Have a qualified contractor evaluate and repair structural damage; replace damaged wood with pressure-treated lumber",
  "Pipe Leak":
    "• Repair pipe leak with a licensed plumber as soon as possible to eliminate moisture source",
  "Insulation in Poor Condition":
    "• Remove damaged crawlspace insulation and replace",
  "Insulation Missing / Fallen":
    "• Re-install or replace missing/fallen crawlspace insulation",
  "Crawldoor in Poor Condition":
    "• Repair or replace crawlspace access door with a properly sealed and insulated unit",
};

const MARKER_RECS: Partial<Record<string, string>> = {
  LT: "• Professional termite treatment is recommended at all marked live termite locations",
  ETW: "• Eliminate all earth-to-wood contact at marked locations (raise wood above grade or install physical barrier)",
  MX: "• Address moisture damage at marked locations to prevent further wood deterioration",
  "IN-T": "• Monitor previously active areas; consider preventive treatment at marked locations",
  WDF: "• Apply fungicide treatment at all marked wood-decaying fungus locations",
  PPB: "• Treat marked powderpost beetle locations",
  OHB: "• Treat marked old house borer locations; evaluate structural integrity of affected timbers",
  X: "• Evaluate and repair visible pest damage at marked locations",
};

/**
 * Generates SHORT, actionable bullet-point recommendations based on inspection data.
 * Descriptive details belong in generateInspectionNotes — keep this list tight.
 */
export function generateRecommendations(params: InspectionParams): string {
  const lines: string[] = [];
  const added = new Set<string>();

  function add(line: string) {
    const key = line.slice(0, 60);
    if (!added.has(key)) {
      added.add(key);
      lines.push(line);
    }
  }

  // From findings checklist
  params.findingsChecked.forEach((finding) => {
    const rec = FINDING_RECS[finding];
    if (rec) add(rec);
  });

  // From "Other" finding
  if (params.findingsOther?.trim()) {
    add(`• Evaluate and address additional finding: ${params.findingsOther.trim()}`);
  }

  // From markers placed on canvas (finding markers only; treatments noted separately)
  const placedFindingTypes = getPlacedFindingTypes(params.markers);
  placedFindingTypes.forEach((type) => {
    if (type === "moisture") return;
    const rec = (MARKER_RECS as Record<string, string | undefined>)[type];
    if (rec) add(rec);
  });

  // Moisture readings — actionable threshold recommendations
  const readings = getMoistureReadings(params.markers);
  if (readings.length > 0) {
    const max = Math.max(...readings);
    if (max > 19) {
      add("• Address dangerously high moisture readings immediately — install dehumidification and improve drainage");
    } else if (max > 16) {
      add("• Reduce elevated crawlspace moisture levels — upgrade vapor barrier and/or add dehumidification");
    }
  }

  // Non-operational dehumidifier
  if (params.dehumidifierInPlace && !params.dehumidifierOperational) {
    add("• Repair or replace non-operational crawlspace dehumidifier");
  }

  // Additional dehumidifier needed
  if (params.additionalDehumidifierNeeded) {
    add("• Install additional crawlspace dehumidifier as recommended");
  }

  // No moisture barrier in a crawlspace
  const isCrawlspace =
    params.foundationType?.toLowerCase().includes("crawl") ||
    params.foundationType?.toLowerCase().includes("combination") ||
    params.foundationType?.toLowerCase().includes("combo");

  if (isCrawlspace && !params.moistureBarrier && !params.crawlspaceEncapsulated) {
    add("• Install a vapor/moisture barrier in the crawlspace");
  }

  // Non-operational sump pump
  if (params.sumpPumpInPlace && !params.sumpPumpOperational) {
    add("• Repair or replace non-operational sump pump");
  }

  // Treatment markers on canvas — mention but keep brief
  const treatmentTypes = Array.from(
    new Set(
      params.markers
        .filter((m) => MARKER_CONFIG[m.type]?.category === "Treatment")
        .map((m) => m.type as string)
    )
  );
  if (treatmentTypes.length > 0) {
    const labels = treatmentTypes.map((t) => (MARKER_CONFIG as Record<string, { label: string }>)[t]?.label ?? t);
    add(`• Perform indicated treatment(s) as marked on diagram: ${labels.join(", ")}`);
  }

  // Re-inspection recommendation — always include if any findings
  if (
    params.findingsChecked.length > 0 ||
    params.findingsOther?.trim() ||
    params.markers.some((m) => MARKER_CONFIG[m.type]?.category === "Finding")
  ) {
    add("• Schedule follow-up re-inspection in 30 days to confirm treatment efficacy");
  }

  if (lines.length === 0) {
    return "• No significant findings identified — recommend annual re-inspection to monitor for changes";
  }

  return lines.join("\n");
}
