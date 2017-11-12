/**
 * @file: browser
 * @author: Cuttle Cong
 * @date: 2017/11/11
 * @description: 
 */
import React from 'picidae/exports/react';
import {utils} from 'picidae/exports/html-to-react';
const ID = 'transformer-react-doc'

function visit(root, vistor) {
    root && root.children && root.children.forEach(function (node, i, children) {
        vistor && vistor(node, i, root)
        visit(node, vistor)
    })
}



/**
 * [1, 2, 3] -> 1 | 2 | 3
 * [1, [3, 4], 3] -> 1 | [3, 4] | 3
 * @param data
 */
function stringify(data, space = 2) {
    if (Array.isArray(data)) {
        return data.map(v =>
            Array.isArray(v)
                ? '[' + stringify(v, null) + ']'
                : stringify(v, null)
        ).join(' | ').toString()
    }
    if (typeof data === 'string') {
        return data
    }

    return JSON.stringify(data, null, space)
}

function findParent(root, check) {
    var p = root
    while (p = p.parent) {
        if (check(p)) {
            return true
        }
    }

    return false
}

export class DetailView extends React.Component {
    state = {
        hide: true
    }

    onMouseEnter = evt => {
        this.setState({hide: false})
    }

    onMouseLeave = evt => {
        this.setState({hide: true})
    }

    render() {
        const {hide} = this.state
        const {children, content, style, popupStyle} = this.props
        return (
            <div
                className="react-doc-hide"
                style={{
                    position: 'relative'
                }}
                onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                <div
                    className="react-doc-hide-popover"
                    style={{
                        position: 'absolute', backgroundColor: '#fff',
                        zIndex: 1, padding: 10, border: '1px solid #e5e5e5',
                        bottom: 2, right: 3, ...popupStyle,
                        display: hide ? 'none' : ''
                    }}
                >{content}</div>
                <div
                    className="react-doc-hide-children"
                    style={{
                        color: '#3795e5',
                        ...style
                    }}
                >
                    {children}
                </div>
            </div>
        )
    }
}


module.exports = function (opt) {
    const style = opt.style || {}
    const popupStyle = opt.popupStyle || {}
    return function (data) {
        const {callbackCollect, unmountCallbackCollect} = this


        return [
            {
                replaceChildren: false,
                shouldProcessNode(node) {
                    return node.attribs
                        && node.attribs['data-hide-extra']
                        && findParent(node, p => p.attribs && p.attribs['class'] === ID)
                },
                processNode(node, children, index) {
                    const data = JSON.parse(node.attribs['data-hide-extra'])
                    const stringified = stringify(data)
                    if (data && stringified) {
                        children = (
                            <DetailView
                                key={index}
                                style={style}
                                popupStyle={popupStyle}
                                content={
                                    <code style={{whiteSpace: 'pre'}}>{stringified}</code>
                                }
                            >
                                {children}
                            </DetailView>
                        )
                    }
                    // return null; //React.createElement(node.name, {}, children)
                    return utils.createElement(node, index, node.data, children)
                }
            }
        ]
    }
}