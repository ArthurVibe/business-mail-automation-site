import { test, expect } from '@playwright/test';

const normalized = (value) => value.replace(/\s/g, ' ');
async function output(page, id, text) {
  await expect
    .poll(async () => normalized(await page.locator(`#${id}`).innerText()))
    .toBe(text);
}
async function sendWorkspace(page, message) {
  await page.locator('#wsInput').fill(message);
  await page.locator('.ws-compose button[type=submit]').click();
}

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`continuous sections, navigation, calculator and mobile workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    const failed = [];
    const external = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => failed.push(request.url()));
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4173/'))
        external.push(request.url());
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const section = (id) => {
        const e = document.getElementById(id);
        const rect = e.getBoundingClientRect();
        return {
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
          height: rect.height,
        };
      };
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        demo: section('demo'),
        economy: section('economy'),
        consultant: section('consultant'),
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
    expect(geometry.demo.height).toBeGreaterThan(0);
    expect(geometry.economy.top).toBeGreaterThanOrEqual(
      geometry.demo.bottom - 1,
    );
    expect(geometry.consultant.top).toBeGreaterThanOrEqual(
      geometry.economy.bottom - 1,
    );

    await page.locator('.hero-secondary-cta').click();
    await expect(page.locator('.tab[data-tab=demo]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    for (const id of ['economy', 'consultant', 'demo']) {
      const tab = page.locator(`.tab[data-tab=${id}]`);
      await tab.focus();
      await page.keyboard.press('Enter');
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect
        .poll(async () =>
          page
            .locator(`#${id}`)
            .evaluate((e) =>
              Math.abs(
                e.getBoundingClientRect().top -
                  parseFloat(getComputedStyle(e).scrollMarginTop),
              ),
            ),
        )
        .toBeLessThan(3);
      await expect(page.locator('#economy')).toBeVisible();
      await expect(page.locator('#consultant')).toBeVisible();
    }

    await page.locator('.tab[data-tab=economy]').click();
    await page.locator('#emails').fill('150');
    await output(page, 'hoursOut', '198 ч');
    await output(page, 'netOut', '$2 571');
    await page.locator('.hero-main-cta').click();
    await expect(page.locator('#wsOverlay')).toHaveAttribute(
      'aria-hidden',
      'false',
    );
    await page.locator('.ws-quick button').first().click();
    await sendWorkspace(page, '2');
    await sendWorkspace(page, 'Интеграции не нужны');
    if (width <= 760) {
      await page.locator('#wsTabProposal').click();
      await expect(page.locator('#wsGrid')).toHaveAttribute(
        'data-view',
        'proposal',
      );
    }
    await output(page, 'wsEmails', '150');
    await output(page, 'wsMailboxes', '2');
    await output(page, 'wsProgressText', '100%');
    await expect(page.locator('#wsPlan')).toContainText('BUSINESS');
    await page.keyboard.press('Escape');
    await expect(page.locator('#wsOverlay')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
    expect(external).toEqual([]);
    const images = await page.evaluate(() =>
      [...document.images].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    expect(images).toBe(true);
    const backgrounds = await page.evaluate(async () => {
      const urls = new Set();
      for (const element of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after']) {
          for (const match of getComputedStyle(
            element,
            pseudo,
          ).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))
            urls.add(match[1]);
        }
      }
      return Promise.all(
        [...urls].map(
          (url) =>
            new Promise((resolve) => {
              const image = new Image();
              image.onload = () => resolve({ url, loaded: true });
              image.onerror = () => resolve({ url, loaded: false });
              image.src = url;
            }),
        ),
      );
    });
    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds.every((image) => image.loaded)).toBe(true);
  });
}

