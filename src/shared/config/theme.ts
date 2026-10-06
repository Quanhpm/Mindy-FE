import type { CSSProperties } from 'react';

/** Edit this config to recolor every route. Swatches are sampled from docs. */
export const mindyTheme = {
  palette: 'coastal' as 'sky' | 'lavender' | 'coastal',
  palettes: {
    sky: {
      canvas: '#fbfbfb',
      primary: '#c6e7ff',
      secondary: '#d4f6ff',
      accent: '#ffddae',
      ink: '#2d336b',
      action: '#2d336b',
    },
    lavender: {
      canvas: '#fff2f2',
      primary: '#a9b5df',
      secondary: '#7886c7',
      accent: '#ffddae',
      ink: '#2d336b',
      action: '#2d336b',
    },
    coastal: {
      canvas: '#f7f8f0',
      primary: '#9cd5ff',
      secondary: '#7aaace',
      accent: '#7aaace',
      ink: '#355872',
      action: '#355872',
    },
  },
  semantic: {
    white: '#ffffff',
    danger: '#a72d31',
    success: '#2d6251',
    warning: '#665532',
  },
} as const;

type ThemeVariables = CSSProperties & Record<`--mindy-${string}`, string>;

export function themeVariables(palette = mindyTheme.palette): ThemeVariables {
  const colors = { ...mindyTheme.palettes[palette], ...mindyTheme.semantic };
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [`--mindy-${name}`, value]),
  ) as ThemeVariables;
}
