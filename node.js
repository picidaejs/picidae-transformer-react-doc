/**
 * @file: node
 * @author: Cuttle Cong
 * @date: 2017/11/11
 */
var reactDocs = require('./vender/react-docgen/dist/main')
var visit = require('picidae/exports/unist-util-visit')
var remark = require('picidae/exports/remark')
var generate = require('picidae/lib/lib/loaders/markdown-loader/generate')
var nunjucks = require('picidae/exports/nunjucks')
var toString = require('mdast-util-to-string')

var _ = require('./lib/react-doc-utils')
var nps = require('path')
var fs = require('fs')

var compiler = nunjucks.compile(
    fs.readFileSync(nps.join(__dirname, 'lib/Table/table.html'), {encoding: 'utf8'})
)

var suffixList = ['-prop', '-description', '-type', '-default-value']

function generateProm(md, info) {
    return new Promise(function (resolve) {
        if (!md) resolve()
        generate(md, info, function (err, meta, data) {
            resolve(data.content)
        })
    })
}

function parse(text) {
    var node = remark.parse(text)
    return node.children && node.children[0] && node.children[0].children || []
}

function mayNull(str, prefix, suffix) {
    prefix = prefix || ''
    suffix = suffix || prefix
    if (!str) return prefix + '-' + suffix
    return prefix + str + suffix
}

const style = [
    'td.td-transformer-react-doc-description > p {',
    '    white-space: pre;',
    '}',
    'td.td-transformer-react-doc-description > pre > code {',
    '    background-color: transparent;',
    '}'
].join('\n')

var id = 'transformer-react-doc'

exports.remarkTransformer = function (opts) {
    var lang = opts.lang || 'react-doc'
    var i18n = opts.i18n || 'zh-CN'
    var descModel = opts.descModel || 'md'; // 'md' | 'pre'
    // var align = opts.align || [null, null, null, null]
    var disableDefaultStyle = opts.disableDefaultStyle || false

    var inject = this.picidae().inject

    if (typeof i18n === 'string') {
        i18n = require('./lib/i18n/' + i18n)
    }

    var head = [
        {class: 'th-' + id + suffixList[0], text: i18n['header.name']},
        {class: 'th-' + id + suffixList[1], text: i18n['header.desc']},
        {class: 'th-' + id + suffixList[2], text: i18n['header.type']},
        {class: 'th-' + id + suffixList[3], text: i18n['header.default']},
    ]

    return function (node) {
        var i = 0
        var prom = [Promise.resolve()]

        visit(node, 'code', function (node, index, parent) {
            if (node.lang !== lang) return

            var code = toString(node)
            var docAst;
            try {
                docAst = reactDocs.parse(code)
            } catch (ex) {
                console.error('React Code Error Happened: \n', ex);
                return
            }
            if (!docAst) return
            var list = [];
            var innerProm = [Promise.resolve()]
            _.visitProps(docAst, function (value, propName, props) {
                var desc = value.description || ''
                desc = descModel === 'code' && desc && desc.trim()
                    ? '\n~~~~~javascript\n' + desc + '\n~~~~~\n'
                    : desc
                innerProm.push(
                    generateProm(desc, {})
                        .then(function (desc) {
                            list.push([{
                                class: 'td-' + id + suffixList[0],
                                text: mayNull((value.require ? '<i class="required">*</i>' : '') + propName, '<code>', '</code>')
                            }, {
                                class: 'td-' + id + suffixList[1],
                                text: mayNull(desc)
                            }, {
                                class: 'td-' + id + suffixList[2],
                                text: mayNull(_.capitalize(_.mapTypeName(value.type && value.type.name)), '<code>', '</code>'),
                                data: JSON.stringify(_.mapType(value.type, true))
                            }, {
                                class: 'td-' + id + suffixList[3],
                                text: mayNull(value.defaultValue && value.defaultValue.value, '<code>', '</code>')
                            }])
                        })
                )
            });

            node.type = 'html'
            delete node.lang

            prom.push(
                Promise.all(innerProm)
                    .then(function () {
                        node.value = compiler.render({
                            body: list,
                            head: head
                        })
                    })
            )
        });

        return Promise.all(prom)
            .then(function (list) {
                if (list.length > 1 && !disableDefaultStyle) {
                    node.children.splice(0, 0, {
                        type: 'html',
                        value: '<style type="text/css">' + style + '</style>'
                    })
                }
                return node
            })
    }
};