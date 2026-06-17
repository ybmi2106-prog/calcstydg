import type { WorkbenchConfig } from '@/components/analysis/AnalysisWorkbench';

export const moduleConfigs: Record<string, WorkbenchConfig> = {
  descriptive: {
    title: 'Descriptive Statistics',
    subtitle: 'Calculates mean, median, mode, variance, standard deviation, min, max, quartiles, skewness, and kurtosis from the selected dataset column.',
    endpoint: '/descriptive',
    category: 'Statistics Module',
    methods: ['Mean / Median / Mode', 'Variance', 'Standard deviation', 'Quartiles', 'Skewness', 'Kurtosis'],
    chart: 'histogram',
    outputs: ['n', 'mean', 'median', 'mode', 'variance', 'standardDeviation', 'min', 'max', 'q1', 'q3', 'skewness', 'kurtosis']
  },
  normality: {
    title: 'Normality Tests',
    subtitle: 'Runs browser-based normality diagnostics including Shapiro-style screening, Kolmogorov-Smirnov, Anderson-Darling, and QQ plot correlation.',
    endpoint: '/normality',
    category: 'Statistics Module',
    methods: ['Shapiro-Wilk', 'Kolmogorov-Smirnov', 'Anderson-Darling', 'QQ Plot'],
    parameters: [
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 }
    ],
    chart: 'scatter',
    outputs: ['n', 'statistic', 'pValue', 'mean', 'standardDeviation', 'skewness', 'kurtosis', 'interpretation']
  },

  coretests: {
    title: 'Core Statistical Tests',
    subtitle: 'Beginner-friendly page for the main tests required in class: t-test, z-test, chi-square, and ANOVA. Select the correct columns, then run the test and download the result/graph.',
    endpoint: '/core-tests',
    category: 'Statistics Module',
    methods: ['One Sample T-Test', 'Independent T-Test', 'Paired T-Test', 'One Sample Z-Test', 'Two Sample Z-Test', 'Chi-Square Goodness of Fit', 'Chi-Square Independence', 'One Way ANOVA'],
    parameters: [
      { label: 'Grouping column / factor', key: 'groupColumn', defaultValue: '' },
      { label: 'Category column for Chi-square', key: 'categoryColumn', defaultValue: '' },
      { label: 'Second numeric column', key: 'secondColumn', defaultValue: '' },
      { label: 'Test value / population mean', key: 'testValue', type: 'number', defaultValue: 0 },
      { label: 'Population standard deviation for Z-test', key: 'populationStd', type: 'number', defaultValue: 1 },
      { label: 'Expected counts for Chi-square, comma separated', key: 'expectedCounts', defaultValue: '' },
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 },
      { label: 'Alternative', key: 'alternative', type: 'select', options: ['two-sided', 'less', 'greater'], defaultValue: 'two-sided' }
    ],
    chart: 'box',
    outputs: ['testName', 'n', 'statistic', 'degreesOfFreedom', 'pValue', 'effectSize', 'confidenceInterval', 'interpretation']
  },
  hypothesis: {
    title: 'Hypothesis Testing',
    subtitle: 'Runs one-sample, independent, and paired t-test workflows using the active dataset.',
    endpoint: '/hypothesis',
    category: 'Statistics Module',
    methods: ['One Sample T-Test', 'Independent T-Test', 'Paired T-Test'],
    parameters: [
      { label: 'Grouping column for independent test', key: 'groupColumn', defaultValue: '' },
      { label: 'Second numeric column for paired test', key: 'secondColumn', defaultValue: '' },
      { label: 'One-sample test value', key: 'testValue', type: 'number', defaultValue: 0 },
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 },
      { label: 'Alternative', key: 'alternative', type: 'select', options: ['two-sided', 'less', 'greater'], defaultValue: 'two-sided' }
    ],
    chart: 'box',
    outputs: ['n', 'statistic', 'degreesOfFreedom', 'pValue', 'effectSize', 'confidenceInterval', 'interpretation']
  },
  nonparametric: {
    title: 'Non-Parametric Tests',
    subtitle: 'Rank-based tests for non-normal data: Mann-Whitney U, Kruskal-Wallis, Friedman, Wilcoxon Signed Rank, and Spearman rank correlation.',
    endpoint: '/non-parametric',
    category: 'Statistics Module',
    methods: ['Mann-Whitney U', 'Kruskal-Wallis', 'Friedman', 'Wilcoxon Signed Rank', 'Spearman Rank Correlation'],
    parameters: [
      { label: 'Grouping column', key: 'groupColumn', defaultValue: '' },
      { label: 'Second / paired numeric column', key: 'secondColumn', defaultValue: '' },
      { label: 'Repeated-measure columns for Friedman', key: 'measureColumns', defaultValue: '' },
      { label: 'Alternative', key: 'alternative', type: 'select', options: ['two-sided', 'less', 'greater'], defaultValue: 'two-sided' },
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 }
    ],
    chart: 'box',
    outputs: ['statistic', 'pValue', 'rankStatistic', 'zStatistic', 'degreesOfFreedom', 'effectSize', 'interpretation']
  },
  anova: {
    title: 'ANOVA',
    subtitle: 'Runs one-way ANOVA from the selected target and factor. Repeated measures use repeated numeric columns as a browser-based approximation.',
    endpoint: '/anova',
    category: 'Statistics Module',
    methods: ['One Way ANOVA', 'Two Way ANOVA', 'Repeated Measures ANOVA'],
    parameters: [
      { label: 'Factor 1 / grouping column', key: 'factor1', defaultValue: '' },
      { label: 'Factor 2', key: 'factor2', defaultValue: '' },
      { label: 'Repeated-measure columns', key: 'measureColumns', defaultValue: '' },
      { label: 'Post-hoc test label', key: 'posthoc', type: 'select', options: ['Tukey HSD', 'Bonferroni', 'Games-Howell'], defaultValue: 'Tukey HSD' },
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 }
    ],
    chart: 'box',
    outputs: ['statistic', 'pValue', 'degreesOfFreedom', 'effectSize', 'interpretation']
  },
  correlation: {
    title: 'Correlation',
    subtitle: 'Calculates Pearson, Spearman, and Kendall correlation between two selected numeric columns.',
    endpoint: '/correlation',
    category: 'Statistics Module',
    methods: ['Pearson', 'Spearman', 'Kendall'],
    parameters: [
      { label: 'Second numeric column', key: 'secondColumn', defaultValue: '' },
      { label: 'Alpha level', key: 'alpha', type: 'number', defaultValue: 0.05 }
    ],
    chart: 'heatmap',
    outputs: ['n', 'statistic', 'correlation', 'pValue', 'confidenceInterval', 'interpretation']
  },
  regression: {
    title: 'Regression',
    subtitle: 'Runs simple, multiple, and polynomial regression directly from uploaded numeric columns.',
    endpoint: '/regression',
    category: 'Statistics Module',
    methods: ['Simple Linear Regression', 'Multiple Linear Regression', 'Polynomial Regression'],
    parameters: [
      { label: 'Predictor columns, comma separated', key: 'predictors', defaultValue: '' },
      { label: 'Second numeric column / simple predictor', key: 'secondColumn', defaultValue: '' },
      { label: 'Polynomial degree', key: 'degree', type: 'number', defaultValue: 2 }
    ],
    chart: 'line',
    outputs: ['n', 'statistic', 'pValue', 'rSquared', 'effectSize', 'intercept', 'slope', 'coefficients', 'interpretation']
  }
};
