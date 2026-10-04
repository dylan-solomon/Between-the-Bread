import axe from 'axe-core'

const RULES_THAT_NEED_A_REAL_BROWSER = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
}

export const accessibilityProblems = async (container: Element): Promise<string[]> => {
  const result = await axe.run(container, { rules: RULES_THAT_NEED_A_REAL_BROWSER, resultTypes: ['violations'] })
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.help} -> ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  )
}
