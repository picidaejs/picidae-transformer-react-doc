/**
 * @file: react-docgen
 * @author: Cuttle Cong
 * @date: 2017/11/11
 * @description: 
 */


var reactDocs = require('../vender/react-docgen')
var handlers = reactDocs.handlers
var resolver = reactDocs.resolver
var fs = require('fs')
var _ = require('../lib/react-doc-utils')

// var ast = babylon.parse(
//     fs.readFileSync(__dirname + '/fixture/Button.js', {encoding: 'utf8'}),
// ).ast



var componentInfo = reactDocs.parse(
    fs.readFileSync(__dirname + '/fixture/Button.js', {encoding: 'utf8'}),
);

console.log(JSON.stringify(componentInfo, null, 2))


// _.visitProps(componentInfo, 'icon', function (a, b, c) {
//     console.log(c)
// })