import { calculate, num } from './calculator.js';
import { showTab } from './navigation.js';

const wsProfile = {
  industry: null,
  process: null,
  emails: null,
  mailboxes: null,
  integrations: null,
  minutes: null,
  hourly: null,
  share: null,
};
const wsState = { lastQuestion: null, turns: 0, history: [] };
const wsQuestions = [
  [
    'industry',
    'В какой сфере работает компания? Например: логистика, закупки, продажи, производство.',
  ],
  ['process', 'Какие операции с письмами отнимают больше всего времени?'],
  ['emails', 'Сколько писем в рабочий день обрабатывает команда?'],
  ['mailboxes', 'Сколько почтовых ящиков нужно подключить?'],
  [
    'integrations',
    'Нужны ли интеграции с CRM, ERP, 1С, Excel или другими системами? Если нет — так и напишите.',
  ],
];
const wsDigits = {
  ноль: 0,
  один: 1,
  одна: 1,
  одно: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  пятнадцать: 15,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
  сто: 100,
  двести: 200,
  триста: 300,
  четыреста: 400,
  пятьсот: 500,
  тысяча: 1000,
};
export function wsNumber(s) {
  if (!s) return null;
  s = String(s).toLowerCase().trim();
  const numeric = s.replace(/\s/g, '').match(/^\d+(?:[.,]\d+)?$/);
  if (numeric) return Number(numeric[0].replace(',', '.'));
  const words = s.split(/[\s-]+/);
  if (!words.every((w) => Object.hasOwn(wsDigits, w))) return null;
  let n = 0;
  for (const w of words) {
    if (wsDigits[w] === 1000) n = (n || 1) * 1000;
    else n += wsDigits[w];
  }
  return n;
}
function wsValue(text, units, before = true) {
  const token = '(\\d[\\d\\s]{0,6}|[а-яё]+(?:[ -][а-яё]+){0,2})';
  const re = new RegExp(
    before
      ? token + '\\s*(?:' + units + ')'
      : '(?:' + units + ')\\s*(?:около|примерно|порядка|:|—|-)?\\s*' + token,
    'i',
  );
  const m = text.match(re);
  return m ? wsNumber(m[1]) : null;
}
function wsBubble(t, me = false) {
  const e = document.createElement('div');
  e.className = 'ws-msg' + (me ? ' me' : '');
  e.textContent = t;
  const log = document.getElementById('wsChatlog');
  log.appendChild(e);
  log.scrollTop = log.scrollHeight;
}
export function openWorkspace() {
  wsState.focus = document.activeElement;
  const o = document.getElementById('wsOverlay');
  o.classList.add('open');
  o.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ws-locked');
  workspaceSync();
  const input = document.getElementById('wsInput');
  (input.getClientRects().length
    ? input
    : document.getElementById('wsTabProposal')
  ).focus();
}
export function closeWorkspace() {
  const o = document.getElementById('wsOverlay');
  o.classList.remove('open');
  o.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ws-locked');
  (wsState.focus || document.getElementById('wsLaunch')).focus();
}
function wsView(v) {
  document.getElementById('wsGrid').dataset.view = v;
  document.getElementById('wsTabChat').classList.toggle('active', v === 'chat');
  document
    .getElementById('wsTabProposal')
    .classList.toggle('active', v === 'proposal');
}
function wsSuggestion(t) {
  document.getElementById('wsInput').value = t;
  workspaceAsk();
}
export function wsExtract(t) {
  const p = wsProfile,
    found = [];
  const industry = [
    [/логист|перевоз|транспорт/i, 'Логистика'],
    [/закуп|снабжен|торгов|дистрибьют/i, 'Закупки / торговля'],
    [/продаж|отдел продаж|лид/i, 'Продажи'],
    [/производств|завод/i, 'Производство'],
    [/администр|делопроизвод|документооборот/i, 'Административные процессы'],
  ];
  for (const [r, v] of industry)
    if (r.test(t)) {
      if (p.industry !== v) found.push('сфера: ' + v);
      p.industry = v;
      break;
    }
  if (
    !p.industry &&
    wsState.lastQuestion === 'industry' &&
    t.trim().length >= 3 &&
    !/^(не знаю|затрудняюсь|нет|да)$/i.test(t.trim())
  ) {
    p.industry = t.trim().slice(0, 100);
    found.push('сфера: ' + p.industry);
  }

  const process = [
    [
      /ставк|фрахт|тариф.*перевоз|запрос.*перевозчик/i,
      'Запросы ставок перевозчиков',
    ],
    [
      /rfq|котиров|предложен.*поставщик|сравн.*предложен|запрос.*цен/i,
      'RFQ и предложения поставщиков',
    ],
    [
      /follow.?up|напоминан|контрол.*ответ|срок.*ответ/i,
      'Follow-up и контроль ответов',
    ],
    [/сч[её]т|инвойс|накладн|документ/i, 'Обработка документов'],
    [
      /заявк|обращени|входящ.*запрос|ответ.*клиент/i,
      'Обработка входящих запросов',
    ],
  ];
  for (const [r, v] of process)
    if (r.test(t)) {
      if (p.process !== v) found.push('процесс: ' + v);
      p.process = v;
      break;
    }
  // Do not trap the visitor on a fixed list of processes: accept a free-text description.
  if (
    !p.process &&
    wsState.lastQuestion === 'process' &&
    t.trim().length >= 3 &&
    !/^(не знаю|затрудняюсь|пока не знаю|нет|да)$/i.test(t.trim())
  ) {
    p.process = t.trim().slice(0, 180);
    found.push('процесс: ' + p.process);
  }

  const eunits = 'пис(?:ем|ьма|ьмо)|email|e-mail|письм(?:а|о)?';
  let emails = wsValue(t, eunits, true);
  if (emails === null) emails = wsValue(t, eunits, false);
  const bunits =
    '(?:почтов(?:ых|ые|ый)?\\s*)?ящик(?:ов|а)?|mailbox(?:es)?|почт(?:ы|а)';
  let boxes = wsValue(t, bunits, true);
  if (boxes === null) boxes = wsValue(t, bunits, false);
  const mins = wsValue(
    t,
    'минут(?:ы|у)?(?:\\s+на\\s+(?:письмо|обработку))?|мин\\.?\\s*(?:на\\s+письмо)?',
    true,
  );
  const rate = wsValue(
    t,
    '(?:доллар(?:ов|а)?|usd|\\$)\\s*(?:в\\s*час|за\\s*час)',
    true,
  );
  const share = wsValue(t, '%\\s*(?:автоматизац|снижен|сокращен)?', true);
  // A bare numeric answer is interpreted only in the context of the question actually asked.
  const bare = wsNumber(
    t.replace(/^(около|примерно|порядка|у нас|всего)\s+/i, ''),
  );
  if (wsState.lastQuestion === 'emails' && emails === null && bare !== null)
    emails = bare;
  if (wsState.lastQuestion === 'mailboxes' && boxes === null && bare !== null)
    boxes = bare;
  if (Number.isFinite(emails) && emails >= 0 && emails <= 100000) {
    p.emails = emails;
    document.getElementById('emails').value = emails;
    found.push('писем в день: ' + emails);
  }
  if (Number.isFinite(boxes) && boxes >= 1 && boxes <= 999) {
    p.mailboxes = boxes;
    found.push('почтовых ящиков: ' + boxes);
  }
  if (Number.isFinite(mins) && mins > 0 && mins <= 240) {
    p.minutes = mins;
    document.getElementById('minutes').value = mins;
    found.push('минут на письмо: ' + mins);
  }
  if (Number.isFinite(rate) && rate > 0 && rate <= 10000) {
    p.hourly = rate;
    document.getElementById('hourly').value = rate;
    found.push('стоимость часа: $' + rate);
  }
  if (Number.isFinite(share) && share >= 0 && share <= 100) {
    p.share = share;
    document.getElementById('share').value = share;
    found.push('снижение трудозатрат: ' + share + '%');
  }
  if (
    (/(?:^|\W)(?:нет|не нужно|не нужны|без интеграций|никакие)(?:\W|$)/i.test(
      t,
    ) &&
      wsState.lastQuestion === 'integrations') ||
    /без интеграци|интеграци[ий]\s+не\s+нуж|интеграци[ий]\s+нет/i.test(t)
  ) {
    p.integrations = 'Не требуются';
    found.push('интеграции не требуются');
  } else if (
    /crm|erp|1с|1c|битрикс|amo|salesforce|sap|api|google sheets|excel|таблиц|интеграц/i.test(
      t,
    ) &&
    !/без интеграци|интеграци[ий]\s+не\s+нуж|интеграци[ий]\s+нет/i.test(t)
  ) {
    p.integrations = 'Нужны — ' + t.slice(0, 120);
    found.push('интеграции: требуются');
  }
  calculate();
  return found;
}
export function wsRecommendedPlan() {
  const p = wsProfile;
  if (!p.process || p.mailboxes === null) return 'Требуется уточнение';
  if (p.mailboxes > 3 || p.integrations?.startsWith('Нужны'))
    return 'CUSTOM · предварительно';
  if (p.mailboxes === 1) return 'START · предварительно (состав уточняется)';
  return 'BUSINESS · предварительно (состав уточняется)';
}
export function workspaceSync() {
  const p = wsProfile,
    set = (id, v) => (document.getElementById(id).textContent = v);
  set('wsIndustry', p.industry || 'Не указана');
  set('wsProcess', p.process || 'Не указан');
  set('wsEmails', p.emails === null ? 'Не указано' : String(p.emails));
  set('wsMailboxes', p.mailboxes === null ? 'Не указано' : String(p.mailboxes));
  set('wsIntegrations', p.integrations || 'Не указаны');
  set('wsPlan', wsRecommendedPlan());
  set(
    'wsHours',
    p.emails === null
      ? 'Нужны данные'
      : document.getElementById('hoursOut').textContent,
  );
  set(
    'wsNet',
    p.emails === null
      ? 'Нужны данные'
      : document.getElementById('netOut').textContent,
  );
  set('wsSetup', document.getElementById('setupOut').textContent + ' · пример');
  const filled = [
    'industry',
    'process',
    'emails',
    'mailboxes',
    'integrations',
  ].filter((k) => p[k] !== null).length;
  set('wsStatus', 'Профиль: ' + filled + ' из 5 параметров');
  const progress = Math.round((filled / 5) * 100);
  document.getElementById('wsProgressFill').style.width = progress + '%';
  set('wsProgressText', progress + '%');
  set(
    'proposalText',
    'Отрасль: ' +
      (p.industry || 'не указана') +
      '. Процесс: ' +
      (p.process || 'не указан') +
      '. Писем в день: ' +
      (p.emails ?? 'не указано') +
      '. Почтовых ящиков: ' +
      (p.mailboxes ?? 'не указано') +
      '. Интеграции: ' +
      (p.integrations || 'не указаны') +
      '. Рекомендация: ' +
      wsRecommendedPlan() +
      '.',
  );
}
function wsNextQuestion() {
  const q = wsQuestions.find(([key]) => wsProfile[key] === null);
  wsState.lastQuestion = q ? q[0] : null;
  return q ? q[1] : null;
}
function wsAnswer(t, found) {
  const p = wsProfile;
  if (
    /(?:сколько стоит|стоимост(?:ь|и|ью)\s+(?:систем|сервис|подписк|внедрен)|тариф(?:ы|ов|а)?|прайс|оплата сервиса)/i.test(
      t,
    )
  ) {
    const next = wsNextQuestion();
    return (
      'В демонстрационном прайсе START — $149/мес., BUSINESS — $399/мес., CUSTOM — по расчёту. Внедрение оплачивается отдельно; цены не утверждены.' +
      (next ? ' ' + next : '')
    );
  }
  if (/(?:выгод|эконом|окупаем|roi)/i.test(t)) {
    const next = wsNextQuestion();
    return (
      'Расчёт основан на 22 рабочих днях, времени на письмо, стоимости часа и доле снижения трудозатрат. Это оценка высвобождаемого времени, не гарантированная экономия.' +
      (next ? ' ' + next : '')
    );
  }
  if (/(?:что умеет|как работает|возможност|функци)/i.test(t)) {
    const next = wsNextQuestion();
    return (
      'В демо показаны классификация писем, извлечение данных, проекты ответов и контроль follow-up. Реальные сценарии настраиваются отдельно.' +
      (next ? ' ' + next : '')
    );
  }
  const next = wsNextQuestion();
  if (next)
    return (
      (found.length ? 'Зафиксировал: ' + found.join('; ') + '. ' : '') + next
    );
  return (
    (found.length ? 'Обновил профиль: ' + found.join('; ') + '. ' : '') +
    'Основные параметры собраны. Справа — предварительная конфигурация и расчёт. Можно уточнить условия, исправить данные или скачать КП. Для точной стоимости нужна проверка процессов и согласование условий.'
  );
}
function workspaceAsk() {
  const input = document.getElementById('wsInput'),
    t = input.value.trim();
  if (!t) return;
  wsBubble(t, true);
  input.value = '';
  wsState.turns++;
  wsState.history.push({ role: 'user', text: t });
  const found = wsExtract(t);
  workspaceSync();
  const answer = wsAnswer(t, found);
  wsBubble(answer);
  wsState.history.push({ role: 'assistant', text: answer });
}
function workspaceDownload() {
  workspaceSync();
  const p = wsProfile;
  const lines = [
    'BUSINESS MAIL AUTOMATION — ПРЕДВАРИТЕЛЬНОЕ КП',
    '',
    'Отрасль: ' + (p.industry || 'не указана'),
    'Процесс: ' + (p.process || 'не указан'),
    'Писем в рабочий день: ' + (p.emails ?? 'не указано'),
    'Почтовых ящиков: ' + (p.mailboxes ?? 'не указано'),
    'Интеграции: ' + (p.integrations || 'не указаны'),
    'Предварительная рекомендация: ' + wsRecommendedPlan(),
    '',
    'ПАРАМЕТРЫ РАСЧЁТА',
    'Минут на письмо: ' + num('minutes'),
    'Стоимость часа (USD): ' + num('hourly'),
    'Снижение трудозатрат (%): ' + num('share'),
    'Высвобождаемое время / месяц: ' +
      (p.emails === null
        ? 'не рассчитано'
        : document.getElementById('hoursOut').textContent),
    'Оценка эффекта / месяц: ' +
      (p.emails === null
        ? 'не рассчитано'
        : document.getElementById('netOut').textContent),
    'Ежемесячная плата (демо): $' + num('monthly'),
    'Разовое внедрение (демо): $' + num('setup'),
    '',
    'ВАЖНО: цены и условия демонстрационные; экономический эффект не является гарантированным снижением расходов. Конфигурация требует подтверждения.',
  ];
  const blob = new Blob([lines.join('\n')], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BMA_Workspace_preliminary_proposal.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function workspaceReset() {
  for (const k of Object.keys(wsProfile)) wsProfile[k] = null;
  wsState.lastQuestion = 'industry';
  wsState.turns = 0;
  wsState.history = [];
  document.getElementById('wsChatlog').replaceChildren();
  wsBubble(
    'Здравствуйте! Я помогу подготовить предварительное предложение. В какой сфере работает ваша компания и какие письма вы обрабатываете чаще всего?',
  );
  workspaceSync();
  wsView('chat');
}

export function initProposal() {
  document.addEventListener('calculator:change', workspaceSync);
  document
    .querySelectorAll('[data-open-workspace]')
    .forEach((el) => el.addEventListener('click', openWorkspace));
  document.querySelectorAll('[data-close-workspace]').forEach((el) =>
    el.addEventListener('click', () => {
      closeWorkspace();
      if (el.dataset.scroll) showTab(el.dataset.scroll);
    }),
  );
  document
    .querySelectorAll('.ws-mobile-tabs [data-view]')
    .forEach((el) =>
      el.addEventListener('click', () => wsView(el.dataset.view)),
    );
  document
    .querySelectorAll('[data-suggestion]')
    .forEach((el) =>
      el.addEventListener('click', () => wsSuggestion(el.dataset.suggestion)),
    );
  document
    .querySelector('[data-form="workspace"]')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      workspaceAsk();
    });
  document
    .querySelector('[data-download-workspace]')
    .addEventListener('click', workspaceDownload);
  document
    .querySelector('[data-reset-workspace]')
    .addEventListener('click', workspaceReset);
  const overlay = document.getElementById('wsOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWorkspace();
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeWorkspace();
    if (e.key === 'Tab') {
      const elements = [...overlay.querySelectorAll('button, input')].filter(
        (el) => el.getClientRects().length && !el.disabled,
      );
      const first = elements[0],
        last = elements.at(-1);
      if (!overlay.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  workspaceReset();
}
