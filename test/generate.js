var assert = require('assert');
var parse = require('../lib').parse;
var generate = require('../lib').generate;
var toPlainObject = require('../lib').toPlainObject;
var forEachParseTest = require('./fixture/parse').forEachTest;
var stringify = require('./helpers/stringify');
var merge = require('./helpers').merge;

function createGenerateTests(name, test) {
    (test.skip ? it.skip : it)(name, function() {
        var ast = parse(test.source, test.options);
        var restoredCss = generate(ast);

        // strings should be equal
        assert.equal(restoredCss, 'generate' in test ? test.generate : test.source);
    });

    (test.skip ? it.skip : it)(name + ' (plain object)', function() {
        var ast = parse(test.source, test.options);

        // strings should be equal
        assert.equal(generate(toPlainObject(ast)), 'generate' in test ? test.generate : test.source);
    });

    // FIXME: Skip some test cases for round-trip check until generator's improvements
    var skipRoundTrip = test.skip || /block at-rule #c\.2|atruler\.c\.2|parentheses\.c\.3/.test(name);
    (skipRoundTrip ? it.skip : it)(name + ' (round-trip)', function() {
        var ast = parse(test.source, test.options);
        var restoredCss = generate(ast);

        // https://drafts.csswg.org/css-syntax/#serialization
        // The only requirement for serialization is that it must "round-trip" with parsing,
        // that is, parsing the stylesheet must produce the same data structures as parsing,
        // serializing, and parsing again, except for consecutive <whitespace-token>s,
        // which may be collapsed into a single token.
        assert.equal(
            stringify(parse(restoredCss, test.options)),
            stringify(ast)
        );
    });
}

function createGenerateWithSourceMapTest(name, test) {
    (test.skip ? it.skip : it)(name, function() {
        var ast = parse(test.source, merge(test.options, {
            positions: true
        }));

        // strings should be equal
        assert.equal(generate(ast, { sourceMap: true }).css, 'generate' in test ? test.generate : test.source);
    });
}

describe('generate', function() {
    forEachParseTest(createGenerateTests);

    it('should throws on unknown node type', function() {
        assert.throws(function() {
            generate({
                type: 'xxx'
            });
        }, /Unknown node type/);
    });

    describe('sourceMap', function() {
        forEachParseTest(createGenerateWithSourceMapTest);

        it('should generate a map', function() {
            var ast = parse('.a {\n  color: red;\n}\n', {
                filename: 'test.css',
                positions: true
            });
            var result = generate(ast, { sourceMap: true });

            assert.equal(result.css, '.a{color:red}');
            assert.equal(result.map.toString(), '{"version":3,"sources":["test.css"],"names":[],"mappings":"AAAA,E,CACE,S"}');
        });

        it('complex CSS', function() {
            var ast = parse('.a { color: #ff0000; } .b { display: block; float: left; } @media foo { .c { color: red } }', {
                filename: 'test.css',
                positions: true
            });
            var result = generate(ast, { sourceMap: true });

            assert.equal(result.css, '.a{color:#ff0000}.b{display:block;float:left}@media foo{.c{color:red}}');
            assert.equal(result.map.toString(), '{"version":3,"sources":["test.css"],"names":[],"mappings":"AAAA,E,CAAK,a,CAAkB,E,CAAK,a,CAAgB,U,CAAe,WAAa,E,CAAK,W"}');
        });
    });
});
