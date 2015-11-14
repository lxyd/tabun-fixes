define(['jquery', 'module', 'ls-hook'], function($, Module, lsHook) {
    function ImgAltToTitleModule() { }

    ImgAltToTitleModule.prototype = new Module()

    ImgAltToTitleModule.prototype.init = function imgAltToTitle_init(config) {
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    ImgAltToTitleModule.prototype.getLabel = function imgAltToTitle_getLabel() {
        return "Показывать атрибуты ALT у картинок всплывающими подсказками"
    }

    ImgAltToTitleModule.prototype.attach = function imgAltToTitle_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    ImgAltToTitleModule.prototype.detach = function imgAltToTitle_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    ImgAltToTitleModule.prototype.processPage = function imgAltToTitle_processPage() {
        var self = this
          , cfg = self.getConfig()

        $('IMG[alt]').each(function() {
            var el = $(this)

            if (!el.data(self.attrName)) {
                var origTitle = el.attr('title')
                  , alt = (el.attr('alt')||'').trim()
                  , title = (origTitle||'').trim()

                el.data(self.attrName, {
                    origTitle: origTitle,
                })

                if (!alt) {
                    return
                }

                if (title) {
                    title = alt + '(' + title + ')'
                } else {
                    title = alt
                }

                el.attr('title', title)
            }
        })
    }

    ImgAltToTitleModule.prototype.unprocessPage = function imgAltToTitle_unprocessPage() {
        var self = this

        $('IMG[alt]').each(function() {
            var el = $(this)
              , data = el.data(self.attrName)

            if (data) {
                if (data.origTitle == null) {
                    el.removeAttr('title')
                } else {
                    el.attr('title', data.origTitle)
                }
                el.removeData(self.attrName)
            }
        })
    }

    return ImgAltToTitleModule
})
