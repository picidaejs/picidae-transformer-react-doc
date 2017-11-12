/**
 * @file: react-doc-utils
 * @author: Cuttle Cong
 * @date: 2017/11/11
 * @description: 
 */  

var each = function (source, callback) {
    if (Array.isArray(source)) {
        source.forEach(function (item, i, all) {
            callback && callback(item, i, all)
        })
    } else {
        Object.keys(source)
            .forEach(function (key) {
                callback && callback(source[key], key, source)
            })
    }
};

var _ = module.exports = {}

var visitMethods = _.visitMethods = function (docNode, name, callback) {
    if (typeof name !== 'string') {
        callback = name
    } else {
        callback = (function (callback) {
            return function (value, index) {
                if (value.name === name) {
                    callback && callback.apply(null, arguments)
                }
            }
        }(callback))
    }

    each(docNode.methods, callback)
}

var visitProps = _.visitProps = function (docNode, name, callback) {
    if (typeof name !== 'string') {
        callback = name
    } else {
        callback = (function (callback) {
            return function (value, key) {
                if (key === name) {
                    callback && callback.apply(null, arguments)
                }
            }
        }(callback))
    }

    each(docNode.props, callback)
}

var mapTypeName = _.mapTypeName = function (typeName) {
    return {
        'node': 'ReactElement',
        'bool': 'boolean',
        'func': 'function'
    }[typeName] || typeName
}

function valueToData(value, type) {
    if (!value) return
    if (Array.isArray(value)) {
        return value.map(function (v) {
            return mapType(v)
        })
    }

    if (typeof value === 'object') {
        var setter = {}
        Object.keys(value).forEach(function (prop) {
            setter[prop] = mapType(value[prop])
            // value[prop].required
        })
        return setter
    }
    return value
}

var capitalize = _.capitalize = function capitalize(name) {
    name = name || ''
    return name.slice(0, 1).toUpperCase() + name.slice(1)
}

var mapType = _.mapType = function (type, ignoreSelf) {
    if (!type) return
    ignoreSelf = ignoreSelf || false
    var value = type.value
    var name = type.name

    type.name = capitalize(mapTypeName(type.name))
    if (!value) {
        if (name === 'custom') {
            return type.raw
        } else {
            return !ignoreSelf && type.name
        }
    }

    return valueToData(value)
}