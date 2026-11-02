/**
 * PDF Parsing Utility for CUK ESE Result PDFs
 * 
 * Parses university End Semester Examination result PDFs into structured data.
 * The expected format has:
 * - A header row with subject codes and CIA(50)/ESE(50) sub-columns
 * - Data rows with enrollment numbers followed by marks
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface EseResultRow {
  enrollmentNo: string;
  subjectCode: string;
  ciaMark: number | null;
  eseMark: number | null;
  totalMark: number | null;
}

export interface ParsedEseResult {
  rows: EseResultRow[];
  subjectCodes: string[];
  errors: string[];
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName: string;
}

/**
 * Extract text items from a PDF file with positional information
 */
async function extractTextItems(file: File): Promise<TextItem[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allPageItems: TextItem[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items
      .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item && item.str.trim().length > 0)
      .map(item => ({
        str: item.str.trim(),
        transform: item.transform as number[],
        width: item.width,
        height: item.height,
        dir: item.dir,
        fontName: item.fontName,
      }));
    allPageItems.push(items);
  }

  return allPageItems;
}

// pdf.js transform is always [a, b, c, d, x, y]
const xOf = (item: TextItem): number => item.transform[4] ?? 0;
const yOf = (item: TextItem): number => item.transform[5] ?? 0;

/**
 * Group text items into rows based on their Y-coordinate
 */
function groupIntoRows(items: TextItem[], tolerance = 3): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y (descending, since PDF Y goes bottom-up) then by X
  const sorted = [...items].sort((a, b) => {
    const yDiff = yOf(b) - yOf(a);
    if (Math.abs(yDiff) > tolerance) return yDiff;
    return xOf(a) - xOf(b);
  });

  const [first, ...rest] = sorted as [TextItem, ...TextItem[]];
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [first];
  let currentY = yOf(first);

  for (const item of rest) {
    if (Math.abs(yOf(item) - currentY) <= tolerance) {
      currentRow.push(item);
    } else {
      // Sort current row by X position
      currentRow.sort((a, b) => xOf(a) - xOf(b));
      rows.push(currentRow);
      currentRow = [item];
      currentY = yOf(item);
    }
  }
  
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => xOf(a) - xOf(b));
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Detect if a string looks like a CUK enrollment number
 * Format: 2324CUKmrXX or similar patterns
 */
function isEnrollmentNumber(str: string): boolean {
  // Common CUK enrollment patterns
  return /^\d{4}CUK/i.test(str) || /^CUK/i.test(str);
}

/**
 * Detect if a string looks like a subject code
 * Format: BT-201, BTCS-602, BT-208 L, etc.
 */
function isSubjectCode(str: string): boolean {
  return /^[A-Z]{2,4}S?-?\d{3,4}\s*L?$/i.test(str.replace(/\s+/g, ''));
}

/**
 * Check if text contains CIA/ESE header patterns
 */
