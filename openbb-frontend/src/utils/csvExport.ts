export const downloadTableAsCSV = (
  data: Array<{ [key: string]: any }>,
  columns: Array<{ label: string; value: string | ((item: any) => any) }>,
  filename: string
) => {
  // Create CSV headers
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = typeof col.value === 'function' ? col.value(item) : item[col.value];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',');
  }).join('\n');
  
  // Combine headers and rows
  const csvContent = `${headers}\n${rows}`;
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};