import { calculate, num } from './calculator.js';
import { workspaceSync } from './proposal.js';
export function selectPlan(p, amount) {
  if (amount !== null) {
    document.getElementById('monthly').value = amount;
  }
  document
    .querySelectorAll('.price')
    .forEach((x) =>
      x.classList.toggle('selected', x.querySelector('h3').textContent === p),
    );
  calculate();
  document.getElementById('planOut').textContent =
    p +
    (amount === null
      ? ' · стоимость уточняется'
      : ' · $' + amount + '/мес. (пример)');
  document.getElementById('proposalText').textContent =
    'Выбран вариант ' +
    p +
    '. Обсудим объём почты, сценарии и стоимость внедрения.';
  workspaceSync();
}
function addBubble(t, isUser) {
  const d = document.createElement('div');
  d.className = 'bubble' + (isUser ? ' user' : '');
  d.textContent = t;
  document.getElementById('chatlog').appendChild(d);
  document.getElementById('chatlog').scrollTop = 99999;
}
export function ask(text) {
  text = String(text || '').trim();
  if (!text) return;
  addBubble(text, true);
  let answer =
    'Для точного предложения нужны количество почтовых ящиков, примерное число писем в день и основные повторяющиеся операции. В текущем прототипе ответы демонстрационные.';
  if (/стоим|цен|тариф|плат|сколько стоит/i.test(text))
    answer =
      'Примерные варианты: START — $149/мес., BUSINESS — $399/мес., CUSTOM — индивидуально. Разовое внедрение отдельно. Это не утверждённый прайс.';
  else if (/выгод|эконом|roi|сэконом/i.test(text))
    answer =
      'Откройте раздел «Экономика»: там можно изменить объём писем, трудозатраты и стоимость часа. Расчёт учитывает подписку и разовое внедрение.';
  else if (/умеет|функц|делает|работает/i.test(text))
    answer =
      'Демонстрируем классификацию писем, извлечение данных, подготовку ответов, RFQ и обработку предложений. Состав внедрения согласовывается отдельно.';
  else if (/ящик|писем|письма|rfq|поставщик/i.test(text)) {
    answer =
      'Спасибо, эти параметры помогут подготовить конфигурацию. Для финальной цены нужно уточнить количество сценариев и интеграции.';
    document.getElementById('proposalText').textContent =
      'Запрос клиента: ' +
      text +
      ' · Требуется уточнение сценариев и объёма внедрения.';
  }
  addBubble(answer, false);
}
export function downloadProposal() {
  const content = [
    'BUSINESS MAIL AUTOMATION — ПРЕДВАРИТЕЛЬНОЕ КП',
    '',
    document.getElementById('proposalText').textContent,
    'Тариф: ' + document.getElementById('planOut').textContent,
    'Писем в день: ' + num('emails'),
    'Расчётное высвобождение: ' +
      document.getElementById('hoursOut').textContent,
    'Потенциальная экономическая выгода в месяц: ' +
      document.getElementById('netOut').textContent,
    '',
    'Цены демонстрационные, условия требуют согласования.',
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([content], { type: 'text/plain;charset=utf-8' }),
  );
  a.download = 'BMA_preliminary_proposal.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function initConsultant() {
  document
    .querySelectorAll('[data-plan]')
    .forEach((el) =>
      el.addEventListener('click', () =>
        selectPlan(
          el.dataset.plan,
          el.dataset.amount === 'null' ? null : Number(el.dataset.amount),
        ),
      ),
    );
  document
    .querySelectorAll('[data-ask]')
    .forEach((el) => el.addEventListener('click', () => ask(el.dataset.ask)));
  document
    .querySelector('[data-form="chat"]')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      ask(input.value);
      input.value = '';
    });
  document
    .querySelector('[data-download-proposal]')
    .addEventListener('click', downloadProposal);
}
