/**
 * Sanity test — verifies the test framework is correctly configured.
 */
describe('Test Framework', () => {
  test('jest is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('TypeScript types work', () => {
    const msg: string = 'hello';
    expect(msg.length).toBe(5);
  });
});