test('calculator preserves original defaults, all six inputs and boundaries', async ({
  page,
}) => {
  await page.goto('/');
  await output(page, 'hoursOut', '132 ч');
  await output(page, 'grossOut', '$1 980');
  await output(page, 'netOut', '$1 581');
  await output(page, 'yearCostOut', '$5 688');
  await expect(page.locator('#annualOut')).toHaveText(/18\s072$/);

  const checks = [
    ['emails', '200', '264 ч', '$3 561'],
    ['minutes', '3', '132 ч', '$1 581'],
    ['hourly', '20', '132 ч', '$2 241'],
    ['share', '100', '220 ч', '$4 001'],
    ['monthly', '500', '220 ч', '$3 900'],
    ['setup', '1200', '220 ч', '$3 900'],
  ];
  for (const [id, value, hours, net] of checks) {
    await page.locator(`#${id}`).fill(value);
    await output(page, 'hoursOut', hours);
    await output(page, 'netOut', net);
  }
  await output(page, 'yearCostOut', '$7 200');
  await expect(page.locator('#annualOut')).toHaveText(/45\s600$/);
  await page.locator('#share').fill('120');
  await output(page, 'hoursOut', '220 ч');
  await page.locator('#emails').fill('-1');
  await output(page, 'hoursOut', '0 ч');
  await output(page, 'netOut', '−$500');
  for (const id of [
    'emails',
    'minutes',
    'hourly',
    'share',
    'monthly',
    'setup',
  ]) {
    await page.locator(`#${id}`).fill('');
  }
  await output(page, 'hoursOut', '0 ч');
  await output(page, 'netOut', '$0');
  await expect(page.locator('.commercial-results')).not.toContainText(
    /NaN|Infinity/,
  );
});

test('START, BUSINESS and CUSTOM plan selection retain rates', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('.price')
    .filter({ has: page.locator('h3', { hasText: /^START$/ }) })
    .getByRole('button')
    .click();
  await expect(page.locator('#monthly')).toHaveValue('149');
  await output(page, 'netOut', '$1 831');
  await expect(page.locator('#planOut')).toContainText('START');
  await page
    .locator('.price')
    .filter({ has: page.locator('h3', { hasText: /^CUSTOM$/ }) })
    .getByRole('button')
    .click();
  await expect(page.locator('#monthly')).toHaveValue('149');
  await expect(page.locator('#planOut')).toHaveText(
    'CUSTOM · стоимость уточняется',
  );
  await page
    .locator('.price')
    .filter({ has: page.locator('h3', { hasText: /^BUSINESS$/ }) })
    .getByRole('button')
    .click();
  await expect(page.locator('#monthly')).toHaveValue('399');
});

test('supplier workflow advances, pauses, completes, resets and restarts', async ({
  page,
}) => {
  await page.goto('/');
  expect(await page.locator('#wf38Input').textContent()).toBe(
    'Товар: Product A\nКоличество: 5 000 шт.\nПоставщики: Alpha, Beta, Gamma\nЦель: получить цену, срок поставки и условия оплаты.',
  );
  await page.clock.install();
  const run = page.locator('#wf38Run');
  await run.click();
  await page.clock.fastForward(1250);
  await expect(page.locator('#wf38Bar')).toHaveAttribute('style', /25%/);
  const firstStep = await page.locator('#wf38Output').textContent();
  await run.click();
  await page.clock.fastForward(5000);
  await expect(page.locator('#wf38Output')).toHaveText(firstStep);
  await run.click();
  for (let step = 0; step < 3; step += 1) await page.clock.fastForward(1250);
  await expect(page.locator('#wf38Bar')).toHaveAttribute('style', /100%/);
  await expect(page.locator('#wf38Stages .complete')).toHaveCount(4);
  await expect(page.locator('#wf38Output')).toContainText('Сравнение');
  await page.locator('.wf38-actions .secondary').click();
  await expect(page.locator('#wf38Bar')).toHaveAttribute('style', /0%/);
  await expect(page.locator('#wf38Output')).toContainText('Нажмите');
  await run.click();
  await page.clock.fastForward(1250);
  await expect(page.locator('#wf38Bar')).toHaveAttribute('style', /25%/);
});

