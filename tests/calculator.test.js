import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEconomics, fmt } from '../src/scripts/calculator.js';

// Values and expected results are recorded from the supplied v4.8 prototype.
const defaults = {
  emails: 100,
  minutes: 6,
  hourly: 15,
  share: 60,
  monthly: 399,
  setup: 900,
};

test('v4.8 default economics and Russian integer formatting', () => {
  assert.deepEqual(calculateEconomics(defaults), {
    hours: 132,
    gross: 1980,
    monthly: 399,
    setup: 900,
    net: 1581,
    annual: 18072,
    yearCost: 5688,
  });
  assert.equal(fmt(1980), '1\u00a0980');
  assert.equal(fmt(132.4), '132');
});

test('each input changes only its original formula contribution', () => {
  const cases = [
    ['emails', 50, { hours: 66, gross: 990, net: 591, annual: 6192 }],
    ['minutes', 3, { hours: 66, gross: 990, net: 591, annual: 6192 }],
    ['hourly', 10, { hours: 132, gross: 1320, net: 921, annual: 10152 }],
    ['share', 30, { hours: 66, gross: 990, net: 591, annual: 6192 }],
    ['monthly', 149, { hours: 132, gross: 1980, net: 1831, annual: 21072 }],
    ['setup', 0, { hours: 132, gross: 1980, net: 1581, annual: 18972 }],
  ];
  for (const [id, value, expected] of cases) {
    const actual = calculateEconomics({ ...defaults, [id]: value });
    for (const [key, expectedValue] of Object.entries(expected)) {
      assert.equal(actual[key], expectedValue, `${id} → ${key}`);
    }
  }
});

test('zero and negative values preserve the nonnegative input rule', () => {
  const zero = calculateEconomics({
    emails: 0,
    minutes: 0,
    hourly: 0,
    share: 0,
    monthly: 0,
    setup: 0,
  });
  assert.equal(
    Object.values(zero).every((value) => value === 0),
    true,
  );
  assert.deepEqual(
    calculateEconomics({ ...defaults, emails: -10 }),
    calculateEconomics({ ...defaults, emails: 0 }),
  );
  assert.equal(calculateEconomics({ ...defaults, emails: 0 }).net, -399);
  assert.equal(calculateEconomics({ ...defaults, share: 0 }).annual, -5688);
  assert.equal(calculateEconomics({ ...defaults, monthly: -1 }).net, 1980);
});

test('share caps at 100%, decimal values retain precision until display', () => {
  assert.deepEqual(
    calculateEconomics({ ...defaults, share: 150 }),
    calculateEconomics({ ...defaults, share: 100 }),
  );
  assert.equal(calculateEconomics({ ...defaults, share: 100 }).hours, 220);
  const decimal = calculateEconomics({ ...defaults, emails: 1, minutes: 1 });
  assert.equal(decimal.hours, 0.22);
  assert.equal(fmt(decimal.hours), '0');
});

test('blank and invalid values behave as zero; extremes cannot output NaN/Infinity', () => {
  for (const value of ['', 'invalid', NaN, Infinity, -Infinity, undefined]) {
    const result = calculateEconomics({ ...defaults, emails: value });
    assert.equal(result.hours, 0);
    assert.equal(result.net, -399);
  }
  for (const share of [0, 60, 100]) {
    const result = calculateEconomics({
      emails: Number.MAX_VALUE,
      minutes: Number.MAX_VALUE,
      hourly: Number.MAX_VALUE,
      share,
      monthly: Number.MAX_VALUE,
      setup: Number.MAX_VALUE,
    });
    assert.equal(Object.values(result).every(Number.isFinite), true);
    assert.equal(
      /NaN|Infinity|∞/.test(Object.values(result).map(fmt).join()),
      false,
    );
  }
});
