import { showTab } from './navigation.js';

const scenarios = [
  {
    from: 'purchasing@sample-company.com',
    subject: 'Request for Quotation',
    body: 'Please quote 5,000 units of Product A, including lead time and payment terms.',
    detail:
      'Входящий RFQ: AI извлекает товар и количество и готовит проект ответа.',
    result:
      'Извлечено: Product A · 5 000 шт. · Запрос условий поставки. Проект ответа готов к проверке.',
  },
  {
    from: 'supplier@example.com',
    subject: 'Supplier Offer',
    body: 'Product A: USD 4.20 / unit; MOQ 3,000; lead time 25 days; EXW Shanghai.',
    detail:
      'Предложение поставщика: AI структурирует цену, MOQ, срок и базис поставки.',
    result:
      'Извлечено: $4.20 · MOQ 3 000 · 25 дней · EXW Shanghai. Данные готовы к проверке.',
  },
  {
    from: 'operations@example.com',
    subject: 'Delivery Follow-up',
    body: 'Could you confirm the updated delivery date for our order?',
    detail:
      'Напоминание: AI распознаёт запрос статуса и подготавливает черновик ответа.',
    result:
      'Определён запрос статуса поставки. Подготовлен проект ответа для менеджера.',
  },
];
let scenario = 0,
  timer = null,
  step = 0;
export function chooseScenario(n) {
  scenario = n;
  resetDemo();
  const s = scenarios[n];
  document.getElementById('mailFrom').textContent = 'FROM: ' + s.from;
  document.getElementById('mailSubject').textContent = s.subject;
  document.getElementById('mailBody').textContent = s.body;
  document.getElementById('scenarioDetails').textContent = s.detail;
  document.getElementById('heroScenario').value = String(n);
  document.getElementById('extraction').textContent =
    'Выберите сценарий и запустите обработку. Здесь появятся извлечённые данные и результат.';
}
function paint() {
  [...document.querySelectorAll('#steps .step')].forEach((x, i) => {
    x.classList.toggle('active', i === step - 1);
    x.classList.toggle('done', i < step);
  });
  document.getElementById('status').textContent =
    step === 4 ? 'READY' : step > 0 ? 'PROCESSING' : 'DEMO';
  const current = Math.max(0, Math.min(step, 4));
  document.getElementById('stepLabel').textContent = stageNames[current];
  document.getElementById('extraction').textContent =
    current === 0
      ? 'Выберите сценарий и запустите обработку. Здесь появятся извлечённые данные и результат.'
      : extractText[scenario][current - 1];
}
export function resetDemo() {
  clearInterval(timer);
  timer = null;
  step = 0;
  paint();
  document.getElementById('demoResult').textContent = 'Готов к запуску';
  document.getElementById('extraction').textContent =
    'Нажмите «Запустить», чтобы увидеть извлечённые данные и результат.';
  document.getElementById('runBtn').textContent = '▶ Запустить';
}
export function runDemo() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    document.getElementById('runBtn').textContent = '▶ Продолжить';
    return;
  }
  if (step >= 4) step = 0;
  document.getElementById('runBtn').textContent = 'Ⅱ Пауза';
  timer = setInterval(() => {
    step++;
    paint();
    document.getElementById('extraction').textContent =
      step === 1
        ? 'Письмо получено. Определяем тип обращения…'
        : step === 2
          ? 'Тип письма определён. Анализируем содержание…'
          : step === 3
            ? 'Данные извлечены. Подготавливаем результат…'
            : scenarios[scenario].result;
    // The approved page hides the old preview. Reuse its prepared status in
    // the visible scenario description so the processing button has a result.
    document.getElementById('scenarioDetails').textContent =
      document.getElementById('extraction').textContent;
    if (step >= 4) {
      clearInterval(timer);
      timer = null;
      document.getElementById('runBtn').textContent = '↻ Повторить';
      document.getElementById('demoResult').textContent = 'Результат готов';
      document.getElementById('scenarioDetails').textContent =
        scenarios[scenario].result;
    }
  }, 850);
}
const extractText = [
  [
    'Письмо получено. Анализ начнётся после запуска.',
    'Тип запроса: RFQ · запрос коммерческого предложения',
    'Товар: Product A · Количество: 5 000 шт.',
    'Подготовлен проект ответа с запросом уточняющих условий. Требуется проверка.',
  ],
  [
    'Письмо получено. Анализ начнётся после запуска.',
    'Тип: коммерческое предложение поставщика',
    'Цена: $4.20 · MOQ: 3 000 · Срок: 25 дней · EXW Shanghai',
    'Данные структурированы для проверки и сравнения предложений.',
  ],
  [
    'Письмо получено. Анализ начнётся после запуска.',
    'Тип: запрос обновления статуса поставки',
    'Запрошено подтверждение новой даты доставки',
    'Подготовлен черновик ответа для проверки менеджером.',
  ],
];
const stageNames = [
  'Ожидание запуска',
  'Распознавание письма',
  'Извлечение информации',
  'Подготовка результата',
  'Готово к проверке',
];
// Independent four-stage supplier simulation from the approved prototype.
const wf38Data = [
  'Подготовлен RFQ: Product A, 5 000 шт.\nЗапрошены цена за единицу, доступность, срок поставки и условия оплаты.',
  'Сформированы три демонстрационных письма для Alpha, Beta и Gamma.\nСтатус: имитация отправки; реальные сообщения не отправлены.',
  'Получены демонстрационные ответы:\nAlpha — $4.20, 25 дней, предоплата 30%.\nBeta — $4.05, 35 дней, предоплата 100%.\nGamma — $4.35, 20 дней, оплата 30 дней.',
  'Сравнение подготовлено:\nAlpha: $21 000 / 25 дней / 30% предоплата\nBeta: $20 250 / 35 дней / 100% предоплата\nGamma: $21 750 / 20 дней / отсрочка 30 дней\n\nСамая низкая цена — Beta. Самый короткий срок — Gamma. Итоговый выбор остаётся за менеджером.',
];
let wf38Step = 0,
  wf38Timer = null;
