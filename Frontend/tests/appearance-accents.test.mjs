import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const {
  newPreferences,
  activeAppearance,
  upgradeDefaultPalette,
  accentPresentation,
  uiColorPresets,
  DEFAULT_UI_PRIMARY,
  DEFAULT_UI_SECONDARY,
} = await server.ssrLoadModule('/src/features/appearance/appearanceModel.ts');
const { contrastRatio } = await server.ssrLoadModule('/src/features/blocks/typography/textContrast.ts');
const { createHttpAppearance } = await server.ssrLoadModule('/src/features/appearance/httpAppearance.ts');
const { accentInk, paletteAccentTokens } = await server.ssrLoadModule('/src/features/appearance/appearanceTokens.ts');
const { uiChromeTokens } = await server.ssrLoadModule('/src/features/appearance/uiChromeTokens.ts');
const gradient = { from: '#006a88', to: '#00735e', kind: 'linear', angle: 120 };

test('new and reset preferences match the complete Charcoal preset', () => {
  const defaults = newPreferences();
  const charcoal = uiColorPresets.find((preset) => preset.name === 'Charcoal');
  assert.equal(defaults.uiPrimary, '#334c5c');
  assert.equal(defaults.uiSecondary, '#b64a25');
  assert.deepEqual(defaults.uiBackground, { color: '#20262b' });
  assert.equal(defaults.uiPrimary, charcoal.primary);
  assert.equal(defaults.uiSecondary, charcoal.secondary);
  assert.deepEqual(defaults.uiBackground, charcoal.background);
  assert.deepEqual(defaults.uiGradients, {});
  for (const mode of ['light', 'dark']) {
    assert.equal(defaults.defaults[mode].primary, charcoal.primary);
    assert.equal(defaults.defaults[mode].secondary, charcoal.secondary);
  }
  assert.notDeepEqual(uiColorPresets.find((preset) => preset.name === 'Lagoon').background, charcoal.background);
});

test('all twelve presets provide independent backgrounds with readable chrome in either canvas mode', () => {
  assert.equal(uiColorPresets.length, 12);
  for (const preset of uiColorPresets) {
    const settings = {
      ...newPreferences(),
      uiPrimary: preset.primary,
      uiSecondary: preset.secondary,
      uiBackground: preset.background,
      uiGradients: preset.gradients ?? {},
    };
    const tokens = uiChromeTokens(settings, 'legacy');
    const stops = preset.background.gradient
      ? [preset.background.gradient.from, preset.background.gradient.to]
      : [preset.background.color];
    for (const stop of stops) {
      assert.ok(contrastRatio(tokens['--color-chrome-text'], stop) >= 4.5, preset.name);
      assert.ok(contrastRatio(tokens['--color-chrome-text-strong'], stop) >= 4.5, preset.name);
    }
    const changed = uiChromeTokens({ ...settings, uiPrimary: '#abcdef', uiSecondary: '#123456' }, 'different');
    assert.equal(tokens['--chrome-gradient'], changed['--chrome-gradient']);
    assert.notEqual(tokens['--chrome-gradient'], 'legacy');
  }
});

test('automatic backgrounds remain compatible and malformed stored backgrounds cannot inject CSS URLs', () => {
  const settings = newPreferences();
  for (const uiBackground of [
    undefined,
    {},
    { color: 'url(https://tracker.invalid)' },
    { color: '#123456', gradient: { ...gradient, to: 'url(https://tracker.invalid)' } },
  ]) {
    assert.equal(uiChromeTokens({ ...settings, uiBackground }, 'legacy')['--chrome-gradient'], 'legacy');
  }
  const mixed = uiChromeTokens(
    { ...settings, uiBackground: { color: '#000000', gradient: { ...gradient, from: '#000000', to: '#ffffff' } } },
    'legacy',
  );
  assert.match(mixed['--chrome-gradient'], /55%/);
  assert.equal(mixed['--color-chrome-text-strong'], '#ffffff');
});

test('accent text stays readable on light and dark surfaces even for extreme custom colors', () => {
  for (const surface of ['#ffffff', '#25252a', '#ffff00', '#111111']) {
    for (const color of ['#ffffff', '#000000', '#ffcc00', '#087f8c', '#c6532e', '#fff']) {
      assert.ok(contrastRatio(accentInk(color, surface), surface) >= 4.5);
    }
  }
  assert.equal(accentInk('#087f8c', '#ffffff'), '#087f8c');
});

test('primary and secondary roles independently expose gradient fills, readable text and soft accents', () => {
  for (const mode of ['light', 'dark']) {
    const palette = { ...newPreferences().defaults[mode], gradients: { secondary: gradient } };
    const tokens = paletteAccentTokens(palette);
    assert.equal(tokens['--color-accent-fill'], palette.primary);
    assert.match(tokens['--color-secondary-fill'], /linear-gradient/);
    for (const role of ['accent', 'secondary']) {
      assert.ok(contrastRatio(tokens[`--color-${role}-ink`], palette.default) >= 4.5);
      assert.match(tokens[`--color-${role}-soft`], /color-mix/);
    }
    assert.ok(contrastRatio(tokens['--color-on-secondary'], gradient.from) >= 4.5);
    assert.ok(contrastRatio(tokens['--color-on-secondary'], gradient.to) >= 4.5);
  }
});

test('shared UI accents and gradients flow into both modes and inherited project palettes', () => {
  const settings = newPreferences();
  settings.uiPrimary = '#123456';
  settings.uiSecondary = '#987654';
  settings.uiGradients = { primary: gradient };
  settings.projects.board = structuredClone(settings.defaults);
  const actual = activeAppearance(settings, 'board');
  for (const mode of ['light', 'dark']) {
    assert.equal(actual[mode].primary, '#123456');
    assert.equal(actual[mode].secondary, '#987654');
    assert.deepEqual(actual[mode].gradients.primary, gradient);
  }
  assert.equal(settings.defaults.light.primary, DEFAULT_UI_PRIMARY);
});

