import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { meResponseSchema } from '../src/index.ts';

describe('CSP stricte (docs/04)', () => {
  it('Zod ne sonde jamais `new Function` : la CSP interdit `eval`', () => {
    expect(meResponseSchema).toBeDefined();
    expect(z.config().jitless).toBe(true);
  });
});
