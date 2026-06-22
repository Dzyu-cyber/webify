export interface IExtractedElement {
  tagName: string;
  className: string;
  id: string;
  styles: Record<string, string>;
}

export interface IColorToken {
  hex: string;
  count: number;
}

export interface IFontFamilyToken {
  name: string;
  count: number;
}

export interface IDistilledDesignTokens {
  colors: IColorToken[];
  baseSpacing: number;
  typography: {
    fontFamilies: IFontFamilyToken[];
    fontSizes: string[];
  };
}
