import { expect, test, type Page } from '@playwright/test';

async function openLobby(page: Page) { await page.getByRole('button', { name: 'Lobby', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Lobby', exact: true })).toBeVisible(); }
async function openShop(page: Page) { await page.getByRole('button', { name: 'Loja', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Loja', exact: true })).toBeVisible(); }
async function startLevel(page: Page, level = 1) { await page.getByRole('button', { name: `Fase ${level}` }).click(); await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible(); }
async function seedPlayer(page: Page, economy?: Record<string, unknown>, progress?: Record<string, unknown>) { const result = await page.evaluate(async (data) => { const response = await fetch('/api/test/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return { status: response.status, body: await response.json() }; }, { economy, progress }); if (result.status !== 200) throw new Error(`Test fixture failed: ${result.status}`); }
async function startMap(page: Page) { await page.getByRole('button',{name:'Jogar'}).click();const intro=page.getByRole('button',{name:'Começar a jogar'});if(await intro.count())await intro.click(); }

test('tela inicial abre o mapa e inicia a primeira fase', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('heading', { name: 'Como jogar' })).toBeVisible();
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await expect(page.getByRole('button', { name: 'Fase 1' })).toBeVisible();
  await startLevel(page,1);
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
  await startLevel(page,1);
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
  await page.waitForTimeout(150);

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
  await startLevel(portraitPage,1);
  await expect(portraitPage.getByText('Gire o celular')).toBeVisible();
  await portrait.close();

  const landscape = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const landscapePage = await landscape.newPage();
  await landscapePage.addInitScript(() => { Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: undefined }); });
  await landscapePage.goto('/');
  await landscapePage.getByRole('button', { name: 'Jogar' }).click();
  await landscapePage.getByRole('button', { name: 'Começar a jogar' }).click();
  await startLevel(landscapePage,1);
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
  await seedPlayer(page, undefined, { unlocked: 8, stars: Array(8).fill(0), best: Array(8).fill(0) }); await page.reload();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await startLevel(page,8);
  await expect(page.getByRole('img', { name: /fase 8, Planeta Crisoverde/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

  await page.keyboard.press('k');
  await page.waitForTimeout(150);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(8000);
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Você foi derrotado' })).toHaveCount(0);
});

test('mapa oferece lobby, loja e reciclagem separados; fase inicia direto',async({page})=>{
 await page.goto('/');await startMap(page);await openLobby(page);await expect(page.getByRole('img',{name:/Prévia Crisoman/})).toBeVisible();await page.getByRole('button',{name:'Voltar ao mapa'}).click();
 await openShop(page);await page.getByRole('button',{name:'Pets'}).click();await expect(page.getByRole('button',{name:/Comprar · 🪙 180/})).toBeDisabled();await page.getByRole('button',{name:'Voltar ao mapa'}).click();
 await page.getByRole('button',{name:'Reciclagem',exact:true}).click();await expect(page.getByRole('heading',{name:'Reciclagem'})).toBeVisible();await page.getByRole('button',{name:'Trocar por moedas'}).first().click();await expect(page.getByRole('status')).toContainText('Materiais insuficientes');await page.getByRole('button',{name:'Voltar ao mapa'}).click();
 await openLobby(page);await page.getByRole('button',{name:'Crisogirl'}).click();await page.getByRole('button',{name:'Voltar ao mapa'}).click();await startLevel(page,1);await expect(page.locator('canvas')).toBeVisible();
});

test('save econômico adulterado não concede saldo nem cosméticos',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{localStorage.setItem('criso-economy-cache',JSON.stringify({coins:999999,owned:['pet-brasa']}));localStorage.setItem('crisoverde-rust-progress-v2',JSON.stringify({unlocked:8,coins:999999}));});
 await page.reload();const attacks=await page.evaluate(async()=>{const call=(path:string,body:unknown)=>fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const p=await call('/api/economy/purchase',{itemId:'pet-brasa'});const r=await call('/api/economy/recycle',{material:'papel',batches:1});const s=await call('/api/run/settle',{runId:'forjado',level:0,won:true,collectibles:[{id:'coin:falsa',type:'coin'}]});const state=await(await fetch('/api/economy')).json();return{purchase:p.status,recycle:r.status,settle:s.status,coins:state.economy.coins,owned:state.economy.owned};});expect(attacks.purchase).toBe(400);expect(attacks.recycle).toBe(400);expect(attacks.settle).toBe(409);expect(attacks.coins).toBe(0);expect(attacks.owned).not.toContain('pet-brasa');await startMap(page);await openShop(page);await expect(page.locator('main')).toContainText('🪙 0');await page.getByRole('button',{name:'Pets'}).click();await expect(page.getByRole('button',{name:/Comprar · 🪙 850/})).toBeDisabled();
});




test('matriz de personagens, skins e pets inicia sem sprite ausente',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await seedPlayer(page,{coins:10000,materials:{plastico:0,papel:0,vidro:0,metal:0},owned:['skin-crisoman-verde','skin-crisoman-urbano','skin-crisoman-natureza','skin-crisoman-agua','skin-crisoman-fogo','skin-crisogirl-rosa','skin-crisogirl-urbana','skin-crisogirl-floresta','skin-crisogirl-agua','skin-crisogirl-fogo','pet-turtix','pet-foxy','pet-folhinha','pet-pipoca','pet-brasa'],equippedSkin:{crisoman:'skin-crisoman-verde',crisogirl:'skin-crisogirl-rosa'},equippedPet:null,character:'crisoman',claimedSpawns:[],transactions:[]},{unlocked:1,stars:Array(8).fill(0),best:Array(8).fill(0)});await page.reload();
 await startMap(page);await openLobby(page);
 const choices=[['crisoman',['Guardião Verde','Urbano','Natureza','Guardião da Água','Guardião do Fogo']],['crisogirl',['Protetora Rosa','Urbana','Floresta','Protetora da Água','Protetora do Fogo']]] as const;
 for(const [character,skins] of choices){await page.getByRole('button',{name:character==='crisoman'?'Crisoman':'Crisogirl'}).click();for(const skin of skins){await page.getByRole('button',{name:skin,exact:true}).click();for(const pet of ['Turtix','Foxy','Folhinha','Pipoca','Brasa']){await page.getByRole('button',{name:pet,exact:true}).click();await page.getByRole('button',{name:'Voltar ao mapa'}).click();await page.getByRole('button',{name:'Fase 1'}).click();await expect(page.getByRole('button',{name:'Pausar'})).toBeVisible();await page.getByRole('button',{name:'Pausar'}).click();await page.getByRole('button',{name:'Voltar ao mapa'}).click();await openLobby(page);await page.getByRole('button',{name:character==='crisoman'?'Crisoman':'Crisogirl'}).click();await page.getByRole('button',{name:skin,exact:true}).click();}await page.getByRole('button',{name:'Sem pet'}).click();await page.getByRole('button',{name:'Voltar ao mapa'}).click();await page.getByRole('button',{name:'Fase 1'}).click();await expect(page.getByRole('button',{name:'Pausar'})).toBeVisible();await page.getByRole('button',{name:'Pausar'}).click();await page.getByRole('button',{name:'Voltar ao mapa'}).click();await openLobby(page);}}
 expect(errors).toEqual([]);
});
test('reciclagem, compra e loadout persistem em telas separadas',async({page})=>{
 await page.goto('/');await seedPlayer(page,{coins:120,materials:{plastico:0,papel:10,vidro:0,metal:0},owned:['skin-crisoman-verde','skin-crisogirl-rosa'],equippedSkin:{crisoman:'skin-crisoman-verde',crisogirl:'skin-crisogirl-rosa'},equippedPet:null,character:'crisoman',claimedSpawns:[],transactions:[]},{unlocked:1,stars:Array(8).fill(0),best:Array(8).fill(0)});await page.reload();await startMap(page);
 await page.getByRole('button',{name:'Reciclagem',exact:true}).click();await page.getByRole('button',{name:'Trocar por moedas'}).nth(1).click();await expect(page.getByRole('status')).toContainText('+15 moedas');await page.getByRole('button',{name:'Voltar ao mapa'}).click();
 await openShop(page);page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:/Comprar · 🪙 120/}).click();await expect(page.getByRole('status')).toContainText('comprado');await page.getByRole('button',{name:'Voltar ao mapa'}).click();
 await openLobby(page);await page.getByRole('button',{name:'Urbano',exact:true}).click();await expect(page.locator('main')).toContainText('Urbano');await page.waitForTimeout(300);await page.reload();await startMap(page);await openLobby(page);await expect(page.locator('main')).toContainText('🪙 15');await expect(page.locator('main')).toContainText('Urbano');await page.getByRole('button',{name:'Voltar ao mapa'}).click();await openShop(page);await expect(page.getByRole('button',{name:/Comprado · equipe no Lobby/})).toBeVisible();
});

