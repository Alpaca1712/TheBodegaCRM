import { describe, it, expect } from 'vitest';
import { checkEmailQuality, countWords, normalizeGeneratedEmail } from './quality';

describe('Email Quality Check', () => {
  it('should count words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('  Extra   spaces  ')).toBe(2);
    expect(countWords('')).toBe(0);
  });

  it('should normalize generated email punctuation before scoring or sending', () => {
    expect(normalizeGeneratedEmail('Subject — hook')).toBe('Subject, hook');
    expect(normalizeGeneratedEmail('Line one – line two')).toBe('Line one, line two');
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

    it('should flag generic meeting asks that do not offer value', () => {
      const body = [
        "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto.",
        'Your voice AI rollout for property managers caught my attention because resident issues can arrive through chat, text, and email.',
        'Rocoto tries to break AI agents through those same channels before bad actors do.',
        'Would love to find time to chat about how Rocoto can help.',
        'Best,',
        'Daniel Chalco',
      ].join('\n')

      const result = checkEmailQuality('Voice AI security', body, 'initial');

      expect(result.issues).toContain('CTA asks for time without offering a concrete free deliverable.');
    });

    it('should pass CTAs that offer a specific free deliverable', () => {
      const body = [
        "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto.",
        'Your voice AI rollout for property managers caught my attention because resident issues can arrive through chat, text, and email.',
        'Rocoto tries to break AI agents through those same channels before bad actors do.',
        'I put together a short walkthrough of the three ways voice agents can be tricked and how to fix each one. Want me to send it?',
        'Best,',
        'Daniel Chalco',
      ].join('\n')

      const result = checkEmailQuality('Voice AI security', body, 'initial');

      expect(result.issues).not.toContain('CTA asks for time without offering a concrete free deliverable.');
    });

    it('should flag unsupported traction claims that risk hallucinating results', () => {
      const body = [
        "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto.",
        'Your support agent caught my eye because customers can reach it through chat and email.',
        'Rocoto helped dozens of Fortune 500 teams reduce AI security incidents by 90% in two weeks.',
        'I put together a short walkthrough of risks for support agents. Want me to send it?',
        'Best,',
        'Daniel Chalco',
      ].join('\n')

      const result = checkEmailQuality('Support agent risk', body, 'initial');

      expect(result.issues).toContain('Contains unsupported traction claim. Only the Mason pilot may be referenced as a real result.');
    });

    it('should flag security jargon when the email is not explicitly allowed to mirror technical language', () => {
      const body = [
        "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto.",
        'Your customer support agent has a wide attack surface across chat and email.',
        'Rocoto tests prompt injection and data exfiltration paths before bad actors find them.',
        'I put together a short walkthrough of risks for support agents. Want me to send it?',
        'Best,',
        'Daniel Chalco',
      ].join('\n')

      const result = checkEmailQuality('Support agent risk', body, 'initial');

      expect(result.issues).toContain('Uses avoidable security jargon: "attack surface". Use plain language unless the lead used it first.');
      expect(result.issues).toContain('Uses avoidable security jargon: "prompt injection". Use plain language unless the lead used it first.');
      expect(result.issues).toContain('Uses avoidable security jargon: "data exfiltration". Use plain language unless the lead used it first.');
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
