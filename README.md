# Calcsty Data Garage

Calcsty Data Garage is a browser-based statistics toolkit made with React, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, and Framer Motion.

It is designed as a beginner-friendly analytics workspace where a user can upload a dataset, inspect it, convert unusable variables into numeric helper columns, run statistical tests, plot graphs, and download only completed test results or plotted charts.

## Main Features

- Dashboard-based dataset upload: CSV, XLSX, JSON, TSV, TXT
- Built-in SquadLists football demo dataset for quick professor review
- Persistent dataset storage in the browser using IndexedDB
- Dataset overview embedded directly in the dashboard
- Numeric conversion helper for unusable variables
- Descriptive statistics
- Normality tests
- Core tests: t-test, z-test, chi-square, ANOVA
- Hypothesis testing
- Non-parametric tests: Mann-Whitney U, Kruskal-Wallis, Friedman, Wilcoxon Signed Rank, Spearman Rank Correlation
- Correlation and regression
- Visualization center with chart descriptions based on the active dataset
- Search bar for tests, pages, charts, guide, and dataset columns
- Result downloads only after a test is run
- Report details form for name, email/ID, course, and report purpose
- User guide section on the first page
- Chart downloads only after a graph is plotted
- Deep Teal modern theme with dark mode support

## Project Scope

This version focuses only on the classroom statistics toolkit requirements: a welcome dashboard, built-in SquadLists football demo dataset, dataset upload, dataset overview, cleaning/conversion, statistical tests, visualizations, result downloads, chart downloads, and a built-in user guide.

## Charts Included

- Histogram
- Bar Chart
- Scatter Plot
- Line Chart
- Box Plot
- Violin Plot
- Heatmap
- Correlation Matrix
- QQ Plot
- KDE Plot

The Heatmap and Correlation Matrix are different:

- Heatmap shows density counts between two selected numeric variables.
- Correlation Matrix shows Pearson correlation values across numeric columns.

## Numeric Conversion Helper

The conversion tool creates an analytics-ready copy of the active dataset. It keeps the original columns and adds numeric helper columns.

Examples:

- `gender` becomes `gender_code`
- `price` with currency symbols becomes `price_num`
- `date` becomes `date_days`
- `passed` yes/no values become `passed_flag`
- long text becomes `text_length`

## Demo Dataset

The project includes the uploaded demo CSV file:

```text
public/sample-data/SquadLists.csv
```

When the app opens with no saved dataset, Calcsty automatically loads this SquadLists football dataset so the site is ready to demonstrate charts, dataset overview, and statistical tests. Users can still replace it with their own uploaded dataset from the dashboard.

## Running the Project

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173/
```

## Build

```bash
npm run build
```

## Project Structure

```text
src/
  components/
  components/analysis/
  components/charts/
  components/ui/
  layouts/
  pages/
  services/
  store/
  types/
  utils/
```

## Notes

All calculations run in the browser using the uploaded dataset. The project uses approximate browser-side statistical calculations suitable for a student toolkit. For formal research or publication-grade analysis, results should be cross-checked with specialist software such as R, Python, SPSS, JASP, Jamovi, or similar tools.

## Netlify deployment

This project is ready for Netlify deployment. The `netlify.toml` file is already included.

Use these settings if Netlify asks for them manually:

```txt
Build command: npm run build
Publish directory: dist
```

The redirect rule in `netlify.toml` keeps React Router pages working after refresh.