function wf38Paint() {
  const stages = document.querySelectorAll('#wf38Stages .wf38-stage');
  stages.forEach((el, i) => {
    el.classList.toggle('complete', i < wf38Step);
    el.classList.toggle('current', i === wf38Step && wf38Step < 4);
  });
  document.getElementById('wf38Bar').style.width = wf38Step * 25 + '%';
  document.getElementById('wf38Output').textContent = wf38Step
    ? wf38Data[wf38Step - 1]
    : 'Нажмите «Показать процесс», чтобы увидеть последовательность работы.';
  document.getElementById('wf38Run').textContent =
    wf38Step === 4
      ? '↻ Повторить'
      : wf38Timer
        ? 'Ⅱ Пауза'
        : wf38Step
          ? '▶ Продолжить'
          : '▶ Показать процесс';
}
export function wf38Reset() {
  if (wf38Timer !== null) clearInterval(wf38Timer);
  wf38Timer = null;
  wf38Step = 0;
  wf38Paint();
}
export function wf38Start() {
  if (wf38Timer !== null) {
    clearInterval(wf38Timer);
    wf38Timer = null;
    wf38Paint();
    return;
  }
  if (wf38Step >= 4) wf38Step = 0;
  wf38Timer = setInterval(() => {
    wf38Step++;
    if (wf38Step >= 4) {
      clearInterval(wf38Timer);
      wf38Timer = null;
    }
    wf38Paint();
  }, 1250);
  wf38Paint();
}

export function initWorkflow() {
  document
    .querySelector('[data-process-scenario]')
    .addEventListener('click', () => {
      showTab('demo');
      runDemo();
    });
  document
    .querySelectorAll('[data-scenario]')
    .forEach((el) =>
      el.addEventListener('click', () =>
        chooseScenario(Number(el.dataset.scenario)),
      ),
    );
  document
    .querySelector('[data-scenario-select]')
    .addEventListener('change', (e) => chooseScenario(Number(e.target.value)));
  document.querySelector('[data-run-demo]').addEventListener('click', runDemo);
  document
    .querySelector('[data-reset-demo]')
    .addEventListener('click', resetDemo);
  document
    .querySelector('[data-run-workflow]')
    .addEventListener('click', wf38Start);
  document
    .querySelector('[data-reset-workflow]')
    .addEventListener('click', wf38Reset);
  chooseScenario(0);
  paint();
  wf38Paint();
}