function isCiaEseHeader(str: string): boolean {
  return /CIA\s*\(?/i.test(str) || /ESE\s*\(?/i.test(str);
}

/**
 * Parse a number from a string, returning null for non-numeric or absent values
 */
function parseMarkValue(str: string): number | null {
  if (!str || str === '-' || str === '' || /^AB$/i.test(str) || /^absent$/i.test(str)) {
    return null;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Main parsing function for CUK ESE Result PDFs
 * 
 * The PDF format has:
 * - Subject code headers across the top (e.g., BT-201, BT-204, etc.)
 * - Under each subject: CIA(50) and ESE(50) sub-columns
 * - Enrollment numbers in the first column
 * - Marks in corresponding cells
 */
export async function parseEseResultPdf(file: File): Promise<ParsedEseResult> {
  const errors: string[] = [];
  const allRows: EseResultRow[] = [];
  const subjectCodesSet = new Set<string>();

  try {
    const pageItems = await extractTextItems(file);

    for (const items of pageItems) {
      const textRows = groupIntoRows(items);
      
      if (textRows.length < 3) {
        continue; // Need at least header + subheader + one data row
      }

      // Find the header row with subject codes
      let subjectHeaderRowIdx = -1;
      let ciaEseHeaderRowIdx = -1;
      const subjectCodes: { code: string; xPos: number }[] = [];

      for (const [i, row] of textRows.slice(0, 15).entries()) {
        const rowText = row.map(item => item.str).join(' ');
        
        // Look for the row containing subject codes
        const subjectItems = row.filter(item => isSubjectCode(item.str));
        if (subjectItems.length >= 2) {
          subjectHeaderRowIdx = i;
          subjectItems.forEach(item => {
            const code = item.str.replace(/\s+/g, ' ').trim();
            subjectCodes.push({ code, xPos: xOf(item) });
            subjectCodesSet.add(code);
          });
        }

        // Look for CIA/ESE sub-header row
        if (isCiaEseHeader(rowText) && subjectHeaderRowIdx !== -1) {
          ciaEseHeaderRowIdx = i;
          break;
        }
      }

      if (subjectHeaderRowIdx === -1) {
        // Try alternative: look for subject codes merged with CIA/ESE in a single table format
        errors.push('Could not detect subject code header row on one page. Attempting alternative parsing...');
        continue;
      }

      // Determine column positions for CIA and ESE marks
      // Each subject has 2 sub-columns: CIA and ESE
      // We need to map X positions to subject + type (CIA/ESE)
      interface ColumnMapping {
        subjectCode: string;
        type: 'cia' | 'ese';
        xMin: number;
        xMax: number;
      }

      const columnMappings: ColumnMapping[] = [];

      if (ciaEseHeaderRowIdx !== -1) {
        const ciaEseRow = textRows[ciaEseHeaderRowIdx] ?? [];
        const markHeaders = ciaEseRow.filter(item => 
          /CIA/i.test(item.str) || /ESE/i.test(item.str)
        );

        // Sort by X position
        markHeaders.sort((a, b) => xOf(a) - xOf(b));

        // Pair CIA/ESE headers with their subject codes
        // Assuming they alternate: CIA, ESE, CIA, ESE, ...
        let subjectIdx = 0;
        for (const [h, header] of markHeaders.entries()) {
          const type = /CIA/i.test(header.str) ? 'cia' : 'ese';
          
          if (type === 'cia') {
            subjectIdx = Math.floor(h / 2);
          }

          const subject = subjectCodes[subjectIdx];
          if (subject) {
            const nextHeader = markHeaders[h + 1];
            columnMappings.push({
              subjectCode: subject.code,
              type,
              xMin: xOf(header) - 5,
              xMax: nextHeader ? xOf(nextHeader) - 5 : xOf(header) + 60,
            });
          }

          if (type === 'ese') {
            subjectIdx++;
          }
        }
      } else {
        // Fallback: assume columns alternate CIA/ESE after enrollment column
        // and distribute evenly
        errors.push('CIA/ESE sub-header row not clearly detected. Using positional fallback.');
      }

      // Now parse data rows (rows after the header rows)
      const dataStartIdx = Math.max(subjectHeaderRowIdx, ciaEseHeaderRowIdx) + 1;

      for (const row of textRows.slice(dataStartIdx)) {
        if (row.length < 2) continue;

        // Find enrollment number in this row
        const enrollmentItem = row.find(item => isEnrollmentNumber(item.str));
        if (!enrollmentItem) continue;

        const enrollmentNo = enrollmentItem.str.trim();

        // Get mark values by matching X positions to column mappings
        if (columnMappings.length > 0) {
          // Group marks by subject
          const subjectMarks = new Map<string, { cia: number | null; ese: number | null }>();

          for (const item of row) {
            if (item === enrollmentItem) continue;
            
            const x = xOf(item);
            const mapping = columnMappings.find(m => x >= m.xMin && x < m.xMax);
            
            if (mapping) {
              if (!subjectMarks.has(mapping.subjectCode)) {
                subjectMarks.set(mapping.subjectCode, { cia: null, ese: null });
              }
              const marks = subjectMarks.get(mapping.subjectCode)!;
              const value = parseMarkValue(item.str);
              if (mapping.type === 'cia') {
                marks.cia = value;
              } else {
                marks.ese = value;
              }
            }
          }

          // Create result rows
          for (const [subjectCode, marks] of subjectMarks) {
            const cia = marks.cia;
            const ese = marks.ese;
            const total = (cia !== null || ese !== null) 
              ? (cia || 0) + (ese || 0) 
              : null;

            allRows.push({
              enrollmentNo,
              subjectCode,
              ciaMark: cia,
              eseMark: ese,
              totalMark: total,
            });
          }
        } else {
          // Fallback: try to parse marks by position relative to subject codes
          const markValues = row
            .filter(item => item !== enrollmentItem)
            .map(item => ({ value: item.str, x: xOf(item) }));

          // Try to pair consecutive values as CIA/ESE for each subject
          for (let s = 0; s < subjectCodes.length && s * 2 + 1 < markValues.length; s++) {
            const ciaStr = markValues[s * 2];
            const eseStr = markValues[s * 2 + 1];
            const subject = subjectCodes[s];

            if (ciaStr && eseStr && subject) {
              const cia = parseMarkValue(ciaStr.value);
              const ese = parseMarkValue(eseStr.value);
              const total = (cia !== null || ese !== null) 
                ? (cia || 0) + (ese || 0) 
                : null;

              allRows.push({
                enrollmentNo: enrollmentNo,
                subjectCode: subject.code,
                ciaMark: cia,
                eseMark: ese,
                totalMark: total,
              });
            }
          }
        }
      }
    }

    if (allRows.length === 0) {
      errors.push('No ESE result data could be extracted from the PDF. Please verify the PDF format matches the expected CUK result notification format.');
    }

  } catch (error) {
    errors.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    rows: allRows,
    subjectCodes: Array.from(subjectCodesSet),
    errors,
  };
}

/**
 * Parse ESE results from a manually entered / Excel-like format
 * This is a fallback for PDFs that can't be auto-parsed
 */
export interface ManualEseEntry {
  enrollmentNo: string;
  subjectCode: string;
  ciaMark: number | null;
  eseMark: number | null;
}

export function calculateTotals(entries: ManualEseEntry[]): EseResultRow[] {
  return entries.map(entry => ({
    ...entry,
    totalMark: (entry.ciaMark !== null || entry.eseMark !== null)
      ? (entry.ciaMark || 0) + (entry.eseMark || 0)
      : null,
  }));
}
