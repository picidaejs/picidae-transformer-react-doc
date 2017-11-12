

function tableRow(children, data) {
    return {
        type: 'tableRow',
        children: children,
        data: data
    }
}
function tHead(children) {
    return [
        {
            type: 'html',
            value: '<thead>'
        }
    ].concat(children)
    .concat({
        type: 'html',
        value: '</thead>'
    })
}
function tr(children, className) {
    return [
        {
            type: 'html',
            value: '<tr>'
        }
    ].concat(children)
        .concat({
            type: 'html',
            value: '</tr>'
        })
}
function td(children, className) {
    return [
        {
            type: 'html',
            value: '<td class="' + (className || '') + '">'
        }
    ].concat(children)
        .concat({
            type: 'html',
            value: '</td>'
        })
}
function tBody(children) {
    return [
        {
            type: 'html',
            value: '<tbody>'
        }
    ].concat(children)
        .concat({
            type: 'html',
            value: '</tbody>'
        })
}

function table(children) {
    return [
        {
            type: 'html',
            value: '<table class="transformer-react-doc">'
        }
    ].concat(children)
    .concat({
        type: 'html',
        value: '</table>'
    })
}

module.exports = function (data) {
    data = data || {}
    var head = data.head || []
    var body = data.body || []

    function mapTd(node) {
        var className = node.className
        return td(node.node, node.className)
    }

    return table(
        [
            tHead([
                tr(head.map(mapTd))
            ]),
            tBody(
                body.map(function (row) {
                    return tr(
                        row.map(function (cell) {
                            return cell.map(mapTd)
                        })
                    )
                })
            )
        ]
    )
}