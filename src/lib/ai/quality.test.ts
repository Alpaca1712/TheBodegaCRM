import { describe, it, expect } from 'vitest';
import { checkEmailQuality, countWords } from './quality';

describe('Email Quality Check', () => {
  it('should count words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('  Extra   spaces  ')).toBe(2);
    expect(countWords('')).toBe(0);
  });

  describe('Initial Emails', () => {
    it('should flag missing SMYKM opener', () => {
      const result = checkEmailQuality('Subject', 'Body text.', 'initial');
      expect(result.issues).toContain('Missing the required SMYKM opener: "We\'ve yet to be properly introduced".');
      expect(result.score).toBeLessThan(100);
    });

    it('should flag em dashes', () => {
      const result = checkEmailQuality('Subject \u2014', 'Body \u2014 text.', 'initial');
      expect(result.issues).toContain('Contains em dashes. McKenna rules say use commas or periods.');
    });

    it('should flag banned phrases', () => {
      const result = checkEmailQuality('Subject', 'We\'ve yet to be properly introduced. I hope this finds you well.', 'initial');
      expect(result.issues).toContain('Contains banned phrase: "I hope this finds you well".');
    });

    it('should flag word count issues', () => {
      const result = checkEmailQuality('Subject', 'We\'ve yet to be properly introduced. Short.', 'initial');
      expect(result.issues.some(i => i.includes('Body is only'))).toBe(true);
    });

    it('should pass a perfect email', () => {
      const body = "We've yet to be properly introduced. I noticed you built a robot that cooks. That is incredible. Rocoto helps you secure robots. I have a report on robot vulnerabilities. Want me to send it? Best, Daniel Chalco";
      // This is still short but let's see. 33 words.
      const result = checkEmailQuality('Robot hack', body, 'initial');
      // Should have word count issue but not others
      expect(result.issues).toEqual([`Body is only ${countWords(body)} words. SMYKM target: 80-150.`]);
    });
  });

  describe('Follow-up Emails', () => {
    it('should not require SMYKM opener', () => {
      const result = checkEmailQuality('Subject', 'Hey John, just wanted to share this.', 'follow_up');
      expect(result.issues).not.toContain('Missing the required SMYKM opener: "We\'ve yet to be properly introduced".');
    });

    it('should flag banned phrases in follow-up', () => {
      const result = checkEmailQuality('Subject', 'Hey John, just checking in.', 'follow_up');
      expect(result.issues).toContain('Contains banned phrase: "just checking in".');
    });
  });
});
