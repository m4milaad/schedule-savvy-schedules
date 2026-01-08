import ExcelJS from 'exceljs';

/**
 * Create a new workbook
 */
export function createWorkbook(): ExcelJS.Workbook {
  return new ExcelJS.Workbook();
}

/**
 * Add a worksheet with data from JSON array
 */
export function addWorksheetFromJson<T extends Record<string, any>>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: T[],
  columns?: { key: keyof T; label: string; width?: number }[]
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return worksheet;

  // Set up columns
  if (columns) {
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: String(col.key),
      width: col.width || Math.max(col.label.length + 2, 12),
    }));
  } else {
    const keys = Object.keys(data[0]);
    worksheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.max(key.length + 2, 12),
    }));
  }

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach((item) => {
    if (columns) {
      const rowData: Record<string, any> = {};
      columns.forEach((col) => {
        rowData[String(col.key)] = item[col.key];
      });
      worksheet.addRow(rowData);
    } else {
      worksheet.addRow(item);
    }
  });

  return worksheet;
}

/**
 * Auto-size columns based on content
 */
export function autoSizeColumns(worksheet: ExcelJS.Worksheet, maxWidth = 50): void {
  worksheet.columns.forEach((column) => {
    let maxLength = column.header?.toString().length || 10;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellLength = cell.value?.toString().length || 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });

    column.width = Math.min(maxLength + 2, maxWidth);
  });
}

/**
 * Download workbook as Excel file
 */
export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read Excel file and return JSON data
 */
export async function readExcelFile(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  const jsonData: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
      });
    } else {
      // Data rows
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        jsonData.push(rowData);
      }
    }
  });

  return jsonData;
}

/**
 * Export data to Excel format (convenience function)
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1',
  columns?: { key: keyof T; label: string; width?: number }[]
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const workbook = createWorkbook();
  addWorksheetFromJson(workbook, sheetName, data, columns);
  await downloadWorkbook(workbook, filename);
}
