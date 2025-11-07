import { APP_NAME, APP_VERSION } from '@/constants/config';

describe('Config Constants', () => {
  it('should have valid app name', () => {
    expect(APP_NAME).toBe('Semantic Bookmark Search');
    expect(APP_NAME).toBeTruthy();
  });

  it('should have valid app version', () => {
    expect(APP_VERSION).toBe('0.1.0');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
