/**
 * Google Sheets Export
 * Note: This requires Google Sheets API setup
 * For now, we'll export as CSV which can be imported to Google Sheets
 */

export function exportToGoogleSheets(
  data: any[],
  columns: { header: string; key: string }[],
  filename: string
) {
  // Convert to CSV format that can be imported to Google Sheets
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const keys = col.key.split('.');
      let value: any = row;
      for (const key of keys) {
        value = value?.[key];
      }
      if (value instanceof Date) {
        return value.toLocaleDateString('en-IN');
      }
      // Escape commas and quotes in CSV
      const stringValue = value?.toString() || '';
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  const csvContent = [headers, ...rows]
    .map((row) => row.join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${Date.now()}.csv`;
  link.click();

  // Also provide instructions for Google Sheets
  return {
    message: 'CSV file downloaded. You can import this to Google Sheets by:',
    steps: [
      '1. Open Google Sheets',
      '2. Click File > Import',
      '3. Upload the downloaded CSV file',
      '4. Select "Replace spreadsheet" or "Insert new sheet(s)"',
    ],
  };
}

