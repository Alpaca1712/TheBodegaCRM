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
    it('should not require a canned SMYKM opener', () => {
      const result = checkEmailQuality('Support agent trust', 'Hi John, Your support workflow handles urgent customer requests. Pigeon can help test the paths those customers reach. Best, Daniel Chalco CEO, Pigeon', 'initial');
      expect(result.issues.some(issue => issue.includes('SMYKM opener'))).toBe(false);
    });

    it('should flag em dashes', () => {
      const result = checkEmailQuality('Subject \u2014', 'Body \u2014 text.', 'initial');
      expect(result.issues).toContain('Contains em dashes. Use commas or periods.');
    });

    it('should flag banned phrases', () => {
      const result = checkEmailQuality('Subject', 'Hi Alex, I hope this finds you well. Best, Daniel Chalco CEO, Pigeon', 'initial');
      expect(result.issues).toContain('Contains banned phrase: "I hope this finds you well".');
    });

    it('should flag generic meeting asks that do not offer value', () => {
      const body = [
        'Hi Alex, your voice AI rollout for property managers caught my attention.',
        'Your voice AI rollout for property managers caught my attention because resident issues can arrive through chat, text, and email.',
        'Pigeon tests SaaS products through those same channels before attackers find the weak spots.',
        'Would love to find time to chat about how Pigeon can help.',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Voice AI security', body, 'initial');

      expect(result.issues).toContain('CTA asks for time without offering a concrete free deliverable.');
    });

    it('should pass CTAs that offer a specific free deliverable', () => {
      const body = [
        'Hi Alex, your voice AI rollout for property managers caught my attention.',
        'Your voice AI rollout for property managers caught my attention because resident issues can arrive through chat, text, and email.',
        'Pigeon tests SaaS products through those same channels before attackers find the weak spots.',
        'I put together a short walkthrough of the three ways voice agents can be tricked and how to fix each one. Want me to send it?',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Voice AI security', body, 'initial');

      expect(result.issues).not.toContain('CTA asks for time without offering a concrete free deliverable.');
    });

    it('should flag unsupported traction claims that risk hallucinating results', () => {
      const body = [
        'Hi Alex, your support agent caught my attention because customers reach it through chat and email.',
        'Your support agent caught my eye because customers can reach it through chat and email.',
        'Pigeon helped dozens of Fortune 500 teams reduce AI security incidents by 90% in two weeks.',
        'I put together a short walkthrough of risks for support agents. Want me to send it?',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Support agent risk', body, 'initial');

      expect(result.issues).toContain('Contains a traction claim that must be verified against lead or campaign context.');
    });

    it('should flag invented assessment findings that are not grounded in supplied context', () => {
      const body = [
        'Hi Alex, your support agent caught my attention because customers reach it through chat and email.',
        'Your support agent caught my eye because customers can reach it through chat and email.',
        'We just wrapped an assessment for a similar AI company and found 3 critical issues in their support agent.',
        'I put together a short breakdown of what we would test first in your agent. Want me to send it?',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Support agent risk', body, 'initial');

      expect(result.issues).toContain('Contains a specific security finding that must be verified against lead or campaign context.');
    });

    it('should flag specific findings even when a company is named so they are verified', () => {
      const body = [
        'Hi Alex, your resident support agent caught my attention.',
        'Your resident support agent caught my eye because customers can reach it through chat and email.',
        'In a named pilot, we took over a property management agent through its customer channels.',
        'I put together a short walkthrough of what we would test first in your agent. Want me to send it?',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Resident agent risk', body, 'initial');

      expect(result.issues).toContain('Contains a specific security finding that must be verified against lead or campaign context.');
    });

    it('should flag security jargon when the email is not explicitly allowed to mirror technical language', () => {
      const body = [
        'Hi Alex, your customer support agent can be reached through chat and email.',
        'Your customer support agent has a wide attack surface across chat and email.',
        'Pigeon tests prompt injection and data exfiltration paths before bad actors find them.',
        'I put together a short walkthrough of risks for support agents. Want me to send it?',
        'Best,',
        'Daniel Chalco',
        'CEO, Pigeon',
      ].join('\n')

      const result = checkEmailQuality('Support agent risk', body, 'initial');

      expect(result.issues).toContain('Uses avoidable security jargon: "attack surface". Use plain language unless the lead used it first.');
      expect(result.issues).toContain('Uses avoidable security jargon: "prompt injection". Use plain language unless the lead used it first.');
      expect(result.issues).toContain('Uses avoidable security jargon: "data exfiltration". Use plain language unless the lead used it first.');
    });

    it('should flag word count issues', () => {
      const result = checkEmailQuality('Subject', 'Hi Alex. Short. Best, Daniel Chalco CEO, Pigeon', 'initial');
      expect(result.issues.some(i => i.includes('Body is only'))).toBe(true);
    });

    it('should pass a perfect email', () => {
      const body = 'Hi John. Your cooking robot handles voice commands in a busy kitchen. Pigeon helps teams test what those controls can be tricked into doing. I have a report on robot security. Want me to send it? Best, Daniel Chalco CEO, Pigeon';
      // This is still short but let's see. 33 words.
      const result = checkEmailQuality('Robot hack', body, 'initial');
      // Should have word count issue but not others
      expect(result.issues).toEqual([`Body is only ${countWords(body)} words. Initial outreach target: 60-120.`]);
    });
  });

  describe('Follow-up Emails', () => {
    it('should not require a canned opener', () => {
      const result = checkEmailQuality('Subject', 'Hey John, just wanted to share this.', 'follow_up');
      expect(result.issues.some(issue => issue.includes('opener'))).toBe(false);
    });

    it('should flag banned phrases in follow-up', () => {
      const result = checkEmailQuality('Subject', 'Hey John, just checking in.', 'follow_up');
      expect(result.issues).toContain('Contains banned phrase: "just checking in".');
    });
  });
});
