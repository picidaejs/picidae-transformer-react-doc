/**
 * @file Popup 组件
 * @author wujun07
 * @owner wujun07:2017-07-04
 * @description 主要借鉴 https://github.com/react-component/trigger
 * Popup分为两层
 * PopupTrigger 作为一个 High-Order Component 主要处理与Popup的挂载、显隐行为相关的事情
 * PopupWrap 主要处理Popup样式修饰相关的东西
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactDOM, { findDOMNode } from 'react-dom'
import {PropTypes as MobxPropTypes} from 'mobx-react'
import {noop, noopPromise, addEventListener, contains, isCallable} from '../../common/utils'
import {h, c} from '@befe/utils/wrapper/erp'
import PopupWrap, {PLACEMENTS}  from './Wrap'

export {PLACEMENTS} from  './Wrap'
export {baseAlignment} from './Wrap/align'
export const ACTIONS = ['click', 'hover', 'focus']
export const SHOW_ACTIONS = ['click', 'mouseEnter', 'focus']
export const HIDE_ACTIONS = ['click', 'mouseLeave', 'blur']

const ALL_HANDLERS = [
    'onClick',
    'onMouseDown',
    'onMouseEnter', 'onMouseLeave',
    'onFocus', 'onBlur',
    'onDocumentClick',
    'onPopupMouseEnter', 'onPopupMouseLeave'
]

import compStyle from './style.use.less'
export default class PopupTrigger extends Component {
    static propTypes = {
        classPrefix: PropTypes.string,
        className: PropTypes.string,
        style: PropTypes.object,
        children: PropTypes.any,

        /*
         * popup的内容，任何可render的node
         * required
         * */
        content: PropTypes.oneOfType([
            PropTypes.node,
            PropTypes.func,
        ]),

        visible: PropTypes.bool,
        defaultVisible: PropTypes.bool,

        /*
         * popup相对于target的位置
         * 'top', 'left', 'right', 'bottom'  // 上下左右中心对齐
         * 'top-left' | 'top-right'          // 位于target的上面，对齐左/右边线
         * 'bottom-left' | 'bottom-right'    // 位于target的下面，对齐左/右边线
         * 'left-top' | 'left-bottom'        // 位于target的左边，对齐上/下边线
         * 'right-top' | 'right-bottom'      // 位于target的右边，对齐上/下边线
         * */
        placement: PropTypes.oneOf(PLACEMENTS),

        /*
         * 对齐参数,
         * 进行对齐时会将props.placement转成相应的默认alignment, 而该参数将覆盖默认的alignment
         *
         * ！！慎用！！
         *
         * 在 hover 触发且存在子popup的情况，父子popup元素之间不能存在间隙，否则鼠标从父移到子中，会触发 mouseLeave 关闭父popup。
         * delay mouseLeave 所触发的关闭并不能解决问题，因为没等子popup的 mouseEnter 触发clearTimer，父popup就被关掉了。
         * 实验发现，即使 mouseLeaveDelayInSec 设到0.8秒，仍是大概率会关闭父popup
         *
         * 所以应该让popup总是和其target的间隙 <= 0，在此基础上利用 `.${classPrefix}-popup-wrap` 的padding来制造偏移
         * 只延target边线的偏移倒是可以使用，或许我们应该提供单一的 props.offset 来控制偏移只能延target的边线进行
         *
         * alignment: {}
         *   points: ['cr', 'cl']    // popup 和 target 对齐的边线
         *                           // points[0] 为 popup, points[1] 为 target
         *                           // popup/target分别由两个字符代表边边线
         *                           // 第一个字符为水平线(t,c,b)，第二个字符为竖直线(lcr)
         *                           // points['cr', 'cl'] 亦即 props.placement = 'left'， 表示
         *                           // - popup 竖直方向上的中线 与 target 竖直方向上中线进行对齐（竖直方向上的线为水平线）
         *                           // - popup 的右边线与target的左边线对齐
         *
         *   offset: [0, -4] | [0, '30%']    // 对齐后 popup 相对于 target 的偏移量
         *                                   // offset[0] 横向, offset[1] 竖向
         *                                   // 支持百分比 '30%' 指的是 popup 宽/高百分比
         *
         *   targetOffset: [0, 0]            // 对齐后 target 相对于 popup 的偏移量
         *
         *   overflow: {                     // 当可视区域放不下时，是否自动调整位置
         *       adjustX: 1,                 // 水平向
         *       adjustY: 1                  // 垂直方向
         *   }
         * */
        alignment: PropTypes.object,

        /*
         * 显/隐的触发方式
         * 'click' | 'hover' | 'focus'
         * default: ''
         * 设为 '' 将没有触发行为，可以用来关闭popup功能
         * 多action的场景没想到实际的，action之间会有冲突，暂不支持
         * */
        action: PropTypes.oneOf([...ACTIONS, '']),
        // action: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),

        /*
         * 指定触发显示的动作 'click' | 'mouseEnter' |'focus'
         * show/hide action 不一致的场景是否合理？谨慎使用，可能有坑未验证
         * */
        showAction: PropTypes.oneOfType([
            PropTypes.oneOf([...SHOW_ACTIONS, '']),
            MobxPropTypes.arrayOrObservableArray
        ]),

        /*
         * 触发隐藏的动作 'click' | 'mouseLeave' |'blur'
         * show/hide action 不一致的场景是否合理？谨慎使用，可能有坑未验证
         * */
        hideAction: PropTypes.oneOfType([
            PropTypes.oneOf([...HIDE_ACTIONS, '']),
            MobxPropTypes.arrayOrObservableArray
        ]),

        /*
         * 是否在隐藏时把内容节点干掉
         * default: false
         * */
        destroyPopupOnHide: PropTypes.bool,

        /*
         * 延迟触发，单位：秒
         * default:
         * mouseEnterDelayInSec: 0
         * mouseLeaveDelayInSec: 0.1
         * focusDelayInSec: 0
         * blurDelayInSec: 0.15
         * */
        mouseEnterDelayInSec: PropTypes.number,
        mouseLeaveDelayInSec: PropTypes.number,
        focusDelayInSec: PropTypes.number,
        blurDelayInSec: PropTypes.number,

        /*
         * 弹层默认按顺序mount到body，可通过zIndex强制叠放顺序
         * */
        zIndex: PropTypes.number,

        /*
         * 内容背后是否添加一个蒙层
         * default: false
         * */
        hasMask: PropTypes.bool,

        /*
         * 是否可以通过点击蒙层关闭
         * default: true
         * */
        maskClosable: PropTypes.bool,

        /*
         * document节点获取器，让 popup 获取document
         * iframe 场景下可能需要把 document 传进来，因为不只一个`document`
         * default: () => window.document
         * */
        documentNodeGetter: PropTypes.func,

        /*
         * wrap挂载的父节点获取器，自定义wrap挂载的父节点
         * 除了document.body之外，可能需要自定义wrap挂载的父节点
         * default: (containerNode) => props.documentNodeGetter().body
         * */
        // wrapMountNodeGetter: PropTypes.func,
        containerMountNodeGetter: PropTypes.func,

        /*
         * 发生对齐时的回调
         * e.g: onAlign(popupNode, alignment) => { console.log(popupNode, alignment)}
         * */
        onAlign: PropTypes.func,

        /*
         * 显/隐变化时的回调
         * e.g: visible => console.log(visible)
         * */
        onVisibleChange: PropTypes.func,

        /*
         * 显/隐变化后的回调
         * e.g: visible => console.log(visible)
         * */
        afterVisibleChange: PropTypes.func,

        /*
         * 显/隐变前的回调
         * 需返回一个promise，当promise resolve后，才变化
         * 注意，如果存在事件 delay 如 props.mouseLeaveDelayInSec = 0.1
         * beforeVisibleChange是发生在 delay 之后
         * e.g: (visible) => new Promise(resolve => {
         *           if (true) resolve()
         *      })
         * */
        beforeVisibleChange: PropTypes.func,
    }
    static defaultProps = {
        classPrefix: 'erp',
        content: 'default popup content',
        action: '',
        showAction: [],
        hideAction: [],
        destroyPopupOnHide: false,
        mouseEnterDelayInSec: 0,
        mouseLeaveDelayInSec: 0.1,
        focusDelayInSec: 0,
        blurDelayInSec: 0.15,
        hasMask: false,
        maskClosable: true,
        documentNodeGetter: () => window.document,
        onAlign: noop,
        onVisibleChange: noop,
        beforeVisibleChange: noopPromise,
        afterVisibleChange: noop,
    }
    state = {
        popupVisible: 'visible' in this.props ? !!this.props.visible : !!this.props.defaultVisible
    }

    // 用来存 popupContainer
    _popupContainer = null

    // 用来存 popupWrap;
    _popupWrap = null

    constructor(props) {
        super(props)
        ALL_HANDLERS.forEach((h) => {
            this[`${h}`] = this[`${h}`].bind(this)
        })
    }

    componentWillMount() {
        compStyle.use()
    }

    componentDidMount() {
        this.componentDidUpdate({}, {
            visible: this.state.popupVisible,
        })
    }

    componentWillReceiveProps(nextProps) {
        const  { visible } = nextProps
        // if (visible !== undefined) {
        if ('visible' in nextProps) {
            this.setState({
                popupVisible: nextProps.visible,
            })
        }
    }

    componentDidUpdate(prevProps, prevState) {

        const {props, state} = this
        // this.renderPopup().then(comp => {
        //     this._popupWrap = comp
        //     if (prevState.visible !== state.popupVisible) {
        //         props.afterVisibleChange(state.popupVisible)
        //     }
        // })

        if (this._popupWrap || this.isPopupVisible) {
            if (!this._popupContainer) {
                // this._popupContainer = this.popupWrap
                this._popupContainer = this.popupContainer
            }
            // const component = this.popupContainer
            const component = this.popupWrap
            const instance = this
            ReactDOM.unstable_renderSubtreeIntoContainer(
                this, component, this._popupContainer,
                function callback() {
                    instance._popupWrap = this
                    if (prevState.visible !== state.popupVisible) {
                        props.afterVisibleChange(state.popupVisible)
                    }
                }
            )
        }

        if (state.popupVisible) {
            let currentDocument
            if (!this.clickOutsideHandler && this.isClickToHide) {
                currentDocument = props.documentNodeGetter()
                // 用mousedown不用click，只要鼠标按下就触发onDocumentClick，如果在外部则关闭弹层
                // 如果用click，当弹层内部发生点击事件并改变了弹层内容，比如点击了弹层中的按钮并让按钮消失，此时当document的click事件
                // handler执行时，根据判断onDocumentClick的逻辑，会判断该点击不是发生在弹层内部（因为按钮已经不存在了）而关闭了弹层
                this.clickOutsideHandler = addEventListener(currentDocument, 'mousedown', this.onDocumentClick)
            }
        }
        else {
            this.clearOutsideHandler()
        }
    }

    componentWillUnmount() {
        this.removeContainer()
        this.clearDelayTimer()
        this.clearOutsideHandler()
        compStyle.unuse()
    }

    render() {
        const props = this.props
        const children = props.children
        const child = React.Children.only(children)

        return React.cloneElement(child, this.childProps)
    }

    get childProps() {
        const childProps = {}
        if (this.isClickToHide || this.isClickToShow) {
            childProps.onClick = this.onClick
            childProps.onMouseDown = this.onMouseDown
        } else {
            childProps.onClick = this.createTwoChains('onClick')
            childProps.onMouseDown = this.createTwoChains('onMouseDown')
        }

        if (this.isMouseEnterToShow) {
            childProps.onMouseEnter = this.onMouseEnter
        } else {
            childProps.onMouseEnter = this.createTwoChains('onMouseEnter');
        }

        if (this.isMouseLeaveToHide) {
            childProps.onMouseLeave = this.onMouseLeave
        } else {
            childProps.onMouseLeave = this.createTwoChains('onMouseLeave');
        }

        if (this.isFocusToShow || this.isBlurToHide) {
            childProps.onFocus = this.onFocus;
            childProps.onBlur = this.onBlur;
        } else {
            childProps.onFocus = this.createTwoChains('onFocus');
            childProps.onBlur = this.createTwoChains('onBlur');
        }

        return childProps
    }

    // get popupContainer() {
    get popupWrap() {
        const {
            props: {
                style, wrapStyle,
                content,
                placement,
                alignment,
                onAlign,
                destroyPopupOnHide,
                hasMask,
            },
            state: {
                popupVisible
            }
        } = this
        const mouseProps = {}
        if (this.isMouseEnterToShow) {
            mouseProps.onMouseEnter = this.onPopupMouseEnter
        }
        if (this.isMouseLeaveToHide) {
            mouseProps.onMouseLeave = this.onPopupMouseLeave
        }
        return h(PopupWrap, {
            style, wrapStyle,
            visible: popupVisible,
            destroyPopupOnHide,
            hasMask,
            placement,
            alignment,
            onAlign,
            targetGetter: () => this.rootDomNode,
            ...mouseProps
        }, typeof content === 'function' ? content() : content)
    }


    // get popupWrap() {
    get popupContainer() {
        const { props } = this
        const container = document.createElement('div')
        // Make sure default popup container will never cause scrollbar appearing
        // https://github.com/react-component/trigger/issues/41
        // container.style.position = 'absolute'
        // container.style.top = '0'
        // container.style.left = '0'
        // container.style.width = '100%'
        // if ('zIndex' in props) {
        if (props.zIndex !== undefined) {
            container.style.zIndex = props.zIndex
        }
        Object.assign(container.style, props.style)
        // wrap.className = c(`${props.classPrefix}-popup-wrap`, props.className)
        container.className = c(`${props.classPrefix}-popup-container`, props.className)
        // const mountNode = typeof props.containerMountNodeGetter === 'function' ?
        //     props.containerMountNodeGetter(this.rootDomNode) : this.mountNode
        this.mountNode.appendChild(container)
        return container
    }


    get mountNode() {
        if (isCallable(this.props.containerMountNodeGetter)) {
            return this.props.containerMountNodeGetter(this.rootDomNode)
        }

        // 嵌套的popup时，默认将挂载到父popup的 `.${classPrefix}-popup-wrap` 下
        // 使当子popup 触发 click 或 mouseEnter 时 contains(this.popupDomNode, target) === true 而不关闭父popup
        let node = this.rootDomNode.parentNode
        while (node) {
            if (node.className) {
                // 如果在在modal body中，且modal body 高度足够，将popup mount 到 modal body 中
                // 暂且以400位足够（依据 suggest 最多8个选项高度< 270）
                // if (node.className.indexOf('-modal-body') !== -1 && node.clientHeight > 400) {
                //     return node
                // }

                if (node.className.indexOf('-popup-wrap') !== -1) {
                    return node
                }
            }
            node = node.parentNode
        }
        return this.documentNode.body
    }

    get documentNode() {
        const documentNodeGetter = isCallable(this.props.documentNodeGetter) ? this.props.documentNodeGetter : () => window.document
        return documentNodeGetter()
    }

    removeContainer() {
        if (this._popupContainer) {
            const container = this._popupContainer
            ReactDOM.unmountComponentAtNode(container)
            container.parentNode.removeChild(container)
            this._popupContainer = null
        }
    }

    clearOutsideHandler() {
        if (this.clickOutsideHandler) {
            this.clickOutsideHandler.remove()
            this.clickOutsideHandler = null
        }
    }

    fireEvents(type, e) {
        const childCallback = this.props.children.props[type]
        if (childCallback) {
            childCallback(e)
        }
        const callback = this.props[type]
        if (callback) {
            callback(e)
        }
    }

    createTwoChains(eventType) {
        const childPros = this.props.children.props
        const props = this.props
        if (childPros[eventType] && props[eventType]) {
            return e => this.fireEvents(eventType, e)
        }
        return childPros[eventType] || props[eventType]
    }

    onMouseDown(e) {
        this.fireEvents('onMouseDown', e)
        this.preClickTime = Date.now()
    }

    onClick(event) {
        this.fireEvents('onClick', event)
        // focus will trigger click
        if (this.focusTime) {
            let preTime
            if (this.preClickTime && this.preTouchTime) {
                preTime = Math.min(this.preClickTime, this.preTouchTime)
            } else if (this.preClickTime) {
                preTime = this.preClickTime
            } else if (this.preTouchTime) {
                preTime = this.preTouchTime
            }
            if (Math.abs(preTime - this.focusTime) < 20) {
                return
            }
            this.focusTime = 0
        }
        this.preClickTime = 0
        this.preTouchTime = 0
        event.preventDefault()
        const nextVisible = !this.state.popupVisible
        if (this.isClickToHide && !nextVisible || nextVisible && this.isClickToShow) {
            // this.setPopupVisible(!this.state.popupVisible)
            this.delaySetPopupVisible(!this.state.popupVisible)
        }
    }

    onDocumentClick(event) {
        if (this.props.hasMask && !this.props.maskClosable) {
            return
        }
        const target = event.target
        if (!contains(this.rootDomNode, target) && !contains(this.popupDomNode, target)) {
            this.close()
        }
    }

    onMouseEnter(e) {
        this.fireEvents('onMouseEnter', e)
        this.delaySetPopupVisible(true, this.props.mouseEnterDelayInSec)
    }

    onMouseLeave(e) {
        this.fireEvents('onMouseLeave', e)
        this.delaySetPopupVisible(false, this.props.mouseLeaveDelayInSec)
    }

    onPopupMouseEnter() {
        this.clearDelayTimer();
    }

    onPopupMouseLeave(e) {
        // https://github.com/react-component/trigger/pull/13
        // react bug?
        const popupDomNode = this._popupWrap.getPopupDomNode()
        if (e.relatedTarget && !e.relatedTarget.setTimeout &&
            this._popupWrap &&
            popupDomNode !== e.relatedTarget &&
            contains(popupDomNode, e.relatedTarget)
        ) {
            return
        }
        this.delaySetPopupVisible(false, this.props.mouseLeaveDelayInSec);
    }

    onFocus(e) {
        this.fireEvents('onFocus', e)
        // incase focusin and focusout
        this.clearDelayTimer()
        if (this.isFocusToShow) {
            this.focusTime = Date.now()
            this.delaySetPopupVisible(true, this.props.focusDelayInSec)
        }
    }

    onBlur(e) {
        this.fireEvents('onBlur', e)
        this.clearDelayTimer()
        if (this.isBlurToHide) {
            this.delaySetPopupVisible(false, this.props.blurDelayInSec)
        }
    }

    delaySetPopupVisible(visible, delayInSecond = 0) {
        const delay = delayInSecond * 1000
        this.clearDelayTimer()
        if (delay) {
            this.delayTimer = setTimeout(() => {
                this.setPopupVisible(visible)
                this.clearDelayTimer()
            }, delay)
        } else {
            this.setPopupVisible(visible)
        }
    }

    clearDelayTimer() {
        if (this.delayTimer) {
            clearTimeout(this.delayTimer)
            this.delayTimer = null
        }
    }

    setPopupVisible(visible) {
        this.clearDelayTimer()
        // 没变就不触发了修改了，待验证有无暗坑 @ 2017-07-07
        if (visible === this.isPopupVisible) return

        this.props.beforeVisibleChange(visible, this)
            .then(() => {
                if (this.state.popupVisible !== visible) {
                    if (!('visible' in this.props)) {
                        this.setState({
                            popupVisible: visible,
                        })
                    }
                    this.props.onVisibleChange(visible)
                }
            }, ngResult => {
                console.log(ngResult)
            })
    }

    close() {
        // this.setPopupVisible(false)
        this.delaySetPopupVisible(false)
    }

    get isPopupVisible() {
        return this.state.popupVisible
    }

    get isClickToShow() {
        const { action, showAction } = this.props
        return action.indexOf('click') !== -1 || showAction.indexOf('click') !== -1
    }

    get isClickToHide() {
        const { action, hideAction } = this.props
        return action.indexOf('click') !== -1 || hideAction.indexOf('click') !== -1
    }

    get isMouseEnterToShow() {
        const { action, showAction } = this.props
        return action.indexOf('hover') !== -1 || showAction.indexOf('mouseEnter') !== -1
    }

    get isMouseLeaveToHide() {
        const { action, hideAction } = this.props
        return action.indexOf('hover') !== -1 || hideAction.indexOf('mouseLeave') !== -1
    }

    get isFocusToShow() {
        const { action, showAction } = this.props;
        return action.indexOf('focus') !== -1 || showAction.indexOf('focus') !== -1;
    }

    get isBlurToHide() {
        const { action, hideAction } = this.props;
        return action.indexOf('focus') !== -1 || hideAction.indexOf('blur') !== -1;
    }

    get rootDomNode() {
        return findDOMNode(this)
    }

    get popupDomNode() {
        if (this._popupWrap && this._popupWrap.popupDomNode) {
            return this._popupWrap.popupDomNode
        }
        return null
    }
}
