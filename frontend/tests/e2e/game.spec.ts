import { expect, test } from '@playwright/test';

test('tela inicial abre o mapa e inicia a primeira fase', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('heading', { name: 'Como jogar' })).toBeVisible();
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await expect(page.getByRole('button', { name: 'Fase 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Fase 1' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await expect.poll(() => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
});

test('controles, pausa, retomada, reinício e retorno ao mapa funcionam', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await page.getByRole('button', { name: 'Fase 1' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Jogo CrisoGuardian/ })).toBeVisible();

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await expect(page.getByRole('status')).toHaveText('ATAQUE ESPECIAL!');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.getByRole('button', { name: 'Reiniciar fase' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.getByRole('button', { name: 'Voltar ao mapa' }).click();
  await expect(page.getByRole('button', { name: 'Fase 1' })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});


test('layout móvel orienta a rotação e mantém controles de toque acessíveis', async ({ browser }) => {
  const portrait = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const portraitPage = await portrait.newPage();
  await portraitPage.addInitScript(() => { Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: undefined }); });
  await portraitPage.goto('/');
  await portraitPage.getByRole('button', { name: 'Jogar' }).click();
  await portraitPage.getByRole('button', { name: 'Começar a jogar' }).click();
  await portraitPage.getByRole('button', { name: 'Fase 1' }).click();
  await expect(portraitPage.getByText('Gire o celular')).toBeVisible();
  await portrait.close();

  const landscape = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const landscapePage = await landscape.newPage();
  await landscapePage.addInitScript(() => { Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: undefined }); });
  await landscapePage.goto('/');
  await landscapePage.getByRole('button', { name: 'Jogar' }).click();
  await landscapePage.getByRole('button', { name: 'Começar a jogar' }).click();
  await landscapePage.getByRole('button', { name: 'Fase 1' }).click();
  await expect(landscapePage.locator('canvas')).toBeVisible();
  await expect(landscapePage.getByRole('button', { name: 'Atirar' })).toBeVisible();
  await expect(landscapePage.getByRole('button', { name: 'Pular' })).toBeVisible();
  await expect(landscapePage.getByRole('button', { name: 'Mover à esquerda' })).toBeVisible();
  await landscape.close();
});


test('fase 8 inicia no navegador e responde a movimento e habilidade', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('crisoverde-rust-progress-v2', JSON.stringify({ unlocked: 8, stars: Array(8).fill(0), coins: 0, best: Array(8).fill(0) }));
    localStorage.setItem('crisoguardian-settings-v1', JSON.stringify({ difficulty: 'easy', autoFire: false, introAnim: false }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await page.getByRole('button', { name: 'Fase 8' }).click();
  await expect(page.getByRole('img', { name: /fase 8, Planeta Crisoverde/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

  await page.keyboard.press('k');
  await expect(page.getByRole('status')).toHaveText('ATAQUE ESPECIAL!');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(8000);
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Você foi derrotado' })).toHaveCount(0);
});
