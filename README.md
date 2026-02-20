## Soil Health Report Calculator (React, No Backend)

This is a single-page React application to display and calculate soil health reports without any backend. All data is stored in JSON files that you can import/export, or save directly into a local folder using the browser's File System Access API (supported in Chromium-based browsers).

### Features
- Landing page table with:
  1. Soil Health Parameter
  2. Parameter Description
  3. Health Range of Parameter
  4. Textboxes to input current test values (computed params are auto-calculated)
  5. Evaluation message derived from master data ranges
- Dependent/computed parameters via expressions referencing other parameter IDs
- Summary of the health test (Good/Moderate/Poor counts and overall status)
- Read/write master data and results as JSON using:
  - File System Access API (choose a folder, read/write `parameters.json` and save results)
  - Fallback to Import/Export (upload/download JSON files)

### Getting started
1. Install dependencies (requires Node 18+):
   - npm install
2. Run the dev server:
   - npm run dev
3. Open the app at the URL shown in the terminal.

We created a starter master data file at `public/masterData.example.json`. You can import this file from the UI or copy it to your data folder as `parameters.json`.

### Master data JSON structure
```json
{
  "parameters": [
    {
      "id": "ph",
      "name": "Soil pH",
      "description": "Acidity/alkalinity of soil",
      "unit": "",
      "type": "input", // or "computed"
      "expression": "ca + mg + k + na", // only for computed
      "ranges": [
        { "label": "Acidic", "min": null, "max": 5.5, "message": "Soil is acidic" },
        { "label": "Optimal", "min": 6.0, "max": 7.5, "message": "Optimal pH" },
        { "label": "Alkaline", "min": 7.6, "max": null, "message": "Soil is alkaline" }
      ]
    }
  ]
}
```

Notes:
- `id` is used as a variable name in expressions. Use letters/numbers/underscore.
- `type` is `input` for manual entry; `computed` for expression-based values.
- `ranges` describe evaluation buckets. Omit `min` or `max` to make it open-ended.
- Optional `severity` on a range: `0` (good), `1` (moderate), `2` (poor). If omitted, it's inferred from the `label`.

### Reading/writing JSON
- Pick Data Folder (Chromium browsers): The app will try to read `parameters.json` from that folder. It can also write back to `parameters.json` and will save results as `results-YYYY-MM-DDTHH-mm-ss.json` in the same folder.
- Import/Export (all browsers): Import any `.json` file as master data. Export master or results as a downloaded JSON file.

### Expressions (computed parameters)
- Supported operators: `+ - * / ^` and parentheses.
- Variables: parameter `id`s (e.g., `ca + mg + k + na`).
- Circular dependencies resolve to `NaN`.

### Disclaimer
This app runs entirely in the browser. Directly writing to files in the app's install directory is not possible without user consent and a supported browser. The File System Access API provides a secure way to choose a local folder for read/write.
