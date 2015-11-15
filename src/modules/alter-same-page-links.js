define(['module'], function(Module) {

    var mirrors = [
        'tabun.everypony.ru',
        'tabun.everypony.info',
        'табун.всепони.рф',
    ]

    function AlterSamePageLinksModule() { }

    AlterSamePageLinksModule.prototype = new Module()

    AlterSamePageLinksModule.prototype.init = function alterSamePageLinks_init(config) {
        this.cssClass = this.getApp().getId() + '-same-page-anchor'
        return config
    }

    AlterSamePageLinksModule.prototype.getLabel = function alterSamePageLinks_getLabel() {
        return "При клике на ссылку на коммент, находящийся на текущей странице, сразу скроллить на него (такие ссылки будут зеленеть при наведении)"
    }

    AlterSamePageLinksModule.prototype.attach = function alterSamePageLinks_attach(config) {
        this.clickHandler = this.onClick.bind(this)
        this.mouseOverHandler = this.onMouseOver.bind(this)
        this.mouseOutHandler = this.onMouseOut.bind(this)
        document.addEventListener('click', this.clickHandler)
        document.addEventListener('mouseover', this.mouseOverHandler)
        document.addEventListener('mouseout', this.mouseOutHandler)

        this.style = $('<style>').text(
                'A.' + this.cssClass + ', ' +
                'A.' + this.cssClass + ':hover, ' +
                'A.' + this.cssClass + ':visited {color: #0A0 !important}')
            .appendTo(document.head)
    }

    AlterSamePageLinksModule.prototype.detach = function alterSamePageLinks_detach() {
        document.removeEventListener('click', this.clickHandler)
        document.removeEventListener('mouseover', this.mouseOverHandler)
        document.removeEventListener('mouseout', this.mouseOutHandler)
        this.clickHandler = null
        this.mouseOverHandler = null
        this.mouseOutHandler = null

        this.style.remove()
        this.style = null

        $('A.' + this.cssClass).removeClass(this.cssClass)
    }

    AlterSamePageLinksModule.prototype.onClick = function alterSamePageLinks_onClick(ev) {
        if (
                ev.which != null && ev.which != 1 ||
                ev.button != null && ev.button != 0
        ) {
            return
        }

        var a = closestAnchor(ev.target)
          , id = getLinkedCommentId(a)

        if (!isSamePageComment(id)) {
            return
        }

        if (ev.defaultPrevented) {
            return // something has already handled this event
        }

        // TODO : remove this line
        window.location.hash = "comment" + id

        /* TODO : uncomment this part
        // update #hash part of the url avoiding immediate scrolling via mungling anchor's name
        var elCommentAnchor = $('#comment_id_' + id + ' A[name="comment' + id + '"]')
        elCommentAnchor.attr('name', 'mungle-comment' + id)
        window.location.hash = "comment" + id
        elCommentAnchor.attr('name', 'comment' + id)

        // TODO : implement for new tabun version
        // smooth scroll to the element
        ls.comments.scrollToComment(id)

        // TODO : remember clicked link and add back link to the target comment
        */

        ev.stopImmediatePropagation()
        ev.preventDefault()
        return false
    }

    AlterSamePageLinksModule.prototype.onMouseOver = function alterSamePageLinks_onMouseOver(ev) {
        var a = closestAnchor(ev.target)
        if (isSamePageComment(getLinkedCommentId(a))) {
            $(a).addClass(this.cssClass)
        }
    }

    AlterSamePageLinksModule.prototype.onMouseOut = function alterSamePageLinks_onMouseOut(ev) {
        var a = closestAnchor(ev.target)
        $(a).removeClass(this.cssClass)
    }

    function closestAnchor(el) {
        while (el instanceof HTMLElement) {
            if (el.nodeName.toUpperCase() == 'A') {
                return el
            } else {
                el = el.parentNode
            }
        }

        return null
    }

    function isAnchorWithHref(el) {
        return el instanceof HTMLElement &&
            el.nodeName.toUpperCase() == 'A' &&
            el.href
    }

    var reCommentInPath = new RegExp('^/comments/([^/]+)/*$')
      , reCommentInHash = new RegExp('^#comment(.+)$')

    function getLinkedCommentId(a) {
        var res
        if (!isAnchorWithHref(a)) {
            return null
        }
        if (mirrors.indexOf(a.host) < 0) {
            return null
        }
        if (null != (res = (reCommentInPath.exec(a.pathname)||[])[1])) {
            return res
        }
        if (null != (res = (reCommentInHash.exec(a.hash)||[])[1])) {
            return res
        }
        return null
    }

    function isSamePageComment(id) {
        return id != null && document.getElementById('comment_id_' + id) != null
    }

    return AlterSamePageLinksModule
})
