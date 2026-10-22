import axe from 'axe-core';

/**
 * Rules disabled for every scan.
 *
 * - color-contrast: jsdom has no layout or paint engine, so computed colors
 *   and rendered contrast cannot be measured. Enabling it only produces
 *   false positives in this environment.
 */
const disabledRules: axe.RunOptions['rules'] = {
  'color-contrast': { enabled: false },
};

export interface A11yScanOptions {
  rules?: axe.RunOptions['rules'];
}

function formatTarget(target: axe.CrossTreeSelector[] | string[]): string {
  return target
    .map((selector) => (Array.isArray(selector) ? selector.join(' ') : selector))
    .join(', ');
}

function formatViolations(violations: axe.Result[]): string {
  return violations
    .map((violation, index) => {
      const targets = violation.nodes.map((node) => formatTarget(node.target)).join('; ');
      return [
        `${index + 1}. [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`,
        `   Help: ${violation.helpUrl}`,
        `   Target: ${targets}`,
      ].join('\n');
    })
    .join('\n');
}

/**
 * Runs axe against the given container and fails the test when violations are
 * found. The thrown message lists each rule id, impact, target and help text.
 */
export async function expectNoA11yViolations(
  container: HTMLElement,
  { rules = {} }: A11yScanOptions = {}
): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      ...disabledRules,
      ...rules,
    },
  });

  if (results.violations.length > 0) {
    throw new Error(
      `Found ${results.violations.length} accessibility violation(s):\n${formatViolations(
        results.violations
      )}`
    );
  }
}
