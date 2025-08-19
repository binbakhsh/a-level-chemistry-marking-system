import { ChemicalEquation, FormulaValidation } from '@/types';

export class ChemistryUtils {
  private static readonly ELEMENT_REGEX = /([A-Z][a-z]?)(\d*)/g;
  private static readonly EQUATION_REGEX = /^(.+?)\s*[→=]\s*(.+)$/;
  private static readonly COMMON_ELEMENTS = new Set([
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
    'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
    'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
    'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
    'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
    'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
    'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
    'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
    'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
  ]);

  static validateFormula(formula: string): FormulaValidation {
    const errors: string[] = [];
    let isValid = true;

    const cleanFormula = formula.replace(/\s+/g, '').replace(/[()[\]]/g, '');
    
    if (!cleanFormula) {
      return {
        formula,
        isValid: false,
        standardForm: '',
        errors: ['Formula cannot be empty'],
      };
    }

    const elements = [...cleanFormula.matchAll(this.ELEMENT_REGEX)];
    
    if (elements.length === 0) {
      return {
        formula,
        isValid: false,
        standardForm: '',
        errors: ['No valid chemical elements found'],
      };
    }

    for (const [, element] of elements) {
      if (!this.COMMON_ELEMENTS.has(element)) {
        errors.push(`Unknown element: ${element}`);
        isValid = false;
      }
    }

    const reconstructed = cleanFormula.replace(this.ELEMENT_REGEX, '');
    if (reconstructed.length > 0) {
      errors.push(`Invalid characters in formula: ${reconstructed}`);
      isValid = false;
    }

    const standardForm = this.standardizeFormula(cleanFormula);

    return {
      formula,
      isValid,
      standardForm,
      errors,
    };
  }

  static standardizeFormula(formula: string): string {
    return formula
      .replace(/\s+/g, '')
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (match) => {
        const subscriptMap: { [key: string]: string } = {
          '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
          '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
        };
        return subscriptMap[match] || match;
      });
  }

  static parseEquation(equation: string): ChemicalEquation | null {
    const normalized = equation
      .replace(/\s+/g, ' ')
      .replace(/[→⟶]/g, '=')
      .trim();

    const match = normalized.match(this.EQUATION_REGEX);
    if (!match) return null;

    const [, reactantsStr, productsStr] = match;
    
    const reactants = this.parseCompounds(reactantsStr);
    const products = this.parseCompounds(productsStr);

    if (reactants.length === 0 || products.length === 0) {
      return null;
    }

    const coefficients = this.extractCoefficients(normalized);
    const isBalanced = this.checkBalance(reactants, products, coefficients);

    return {
      reactants,
      products,
      coefficients,
      isBalanced,
    };
  }

  private static parseCompounds(compoundsStr: string): string[] {
    return compoundsStr
      .split('+')
      .map(compound => compound.trim())
      .filter(compound => compound.length > 0)
      .map(compound => compound.replace(/^\d+\s*/, ''))
      .filter(compound => compound.length > 0);
  }

  private static extractCoefficients(equation: string): number[] {
    const compounds = equation.split(/[+=→⟶]/).map(part => part.trim());
    
    return compounds.map(compound => {
      const match = compound.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    });
  }

  private static checkBalance(reactants: string[], products: string[], coefficients: number[]): boolean {
    try {
      const reactantElements = this.getElementCounts(reactants, coefficients.slice(0, reactants.length));
      const productElements = this.getElementCounts(products, coefficients.slice(reactants.length));

      const allElements = new Set([...Object.keys(reactantElements), ...Object.keys(productElements)]);

      for (const element of allElements) {
        const reactantCount = reactantElements[element] || 0;
        const productCount = productElements[element] || 0;
        
        if (reactantCount !== productCount) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private static getElementCounts(compounds: string[], coefficients: number[]): { [element: string]: number } {
    const elementCounts: { [element: string]: number } = {};

    compounds.forEach((compound, index) => {
      const coefficient = coefficients[index] || 1;
      const elements = [...compound.matchAll(this.ELEMENT_REGEX)];

      elements.forEach(([, element, countStr]) => {
        const count = countStr ? parseInt(countStr, 10) : 1;
        elementCounts[element] = (elementCounts[element] || 0) + (count * coefficient);
      });
    });

    return elementCounts;
  }

  static compareFormulas(formula1: string, formula2: string): boolean {
    const std1 = this.standardizeFormula(formula1);
    const std2 = this.standardizeFormula(formula2);
    
    return std1.toLowerCase() === std2.toLowerCase();
  }

  static compareEquations(eq1: string, eq2: string): boolean {
    const parsed1 = this.parseEquation(eq1);
    const parsed2 = this.parseEquation(eq2);

    if (!parsed1 || !parsed2) return false;

    const reactants1 = parsed1.reactants.sort();
    const reactants2 = parsed2.reactants.sort();
    const products1 = parsed1.products.sort();
    const products2 = parsed2.products.sort();

    return (
      JSON.stringify(reactants1) === JSON.stringify(reactants2) &&
      JSON.stringify(products1) === JSON.stringify(products2)
    );
  }

  static fuzzyCompareText(text1: string, text2: string, tolerance: number = 0.8): boolean {
    const clean1 = text1.toLowerCase().replace(/[^\w]/g, '');
    const clean2 = text2.toLowerCase().replace(/[^\w]/g, '');

    if (clean1 === clean2) return true;

    const similarity = this.calculateSimilarity(clean1, clean2);
    return similarity >= tolerance;
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  static extractNumericValue(text: string): number | null {
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  static normalizeUnits(text: string): string {
    return text
      .replace(/g\/mol/gi, 'g/mol')
      .replace(/mol\/dm3/gi, 'mol/dm³')
      .replace(/moldm-3/gi, 'mol/dm³')
      .replace(/kj\/mol/gi, 'kJ/mol')
      .replace(/kjmol-1/gi, 'kJ/mol')
      .replace(/\s+/g, ' ')
      .trim();
  }
}