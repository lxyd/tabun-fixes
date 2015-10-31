define(['jquery', 'module'], function($, Module) {
    function SpacebarMoveToNextModule() { }

    SpacebarMoveToNextModule.prototype = new Module()

    SpacebarMoveToNextModule.prototype.getLabel = function spacebarMoveToNext_getLabel() {
        return "По пробелу переходить на следующий пост/непрочитанный коммент"
    }

    SpacebarMoveToNextModule.prototype.attach = function spacebarMoveToNext_attach(config) {
        this.handler = this.onSpacebarPressed.bind(this)
        document.addEventListener('keypress', this.handler)
    }

    SpacebarMoveToNextModule.prototype.detach = function spacebarMoveToNext_detach(сonfig) {
        document.removeEventListener('keypress', this.handler)
        this.handler = null
    }

    SpacebarMoveToNextModule.prototype.onSpacebarPressed = function spacebarMoveToNext_onSpacebarPressed(ev) {
        var el = ev.target
        if (el.tagName == 'INPUT' || el.tagName == 'SELECT' || el.tagName == 'TEXTAREA' || el.isContentEditable) {
            // ignore input fields (as in https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js)
            return
        }
        if (ev.which == KeyEvent.DOM_VK_SPACE) {
            if (this.goToNext()) {
                ev.preventDefault()
            }
        }
    }

    SpacebarMoveToNextModule.prototype.goToNext = function spacebarMoveToNext_goToNext() {
        $(window).stop(true)
        if ($('#update-comments').length) { // we are on comments
            return ls.comments.goToNextComment()
        } else {
            var article
            $('ARTICLE').each(function() {
                var el = $(this)
                /* 40px - небольшой запас на случай микроскроллов, не очень заметных пользователю */
                if (el.offset().top > $(window).scrollTop() + 40) {
                    article = el
                    return false
                }
            })
            if (article) {
                $.scrollTo(article, 300, {offset: -10})
                return true
            } else {
                return false
            }
        }
    }

    return SpacebarMoveToNextModule
})
