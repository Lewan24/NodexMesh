import { test, expect } from '@playwright/test';
test.setTimeout(20000);

const item = (page, number) =>
  page.locator(`[data-board-item-id="10000000-0000-4000-8000-${String(number).padStart(12, '0')}"]`);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  page.setDefaultTimeout(10000);
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/version/check')
      ? route.fulfill({
          json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' },
        })
      : route.abort(),
  );
  await page.goto('/e2e/workspace/?board=interactions');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await expect(item(page, 10)).toBeVisible();
});

test('workspace tools are available on the background and items and open the existing appearance dialog', async ({
  page,
}) => {
  const canvas = page.locator('[data-canvas-root]');
  for (const target of [canvas, item(page, 10)]) {
    await target.click({ button: 'right', position: { x: 100, y: target === canvas ? 300 : 70 } });
    const menu = page.getByRole('menu', { name: 'Canvas actions' });
    const appearance = menu.getByRole('menuitem', { name: 'Change application appearance', exact: true });
    await expect(appearance).toBeEnabled();
    await expect(menu.getByRole('menuitem', { name: 'Open library', exact: true })).toBeDisabled();
    await appearance.click();
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Appearance settings', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Appearance settings', exact: true })).toHaveCount(0);
  }
});

test('workspace context actions stay inside the viewport and support keyboard activation', async ({ page }) => {
  const canvas = page.locator('[data-canvas-root]');
  const bounds = await canvas.boundingBox();
  await canvas.click({ button: 'right', position: { x: bounds.width / 2, y: bounds.height - 12 } });
  const menu = page.getByRole('menu', { name: 'Canvas actions' });
  const box = await menu.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  await page.keyboard.press('Home');
  await expect(menu.getByRole('menuitem', { name: 'Change application appearance', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Appearance settings', exact: true })).toBeVisible();
});

test('holding Space over the font button pans without opening its dialog; a short press opens it', async ({ page }) => {
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  const preview = page.getByRole('button', { name: 'Preview fonts', exact: true });
  await preview.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350); // Exercise the hold threshold itself.
  await page.keyboard.up('Space');
  await expect(page.getByRole('dialog', { name: 'Preview fonts' })).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog', { name: 'Preview fonts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await preview.focus();
  const before = await item(page, 10).boundingBox();
  await page.keyboard.down('Space');
  await page.mouse.move(before.x + 40, before.y + 70);
  await page.mouse.down();
  await page.mouse.move(before.x + 120, before.y + 120, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const after = await item(page, 10).boundingBox();
  expect(after.x - before.x).toBeCloseTo(80, 0);
  await expect(page.getByRole('dialog', { name: 'Preview fonts' })).toHaveCount(0);
});

const contextAction = async (page, target, name) => {
  await target.click({ button: 'right', position: { x: 100, y: 70 } });
  await page.getByRole('menuitem', { name, exact: true }).click();
};

test('logical groups move from either member, persist and ungroup without creating frames', async ({ page }) => {
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await item(page, 11).click({ position: { x: 100, y: 70 }, modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Group', exact: true }).click();
  await expect(page.locator('[data-frame-id]')).toHaveCount(1);
  await expect(page.locator('[data-group-selection]')).toHaveCount(1);
  await item(page, 10).click({ position: { x: 100, y: 70 }, modifiers: ['Shift'] });
  await expect(page.locator('[data-group-selection]')).toHaveCount(0);
  await item(page, 11).click({ position: { x: 100, y: 70 } });
  await expect(page.locator('[data-group-selection]')).toHaveCount(1);
  const before = await Promise.all([item(page, 10).getAttribute('style'), item(page, 11).getAttribute('style')]);
  const box = await item(page, 11).boundingBox();
  await page.mouse.move(box.x + 100, box.y + 70);
  await page.mouse.down();
  await page.mouse.move(box.x + 165, box.y + 120, { steps: 5 });
  await page.mouse.up();
  for (let index = 0; index < 2; index++)
    await expect(item(page, 10 + index)).not.toHaveAttribute('style', before[index]);
  const first = await item(page, 10).evaluate((node) => ({
    x: parseFloat(node.style.left),
    y: parseFloat(node.style.top),
  }));
  const second = await item(page, 11).evaluate((node) => ({
    x: parseFloat(node.style.left),
    y: parseFloat(node.style.top),
  }));
  expect(second.x - first.x).toBe(350);
  expect(second.y - first.y).toBe(0);
  await expect(page.locator('.save-status')).toHaveCount(0);
  await page.reload();
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await expect(page.locator('[data-group-selection]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ungroup', exact: true }).click();
  await expect(page.locator('[data-group-selection]')).toHaveCount(0);
  await expect(page.locator('[data-frame-id]')).toHaveCount(1);
});

test('TODO completion uses only the context menu and an internal non-interactive marker', async ({ page }) => {
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await expect(page.getByRole('button', { name: 'TODO item', exact: true })).toHaveCount(0);
  await contextAction(page, item(page, 10), 'TODO item');
  await expect(item(page, 10).locator('.item-todo')).toHaveAttribute('data-todo-done', 'false');
  await contextAction(page, item(page, 10), 'Mark as done');
  await expect(item(page, 10).locator('.item-todo-checkmark')).toBeVisible();
  await expect(item(page, 10).locator('.item-todo-toggle')).toHaveCount(0);
  await expect(item(page, 10).locator('.item-todo-content')).toHaveCSS('opacity', '0.4');
  const parent = await item(page, 10).boundingBox();
  const marker = await item(page, 10).locator('.item-todo-completion').boundingBox();
  expect(marker.x).toBeGreaterThanOrEqual(parent.x);
  expect(marker.x + marker.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
  await contextAction(page, item(page, 10), 'Mark as not done');
  await expect(item(page, 10).locator('.item-todo-checkmark')).toHaveCount(0);
});

test('shared TODO display persists across reload and completed items can be reopened', async ({ page }) => {
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await contextAction(page, item(page, 10), 'TODO item');
  await contextAction(page, item(page, 10), 'Mark as done');
  await page.getByRole('button', { name: 'Project tools', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('tab', { name: 'Canvas - defaults & projects', exact: true }).click();
  await page.getByLabel('Canvas settings for').selectOption('10000000-0000-4000-8000-000000000001');
  await page.getByLabel('TODO item appearance').selectOption('strike');
  await page.getByRole('button', { name: 'Save appearance', exact: true }).click();
  await expect(item(page, 10).locator('.item-todo-strike')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveCount(0);
  await page.reload();
  await expect(item(page, 10).locator('.item-todo-strike')).toBeVisible();
  await contextAction(page, item(page, 10), 'Mark as not done');
  await expect(item(page, 10).locator('.item-todo-strike')).toHaveCount(0);
});

test('complete local font files render Polish letters in every repaired family', async ({ page }) => {
  const families = ['Comic Neue', 'Nodex Stack', 'Nodex Schoolbell', 'Nodex Turncoat'];
  const sample = 'Zażółć gęślą jaźń · ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż';
  for (const family of families) {
    const loaded = await page.evaluate(
      async ({ family, sample }) => {
        const fonts = await document.fonts.load(`32px "${family}"`, sample);
        return fonts.length > 0 && fonts.every((font) => font.status === 'loaded');
      },
      { family, sample },
    );
    expect(loaded, family).toBe(true);
  }
  await page.evaluate(
    ({ families, sample }) => {
      const panel = document.createElement('div');
      panel.id = 'font-verification';
      Object.assign(panel.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '99999',
        background: '#fff',
        color: '#111',
        padding: '32px',
      });
      for (const family of families) {
        const label = document.createElement('p');
        label.textContent = family;
        label.style.font = '16px sans-serif';
        panel.append(label);
        for (const style of ['normal', 'bold', 'italic']) {
          const text = document.createElement('p');
          text.textContent = sample;
          Object.assign(text.style, {
            margin: '8px 0',
            fontFamily: `"${family}"`,
            fontSize: '28px',
            fontWeight: style === 'bold' ? '700' : '400',
            fontStyle: style === 'italic' ? 'italic' : 'normal',
          });
          panel.append(text);
        }
      }
      document.body.append(panel);
    },
    { families, sample },
  );
  await page.screenshot({ path: 'test-results/polish-fonts.png' });
});

test('nested TODOs are set through the menu and stay inside the column item', async ({ page }) => {
  const nested = page.locator('[data-nested-item-id="10000000-0000-4000-8000-000000000014"]');
  await nested.click({ position: { x: 100, y: 70 } });
  await contextAction(page, nested, 'TODO item');
  await contextAction(page, nested, 'Mark as done');
  await expect(nested.locator('.item-todo-checkmark')).toBeVisible();
  await expect(nested.locator('.item-todo-toggle')).toHaveCount(0);
});

test('font dialog previews custom text without changing the item until Apply', async ({ page }) => {
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  const select = page.getByRole('combobox', { name: 'Item font family', exact: true });
  await select.selectOption('kalam');
  await page.getByRole('button', { name: 'Preview fonts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview fonts', exact: true });
  await dialog.getByLabel('Your sample text').fill('Zażółć gęślą jaźń <img src=x>');
  await dialog.getByRole('radio', { name: 'Comic Neue · Playful', exact: true }).check();
  await expect(dialog.locator('[data-font-preview]')).toHaveCSS('font-family', /Comic Neue/);
  await expect(dialog.locator('[data-font-preview]')).toHaveText('Zażółć gęślą jaźń <img src=x>');
  await expect(dialog.locator('[data-font-preview] img')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/font-preview-dialog.png' });
  await expect(select).toHaveValue('kalam');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(select).toHaveValue('kalam');
  await page.getByRole('button', { name: 'Preview fonts', exact: true }).click();
  await dialog.getByRole('radio', { name: 'Comic Neue · Playful', exact: true }).check();
  await dialog.getByRole('button', { name: 'Use font', exact: true }).click();
  await expect(select).toHaveValue('comic-neue');
});

test('selected words in a note retain formatting after editing, saving and reloading', async ({ page }) => {
  const note = item(page, 10);
  await note.locator('.note-rich-text').dblclick();
  const editor = note.getByRole('textbox', { name: 'Note text', exact: true });
  await expect(editor).toBeFocused();
  await editor.locator('p').dblclick({ position: { x: 20, y: 12 } });
  await expect.poll(() => editor.evaluate(() => window.getSelection()?.toString().trim())).toBe('First');
  await note.getByRole('group', { name: 'Note formatting' }).getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(editor.locator('strong')).toHaveText('First');
  await expect(editor).toHaveText('First grouped note');
  await page.screenshot({ path: 'test-results/note-rich-editor.png' });
  await note.getByRole('group', { name: 'Note formatting' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(note.locator('.note-rich-text strong')).toHaveText('First');
  await expect(page.locator('.save-status')).toHaveCount(0);
  await page.reload();
  await expect(note.locator('.note-rich-text strong')).toHaveText('First');
  await note.locator('.note-rich-text').dblclick();
  await expect(note.getByRole('textbox', { name: 'Note text' }).locator('strong')).toHaveText('First');
  await note.getByRole('textbox', { name: 'Note text' }).press('Escape');
  await expect(note.getByRole('textbox', { name: 'Note text' })).toHaveCount(0);
});

test('note typing treats literal HTML as text and native undo stays in the editor', async ({ page }) => {
  const note = item(page, 10);
  await note.locator('.note-rich-text').dblclick();
  const editor = note.getByRole('textbox', { name: 'Note text', exact: true });
  await editor.fill('<script>literal</script> & Zażółć');
  await expect(editor).toHaveText('<script>literal</script> & Zażółć');
  await expect(editor.locator('script')).toHaveCount(0);
  await editor.press('End');
  await editor.pressSequentially('!');
  await editor.press('Control+z');
  await expect(note).toBeVisible();
  await note.getByRole('group', { name: 'Note formatting' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(note.locator('script')).toHaveCount(0);
});

test('font preview remains usable on a narrow screen and Escape restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await item(page, 10).click({ position: { x: 100, y: 70 } });
  await page.getByRole('button', { name: 'Item style', exact: true }).click();
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Preview fonts', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Preview fonts', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Your sample text').fill('Polskie znaki: ąęłóśżźćń');
  await dialog.getByRole('radio', { name: 'Kalam · Sketch', exact: true }).check();
  await expect(dialog.locator('[data-font-preview]')).toHaveCSS('font-family', /Kalam/);
  const panel = await dialog.locator('.font-preview-dialog').boundingBox();
  expect(panel.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/font-preview-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('stored rich-note HTML cannot execute code or request embedded resources', async ({ page }) => {
  const requests = [];
  await page.route('https://notes.invalid/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.evaluate(() => {
    const key = 'nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002';
    const db = JSON.parse(localStorage.getItem(key));
    const source =
      '<p onclick="window.noteAttack=1"><strong>Safe note</strong><script>window.noteAttack=1</script><img src="https://notes.invalid/tracker"><iframe src="https://notes.invalid/embed"></iframe><svg onload="window.noteAttack=1"></svg></p>';
    for (const board of [...Object.values(db.boards).flat(), ...db.projects.map((snapshot) => snapshot.board)]) {
      const note = board.items.find((item) => item.id === '10000000-0000-4000-8000-000000000010');
      if (note) note.data = { content: source, contentFormat: 'tiptap-html', contentVersion: 1 };
    }
    localStorage.setItem(key, JSON.stringify(db));
  });
  await page.reload();
  await expect(item(page, 10).locator('strong')).toHaveText('Safe note');
  await expect(item(page, 10).locator('script, img, iframe, svg[onload]')).toHaveCount(0);
  await item(page, 10).locator('.note-rich-text').dblclick();
  await expect(item(page, 10).getByRole('textbox', { name: 'Note text' })).toHaveText('Safe note');
  expect(await page.evaluate(() => window.noteAttack)).toBeUndefined();
  expect(requests).toEqual([]);
});
