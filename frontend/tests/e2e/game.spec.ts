import {test,expect} from '@playwright/test';
test('menu inicia a Floresta Viva e exibe HUD',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name:'FLORESTA VIVA'})).toBeVisible();await page.getByRole('button',{name:'Nova aventura'}).click();await expect(page.getByText('RESÍDUOS')).toBeVisible();await expect(page.locator('canvas')).toBeVisible();});
