import { test, module } from 'qunit';
import Immutable from 'seamless-immutable';

module('reselect-map export tests');

test('exports function', function(assert) {
  assert.equal(typeof Immutable, 'object');
});
