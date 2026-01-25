import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheets: {
    name: string;
    data: any[];
    columns: { header: string; key: string }[];
  }[];
}

export function exportToExcel(options: ExcelExportOptions) {
  const workbook = XLSX.utils.book_new();

  options.sheets.forEach((sheet) => {
    const headers = sheet.columns.map((col) => col.header);
    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const keys = col.key.split('.');
        let value: any = row;
        for (const key of keys) {
          value = value?.[key];
        }
        if (value instanceof Date) {
          return value.toLocaleDateString('en-IN');
        }
        return value?.toString() || '';
      })
    );

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const maxWidth = headers.map((header, colIndex) => {
      const headerLength = header.length;
      const maxDataLength = Math.max(
        ...rows.map((row) => (row[colIndex]?.toString() || '').length)
      );
      return Math.max(headerLength, maxDataLength, 10);
    });

    worksheet['!cols'] = maxWidth.map((width) => ({ wch: width }));

    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: '1D4ED8' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, `${options.filename}_${Date.now()}.xlsx`);
}

export function exportToCSV(data: any[], columns: { header: string; key: string }[], filename: string) {
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
      return value?.toString() || '';
    })
  );

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${Date.now()}.csv`;
  link.click();
}