test('consultant scripted branches, literal text and proposal download', async ({
  page,
}) => {
  await page.goto('/');
  for (const [text, answer] of [
    ['Что умеет система?', 'Демонстрируем классификацию писем'],
    ['Сколько стоит?', 'START — $149/мес.'],
    ['Экономика', 'Расчёт учитывает подписку и разовое внедрение.'],
  ]) {
    const previous = await page.locator('#chatlog .bubble').count();
    await page
      .locator('#consultant .quick')
      .getByRole('button', { name: text, exact: true })
      .click();
    await expect(page.locator('#chatlog .bubble')).toHaveCount(previous + 2);
    await expect(page.locator('#chatlog .bubble').last()).toContainText(answer);
  }
  await page
    .locator('#chatInput')
    .fill('У нас 200 писем и 2 ящика <img src=x onerror=alert(1)>');
  await page.locator('.chatrow button').click();
  await expect(page.locator('#proposalText')).toContainText(
    '200 писем и 2 ящика <img',
  );
  await expect(page.locator('#chatlog img')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#consultant .summary button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('BMA_preliminary_proposal.txt');
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString('utf8');
  expect(content).toContain('200 писем и 2 ящика');
  expect(content).toContain('Цены демонстрационные');
});

test('workspace profile, calculator sync, reset and download', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.hero-main-cta').click();
  await expect(page.locator('#wsInput')).toBeFocused();
  await page.locator('.ws-quick button').first().click();
  await sendWorkspace(page, '2');
  await sendWorkspace(page, 'Интеграции не нужны');
  await output(page, 'wsProgressText', '100%');
  await output(page, 'wsIndustry', 'Логистика');
  await output(page, 'wsProcess', 'Запросы ставок перевозчиков');
  await output(page, 'wsHours', '198 ч');
  await output(page, 'wsNet', '$2 571');
  await page.locator('.ws-right > .ws-close').click();
  await expect(page.locator('#wsOverlay')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect
    .poll(async () =>
      page
        .locator('#economy')
        .evaluate((e) =>
          Math.abs(
            e.getBoundingClientRect().top -
              parseFloat(getComputedStyle(e).scrollMarginTop),
          ),
        ),
    )
    .toBeLessThan(3);
  await page.locator('#minutes').fill('10');
  await page.locator('.hero-main-cta').click();
  await output(page, 'wsHours', '330 ч');
  await output(page, 'wsNet', '$4 551');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.ws-primary').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'BMA_Workspace_preliminary_proposal.txt',
  );
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString('utf8');
  expect(content).toContain('Почтовых ящиков: 2');
  expect(content).toContain('Высвобождаемое время / месяц: 330 ч');
  await page.locator('.ws-foot button').click();
  await output(page, 'wsProgressText', '0%');
  await expect(page.locator('#wsChatlog .ws-msg')).toHaveCount(1);
  await output(page, 'wsEmails', 'Не указано');
});

test('three prepared mail scenarios complete without duplicate timers', async ({
  page,
}) => {
  await page.goto('/');
  await page.clock.install();
  const results = [
    'Извлечено: Product A · 5 000 шт. · Запрос условий поставки. Проект ответа готов к проверке.',
    'Извлечено: $4.20 · MOQ 3 000 · 25 дней · EXW Shanghai. Данные готовы к проверке.',
    'Определён запрос статуса поставки. Подготовлен проект ответа для менеджера.',
  ];
  for (let index = 0; index < results.length; index += 1) {
    await page.locator('#demo .quick button').nth(index).click();
    await page.locator('[data-process-scenario]').click();
    for (let step = 0; step < 4; step += 1) await page.clock.fastForward(850);
    await expect(page.locator('#scenarioDetails')).toHaveText(results[index]);
  }
});

test('mobile modal traps focus, reopens proposal and returns to calculator', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/');
  await page.locator('.hero-main-cta').click();
  await page.locator('#wsTabProposal').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.hero-main-cta')).toBeFocused();
  await page.locator('.hero-main-cta').click();
  const focusedVisible = await page.evaluate(() => {
    const e = document.activeElement;
    return (
      e.closest('#wsOverlay') !== null && e.getBoundingClientRect().height > 0
    );
  });
  expect(focusedVisible).toBe(true);
  for (let count = 0; count < 16; count += 1) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.getElementById('wsOverlay').contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.locator('.ws-right > .ws-close').click();
  await expect(page.locator('#wsOverlay')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect
    .poll(async () =>
      page
        .locator('#economy')
        .evaluate((e) =>
          Math.abs(
            e.getBoundingClientRect().top -
              parseFloat(getComputedStyle(e).scrollMarginTop),
          ),
        ),
    )
    .toBeLessThan(3);
});
