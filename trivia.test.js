'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { parseTriviaBank, drawRound } = require('./trivia.js');

function question(id, picture) {
  return [
    `### ${id} — Which is correct?`,
    '**Topic:** Test',
    picture ? '**Image:** ![An aircraft in flight](./assets/quiz-images/example.webp)' : '',
    picture ? '**Image credit:** [Photo credit](https://example.org/photo)' : '',
    picture ? '**Image license:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)' : '',
    '- A. First',
    '- B. Second',
    '- C. Third',
    '- D. Fourth',
    '**Correct answer:** A',
    '- **A · Correct:** First is correct.',
    '- **B · Incorrect:** Second is not correct.',
    '- **C · Incorrect:** Third is not correct.',
    '- **D · Incorrect:** Fourth is not correct.',
    '**Source:** [Source](https://example.org/source)'
  ].join('\n');
}

test('parses old and new IDs and retains picture metadata', () => {
  const parsed = parseTriviaBank(`## Easy\n${question('WWII-E01', false)}\n${question('WWII-N001', true)}`);
  assert.deepEqual(parsed.map(item => item.id), ['WWII-E01', 'WWII-N001']);
  assert.equal(parsed[1].imagePath, './assets/quiz-images/example.webp');
  assert.equal(parsed[1].imageAlt, 'An aircraft in flight');
  assert.equal(parsed[1].imageCreditUrl, 'https://example.org/photo');
  assert.equal(parsed[1].imageLicenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(parsed[1].choices.filter(choice => choice.correct).length, 1);
});

test('parses multiple research sources for one question', () => {
  const markdown = question('WWII-N001').replace(
    '**Source:** [Source](https://example.org/source)',
    '**Source:** [First](https://example.org/first), [Second](https://example.org/second) and [Third](https://example.org/third)'
  );
  const parsed = parseTriviaBank(markdown)[0];
  assert.equal(parsed.sources.length, 3);
  assert.equal(parsed.sourceUrl, 'https://example.org/first');
});

test('rejects duplicate IDs, malformed image metadata and incorrect explanations', () => {
  assert.throws(() => parseTriviaBank(`${question('WWII-001')}\n${question('WWII-001')}`), /Duplicate question/);
  assert.throws(() => parseTriviaBank(question('WWII-001', true).replace(/\*\*Image credit:\*\*[^\n]*\n/, '')), /Incomplete picture/);
  assert.throws(() => parseTriviaBank(question('WWII-001').replace('B · Incorrect', 'B · Correct')), /Explanation mismatch/);
  assert.throws(() => parseTriviaBank(question('WWII-001').replace('- D. Fourth', '- B. Fourth')), /Invalid choices/);
  assert.throws(() => parseTriviaBank(question('WWII-001', true).replace('./assets/quiz-images/example.webp', 'https://example.org/image.webp')), /Invalid image/);
  assert.throws(() => parseTriviaBank(question('WWII-001', true).replace('[CC BY 4.0]', 'CC BY 4.0')), /Invalid image license/);
});

test('each shuffled round contains ten unique questions and exactly four pictures', () => {
  const bank = parseTriviaBank('## Easy\n' + Array.from({ length: 20 }, (_, i) =>
    question(`WWII-N${String(i + 1).padStart(3, '0')}`, i < 5)).join('\n'));
  for (let i = 0; i < 100; i++) {
    const round = drawRound(bank);
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map(item => item.id)).size, 10);
    assert.equal(round.filter(item => item.imagePath).length, 4);
  }
  assert.throws(() => drawRound(bank.filter(item => !item.imagePath)), /Not enough questions/);
  assert.throws(() => drawRound(bank.map((item, i) => i < 15 ? { ...item, imagePath: 'example.webp' } : item)), /Not enough questions/);
});

test('the shipped bank has the requested mix and usable picture assets', () => {
  const bank = parseTriviaBank(readFileSync(join(__dirname, 'WWII-TRIVIA-BANK.md'), 'utf8'));
  const added = bank.filter(item => /^WWII-N\d+$/.test(item.id));
  const retained = bank.filter(item => !/^WWII-N\d+$/.test(item.id));
  const newEquipment = added.filter(item => /^Equipment\b/i.test(item.topic));
  const navalEquipmentIds = new Set(['WWII-E12', 'WWII-E15', 'WWII-033', 'WWII-034', 'WWII-035', 'WWII-036', 'WWII-055']);
  const oldEquipment = retained.filter(item =>
    /^(Aircraft and vehicles|Warships)$/i.test(item.topic) || navalEquipmentIds.has(item.id));
  const pictures = bank.filter(item => item.imagePath);
  assert.equal(bank.length, 259);
  assert.equal(added.length, 184);
  assert.equal(retained.length, 75);
  assert.equal(newEquipment.length, 97);
  assert.ok(oldEquipment.length >= 38);
  for (const [kind, count] of Object.entries({ aircraft: 14, tank: 14, gun: 11, mine: 11, vehicle: 3 })) {
    const category = pictures.filter(item => new RegExp(`/` + kind + `-\\d+\\.webp$`).test(item.imagePath));
    assert.equal(category.length, count, kind);
    assert.equal(new Set(category.map(item => item.imagePath)).size, count, kind);
  }
  assert.equal(pictures.length, 53);
  for (const item of bank) {
    assert.equal(new Set(item.choices.map(choice => choice.text.toLowerCase())).size, 4, item.id);
    if (item.imagePath) {
      assert.ok(existsSync(join(__dirname, item.imagePath)), item.id);
      assert.ok(!item.imageAlt.toLowerCase().includes(item.choices.find(choice => choice.correct).text.toLowerCase()), item.id);
      const license = item.imageCreditTitle.match(/CC (BY(?:-SA)?) ([\d.]+)/i);
      if (license) {
        assert.equal(item.imageLicenseUrl, `https://creativecommons.org/licenses/${license[1].toLowerCase()}/${license[2]}/`, item.id);
      }
    }
  }
});
