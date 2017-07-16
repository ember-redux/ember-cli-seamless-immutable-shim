import { test, module } from 'qunit';
import Immutable from 'seamless-immutable';

module('seamless-immutable export tests');

test('exports function', function(assert) {
  assert.equal(typeof Immutable, 'function');
});
