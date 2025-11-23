import * as XLSX from 'xlsx';

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Prepare headers
  const headers = columns
    ? columns.map((col) => col.label)
    : Object.keys(data[0]);

  // Prepare rows
  const rows = data.map((item) => {
    if (columns) {
      return columns.map((col) => {
        const value = item[col.key];
        return value !== null && value !== undefined ? String(value) : '';
      });
    }
    return Object.values(item).map((val) =>
      val !== null && val !== undefined ? String(val) : ''
    );
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1',
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Prepare data for Excel
  const excelData = data.map((item) => {
    if (columns) {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        row[col.label] = item[col.key];
      });
      return row;
    }
    return item;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(excelData[0] || {}).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...excelData.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(data: T[], filename: string) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export table data with custom formatting
 */
export function exportTableData<T extends Record<string, any>>(
  data: T[],
  filename: string,
  format: 'csv' | 'excel' | 'json',
  options?: {
    columns?: { key: keyof T; label: string }[];
    sheetName?: string;
  }
) {
  try {
    switch (format) {
      case 'csv':
        exportToCSV(data, filename, options?.columns);
        break;
      case 'excel':
        exportToExcel(data, filename, options?.sheetName, options?.columns);
        break;
      case 'json':
        exportToJSON(data, filename);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
