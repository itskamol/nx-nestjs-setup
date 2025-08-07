describe('Smoke Test', () => {
  it('should load the home page', () => {
    cy.visit('/');
    cy.contains('Welcome');
  });
});
