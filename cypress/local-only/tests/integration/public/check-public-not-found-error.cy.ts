describe('Public user verifies not found error pages are displayed', function () {
  describe('case detail', () => {
    it('should display the not found error page when routing to a case that does not exist', () => {
      cy.visit('/case-detail/999-999999999');

      cy.get('div.big-blue-header h1').should('contain', 'Error 404');
      cy.get('a#home').should('exist');
      cy.get('a#home').click();
      cy.get('div.big-blue-header h1').should('not.contain', 'Error 404');
    });
  });

  describe('random unroutable URL', () => {
    it('should display the not found error page when routing to a random URL that cannot be otherwise fulfilled by the router', () => {
      cy.visit('/this/definitely-does-not/exist');

      cy.get('div.big-blue-header h1').should('contain', 'Error 404');
      cy.get('a#home').should('exist');
      cy.get('a#home').click();
      cy.get('div.big-blue-header h1').should('not.contain', 'Error 404');
    });
  });
});
