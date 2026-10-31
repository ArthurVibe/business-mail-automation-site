// v4.8 economics: value of released working time, not guaranteed cash savings.
const inputIds = ['emails', 'minutes', 'hourly', 'share', 'monthly', 'setup'];
const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

function nonnegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

// Guard arithmetic overflow from manually entered extreme values without changing
// the prototype's formulas or rounding for normal inputs.
function finiteResult(value) {
  if (Number.isFinite(value)) return value;
  if (Number.isNaN(value)) return 0;
  return Math.sign(value) * Number.MAX_VALUE;
}

export function num(id) {
  return nonnegative(document.getElementById(id).value);
}

export function fmt(number) {
  return formatter.format(number);
}

export function calculateEconomics(values) {
  const data = Object.fromEntries(
    inputIds.map((id) => [id, nonnegative(values[id])]),
  );
  const share = Math.min(100, data.share);
  const hours =
    share === 0
      ? 0
      : finiteResult((((data.emails * data.minutes * 22) / 60) * share) / 100);
  const gross = data.hourly === 0 ? 0 : finiteResult(hours * data.hourly);
  const { monthly, setup } = data;
  const net = finiteResult(gross - monthly);
  const annual = finiteResult(12 * net - setup);
  const yearCost = finiteResult(monthly * 12 + setup);
  return { hours, gross, monthly, setup, net, annual, yearCost };
}

export function calculate() {
  const result = calculateEconomics(
    Object.fromEntries(inputIds.map((id) => [id, num(id)])),
  );
  const { hours, gross, monthly, setup, net, annual, yearCost } = result;
  const set = (id, value) => {
    document.getElementById(id).textContent = value;
  };
  set('hoursOut', fmt(hours) + ' ч');
  set('grossOut', '$' + fmt(gross));
  set('netOut', (net < 0 ? '−' : '') + '$' + fmt(Math.abs(net)));
  set('feeOut', '$' + fmt(monthly));
  set('setupOut', '$' + fmt(setup));
  set('sideFeeOut', '$' + fmt(monthly));
  set('sideSetupOut', '$' + fmt(setup));
  set('yearCostOut', '$' + fmt(yearCost));
  set(
    'annualOut',
    'Потенциал за первый год после подписки и внедрения: ' +
      (annual < 0 ? '−' : '') +
      '$' +
      fmt(Math.abs(annual)),
  );
  return result;
}

export function initCalculator() {
  document.querySelectorAll('#economy input').forEach((input) => {
    input.addEventListener('input', () => {
      calculate();
      document.dispatchEvent(new CustomEvent('calculator:change'));
    });
  });
  calculate();
}
