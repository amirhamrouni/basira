import { describe, expect, it } from 'vitest';
import TarotView from './TarotView';
import PalmistryView from './PalmistryView';
import CoffeeView from './CoffeeView';
import FaceView from './FaceView';
import DivinationView from './DivinationView';

describe('reading views smoke imports', () => {
  it('exports all primary reading views', () => {
    expect(typeof TarotView).toBe('function');
    expect(typeof PalmistryView).toBe('function');
    expect(typeof CoffeeView).toBe('function');
    expect(typeof FaceView).toBe('function');
    expect(typeof DivinationView).toBe('function');
  });
});
