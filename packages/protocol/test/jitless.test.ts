import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import '../src/index.ts';

describe('CSP stricte (docs/04)', () => {
  it('Zod ne sonde jamais `new Function` : la CSP interdit `eval`', () => {
    expect(z.config().jitless).toBe(true);
  });
});
