define(['module'], function(Module) {

    function AlterLinksToMirrorsModule() { }

    AlterLinksToMirrorsModule.prototype = new Module()

    AlterLinksToMirrorsModule.prototype.init = function alterLinksToMirrors_init(config) {
        this.host = window.location.host

        this.mirrors = [
            'tabun.everypony.ru',
            'tabun.everypony.info',
            'табун.всепони.рф',
        ].filter(function(h) {
            return h != this.host
        })

        return config
    }

    AlterLinksToMirrorsModule.prototype.getLabel = function alterLinksToMirrors_getLabel() {
        return "Открывать ссылки на другие зеркала (" +
            this.mirrors.join(', ') + ") на текущем зеркале (" +
            this.host + ")"
    }

    AlterLinksToMirrorsModule.prototype.attach = function alterLinksToMirrors_attach(config) {
        this.handler = (function(ev) {
            this.changeAnchorHrefForClick(closestAnchor(ev.target))
        }).bind(this)
        document.addEventListener('click', this.handler, true)
    }

    AlterLinksToMirrorsModule.prototype.detach = function alterLinksToMirrors_detach() {
        document.removeEventListener('click', this.handler, true)
        this.handler = null
    }

    AlterLinksToMirrorsModule.prototype.changeAnchorHrefForClick = function alterLinksToMirrors_changeAnchorHrefForClick(a) {
        if (!isAnchorWithHref(a) || this.mirrors.indexOf(a.hostname) < 0 || isSiteRootAnchor(a)) {
            // Ничего не трогаем, если нам дали не элемент <a>,
            // либо элемент <a> без атрибута href,
            // либо ссылку на левый сайт, не являющийся зеркалом табуна
            // Также ссылки на корни зеркал трогать не будем:
            // они, вероятно, ведут туда намеренно
            return
        }

        var backup = a.href

        // на время клика подменим hostname
        a.hostname = this.host

        // сразу после клика вернём всё как было
        setTimeout(function() {
            a.href = backup
        }, 0)
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

    function isSiteRootAnchor(a) {
        return !a.pathname || a.pathname == '/'
    }

    return AlterLinksToMirrorsModule
})
