/* eslint-env jest */
import { addSpindleStartPrompt, isM3, replaceM6 } from '../gcode';

describe('isM3', () => {
  test('matches M3 command variants', () => {
    expect(isM3('M3')).toBe(true);
    expect(isM3('M03')).toBe(true);
    expect(isM3('m003')).toBe(true);
  });

  test('does not match other M-codes', () => {
    expect(isM3('M30')).toBe(false);
    expect(isM3('M13')).toBe(false);
    expect(isM3('M4')).toBe(false);
  });
});

describe('addSpindleStartPrompt', () => {
  test('adds a prompt and pause before M3 commands', () => {
    const gcode = [
      'G0 X0',
      'M3 S1000',
      'G1 X10',
    ].join('\n');

    expect(addSpindleStartPrompt(gcode)).toBe([
      'G0 X0',
      '%msg Turn On Spindle',
      'M0',
      'M3 S1000',
      'G1 X10',
    ].join('\n'));
  });

  test('detects M03 with inline comments', () => {
    expect(addSpindleStartPrompt('M03 S800 ; spindle cw')).toBe([
      '%msg Turn On Spindle',
      'M0',
      'M03 S800 ; spindle cw',
    ].join('\n'));
  });

  test('leaves non-M3 commands unchanged', () => {
    expect(addSpindleStartPrompt('M30\nM4 S1000')).toBe('M30\nM4 S1000');
  });
});

describe('replaceM6Commands', () => {
  test('replaces M6 commands with parentheses', () => {
    const gcode = `
      m6
      m06
      m006
      M6
      M06
      M006
      M60
      M060
      M6T1
      M6 T1
      M6 T1 ; comment
      M6T1(tool change)
      T1M6
      T1 M6
      T1M6T2
      M61Q1
      M61Q1T2M6
      M61Q1M6T2
      MM66
    `;

    const expectedOutput = `
      (m6)
      (m06)
      (m006)
      (M6)
      (M06)
      (M006)
      M60
      M060
      (M6)T1
      (M6) T1
      (M6) T1 ; comment
      (M6)T1(tool change)
      T1(M6)
      T1 (M6)
      T1(M6)T2
      M61Q1
      M61Q1T2(M6)
      M61Q1(M6)T2
      MM66
    `;

    const result = replaceM6(gcode, (x) => `(${x})`);
    expect(result).toEqual(expectedOutput);
  });
});
