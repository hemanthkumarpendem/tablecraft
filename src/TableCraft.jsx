import React, { useState, useEffect } from 'react';

// Helper functions
const isNumeric = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  return !isNaN(parseFloat(value)) && isFinite(value);
};

const calculateTotals = (data, columnCount, operations) => {
  const totals = new Array(columnCount).fill('');
  
  for (let col = 0; col < columnCount; col++) {
    const operation = operations[col] || 'sum';
    const numericValues = [];
    
    for (let row = 0; row < data.length; row++) {
      const cellValue = data[row][col];
      if (isNumeric(cellValue)) {
        numericValues.push(parseFloat(cellValue));
      }
    }
    
    if (numericValues.length > 0) {
      switch (operation) {
        case 'sum':
          totals[col] = numericValues.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          totals[col] = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          break;
        case 'count':
          totals[col] = numericValues.length;
          break;
        case 'max':
          totals[col] = Math.max(...numericValues);
          break;
        case 'min':
          totals[col] = Math.min(...numericValues);
          break;
        default:
          totals[col] = numericValues.reduce((a, b) => a + b, 0);
      }
    }
  }
  
  return totals;
};

// PDF EXPORT via browser print (auto-opens dialog)
// PDF EXPORT via browser print (fixed: no nested template-literal hacks)
const exportToPDF = (data, headers, totals, operations, filename) => {
  const operationLabels = { sum: 'Sum', average: 'Avg', count: 'Count', max: 'Max', min: 'Min' };
  const isNum = (v) => isNumeric(v);

  // Build header row
  const headerHtml =
    `<tr style="background-color: #f3f4f6;">` +
    headers
      .map(
        (h) =>
          `<th style="border:1px solid #000; padding:8px; text-align:left;">${h}</th>`
      )
      .join('') +
    `</tr>`;

  // Build body rows
  const bodyRowsHtml = data
    .map((row) => {
      const tds = row
        .map((cell) => {
          const num = isNum(cell);
          const neg = num && parseFloat(cell) < 0;
          const style = `border: 1px solid #000; padding: 8px; text-align: ${
            num ? 'right' : 'left'
          }; ${neg ? 'color: red;' : ''}`;
          const val = cell ?? '';
          return `<td style="${style}">${val !== '' ? val : ''}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  // Build totals row
  const totalsHtml =
    `<tr style="background-color: #e5e7eb; font-weight: bold;">` +
    totals
      .map((total, idx) => {
        const opLabel = operationLabels[operations[idx] || 'sum'] || 'Sum';
        const displayValue = total !== '' ? `${total} (${opLabel})` : '';
        return `<td style="border:1px solid #000; padding:8px; text-align:right;">${displayValue}</td>`;
      })
      .join('') +
    `</tr>`;

  // Full table HTML
  const tableHTML = `
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead>${headerHtml}</thead>
      <tbody>${bodyRowsHtml}${totalsHtml}</tbody>
    </table>
  `;

  // Print window
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups to export as PDF.');
    return false;
  }

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h2 { text-align:center; margin: 0 0 8px; }
          p.meta { text-align:center; margin: 0 0 16px; font-size: 12px; color: #555; }
          @page { size: A4; margin: 16mm; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h2>${filename}</h2>
        <p class="meta">Generated on ${new Date().toLocaleString()}</p>
        ${tableHTML}
        <script>
          window.addEventListener('load', function() {
            try { window.focus(); window.print(); } catch (e) {}
          });
        </script>
      </body>
    </html>
  `);
  w.document.close();
  return true;
};

export default function TableCraft() {
  const [data, setData] = useState([['', '', '']]);
  const [headers, setHeaders] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [fileName, setFileName] = useState('table-data');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [operations, setOperations] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);

  useEffect(() => {
    const initialOps = {};
    headers.forEach((_, index) => { initialOps[index] = 'sum'; });
    setOperations(initialOps);
  }, [headers.length]);

  const totals = calculateTotals(data, headers.length, operations);

  const addRow = () => {
    const newRow = new Array(headers.length).fill('');
    setData(prev => [...prev, newRow]);
  };

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newData = data.map(row => [...row, '']);
    setHeaders(newHeaders);
    setData(newData);
  };

  const removeRow = (index) => {
    if (data.length <= 1) return;
    setData(prev => prev.filter((_, i) => i !== index));
    setSelectedRow(null);
  };

  const removeColumn = (index) => {
    if (headers.length <= 1) return;
    setHeaders(prev => prev.filter((_, i) => i !== index));
    setData(prev => prev.map(row => row.filter((_, i) => i !== index)));
    setSelectedColumn(null);
  };

  const clearTable = () => {
    const emptyData = Array(data.length).fill(null).map(() => Array(headers.length).fill(''));
    setData(emptyData);
    setShowClearConfirm(false);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    setData(prev => {
      const next = prev.map(r => [...r]);
      next[rowIndex][colIndex] = value;
      return next;
    });
  };

  const handleHeaderChange = (index, value) => {
    setHeaders(prev => prev.map((h, i) => (i === index ? value : h)));
  };

  const handleOperationChange = (colIndex, operation) => {
    setOperations(prev => ({ ...prev, [colIndex]: operation }));
  };

  const handlePDFExport = () => {
    const ok = exportToPDF(data, headers, totals, operations, fileName);
    if (!ok) alert('PDF export failed.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">TableCraft</h1>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <button 
              onClick={addRow}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Add Row
            </button>

            <button 
              onClick={addColumn}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              Add Column
            </button>

            {selectedRow !== null && (
              <button 
                onClick={() => removeRow(selectedRow)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Remove Row
              </button>
            )}

            {selectedColumn !== null && (
              <button 
                onClick={() => removeColumn(selectedColumn)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Remove Column
              </button>
            )}

            <button 
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
            >
              Clear All
            </button>

            <div className="ml-auto flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">File Name:</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter file name"
                />
              </div>

              <button 
                onClick={handlePDFExport}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                title="Open print dialog to save as PDF"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, colIndex) => (
                    <th 
                      key={colIndex} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      onClick={() => setSelectedColumn(colIndex)}
                    >
                      <div className={`flex items-center gap-2 ${selectedColumn === colIndex ? 'bg-blue-100' : ''}`}>
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-sm"
                        />
                        {headers.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeColumn(colIndex); }}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove column"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {/* Extra header for row action column */}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={`hover:bg-gray-50 ${selectedRow === rowIndex ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedRow(rowIndex)}
                  >
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          className={`w-full border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-sm ${
                            isNumeric(cell) ? 'text-right' : 'text-left'
                          } ${isNumeric(cell) && parseFloat(cell) < 0 ? 'text-red-600' : ''}`}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {data.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeRow(rowIndex); }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove row"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-gray-100 font-semibold">
                  {totals.map((total, colIndex) => (
                    <td key={colIndex} className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {total !== '' ? (
                            operations[colIndex] === 'count' ? total : Number(total).toLocaleString(undefined, { maximumFractionDigits: 10 })
                          ) : ''}
                        </span>
                        <select 
                          value={operations[colIndex] || 'sum'}
                          onChange={(e) => handleOperationChange(colIndex, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                        >
                          <option value="sum">Sum</option>
                          <option value="average">Avg</option>
                          <option value="count">Count</option>
                          <option value="max">Max</option>
                          <option value="min">Min</option>
                        </select>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• <strong>PDF Export:</strong> Opens browser print dialog automatically; choose <em>Save as PDF</em>.</p>
            <p>• Click rows/columns to select, then use Remove buttons</p>
            <p>• All calculations (Sum, Avg, Count, Max, Min) update in real-time</p>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Clear</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to clear all data? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={clearTable}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
