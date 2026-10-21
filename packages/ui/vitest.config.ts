import { baseConfig } from '@rougarou/config/vitest';

export default baseConfig({
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