test('role overrides are independent by mode and do not freeze the other UI color', () => {
  const settings = newPreferences();
  settings.defaults.light.primary = '#456789';
  settings.defaults.light.overrides.primary = true;
  settings.uiPrimary = '#123456';
  settings.uiSecondary = '#987654';
  settings.uiGradients = { primary: gradient };
  const actual = activeAppearance(settings, '');
  assert.equal(actual.light.primary, '#456789');
  assert.equal(actual.light.gradients.primary, undefined);
  assert.equal(actual.light.secondary, '#987654');
  assert.equal(actual.dark.primary, '#123456');
  assert.deepEqual(actual.dark.gradients.primary, gradient);
  settings.defaults.light.overrides.primary = false;
  assert.equal(activeAppearance(settings, '').light.primary, '#123456');
});

test('old built-in purple defaults upgrade, while custom colors become explicit overrides', () => {
  const settings = newPreferences();
  settings.paletteVersion = 3;
  settings.uiPrimary = '#8000ff';
  settings.uiSecondary = '#6a00eb';
  delete settings.defaults.light.overrides;
  delete settings.defaults.dark.overrides;
  settings.defaults.light.primary = '#903df5';
  settings.defaults.light.secondary = '#ff0000';
  settings.defaults.dark.primary = '#123456';
  settings.defaults.dark.secondary = '#abcdef';
  const upgraded = upgradeDefaultPalette(settings);
  assert.equal(upgraded.uiPrimary, DEFAULT_UI_PRIMARY);
  assert.equal(upgraded.uiSecondary, DEFAULT_UI_SECONDARY);
  assert.deepEqual(upgraded.defaults.light.overrides, { primary: false, secondary: false });
  assert.deepEqual(upgraded.defaults.dark.overrides, { primary: true, secondary: true });
  assert.equal(activeAppearance(upgraded, '').dark.primary, '#123456');
  assert.equal(activeAppearance(upgraded, '').light.primary, DEFAULT_UI_PRIMARY);
  assert.equal(settings.uiPrimary, '#8000ff');
  assert.equal(upgradeDefaultPalette(upgraded), upgraded);
});

test('upgrading customized global UI colors keeps their values and enables inheritance when equal', () => {
  const settings = newPreferences();
  settings.paletteVersion = 3;
  settings.uiPrimary = '#123456';
  settings.defaults.light.primary = '#123456';
  delete settings.defaults.light.overrides;
  const upgraded = upgradeDefaultPalette(settings);
  assert.equal(upgraded.uiPrimary, '#123456');
  assert.equal(upgraded.defaults.light.overrides.primary, false);
});

test('every preset provides legible primary and secondary labels in both palette modes', () => {
  for (const preset of uiColorPresets)
    for (const mode of ['light', 'dark']) {
      const settings = newPreferences();
      settings.uiPrimary = preset.primary;
      settings.uiSecondary = preset.secondary;
      settings.uiGradients = preset.gradients ?? {};
      const palette = activeAppearance(settings, '')[mode];
      for (const role of ['primary', 'secondary']) {
        const result = accentPresentation(palette, role);
        const stops = palette.gradients[role]
          ? [palette.gradients[role].from, palette.gradients[role].to]
          : [palette[role]];
        for (const stop of stops)
          assert.ok(contrastRatio(result.foreground, stop) >= 4.5, `${preset.name}/${mode}/${role}/${stop}`);
      }
    }
});

test('mixed black/white gradients receive a protective scrim without mutating the selected colors', () => {
  const settings = newPreferences();
  settings.uiGradients = { primary: { ...gradient, from: '#000000', to: '#ffffff' } };
  const palette = activeAppearance(settings, '').light;
  const presentation = accentPresentation(palette, 'primary');
  assert.equal(presentation.foreground, '#ffffff');
  assert.match(presentation.background, /55%/);
  assert.equal(settings.uiGradients.primary.to, '#ffffff');
});

test('legacy malformed CSS values cannot become image URLs or break gradient rendering', () => {
  const palette = structuredClone(newPreferences().defaults.light);
  palette.primary = 'url(https://tracker.invalid/pixel)';
  assert.equal(accentPresentation(palette, 'primary').background, DEFAULT_UI_PRIMARY);
  palette.gradients.primary = { from: {}, to: '#ffffff', kind: 'linear', angle: 45 };
  assert.doesNotThrow(() => accentPresentation(palette, 'primary'));
  palette.gradients.primary = {
    from: '#000000',
    to: '#ffffff',
    kind: 'linear',
    angle: '0deg),url(https://tracker.invalid/pixel)',
  };
  assert.equal(accentPresentation(palette, 'primary').background, DEFAULT_UI_PRIMARY);
});

test('HTTP persistence carries global gradients and palette override flags without copying project settings', async () => {
  const calls = [],
    before = newPreferences(),
    next = structuredClone(before);
  next.uiGradients = { primary: gradient };
  next.defaults.light.overrides.secondary = true;
  const api = createHttpAppearance({
    async request(path, options) {
      calls.push({ path, options });
    },
  });
  await api.save(before, next);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/appearance');
  assert.deepEqual(calls[0].options.body.uiGradients.primary, gradient);
  assert.equal(calls[0].options.body.light.overrides.secondary, true);
  assert.deepEqual(calls[0].options.body.uiBackground, next.uiBackground);
});
