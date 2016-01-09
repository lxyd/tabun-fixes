define(['jquery', 'module', 'basic-cfg-panel-applet', 'ls-hook'], function($, Module, BasicCfgPanelApplet, lsHook) {
    function AutospoilerImagesModule() { }

    AutospoilerImagesModule.prototype = new Module()

    AutospoilerImagesModule.prototype.init = function autospoilerImages_init(config) {
        config = config || {
            width: 1000,
            height: 500,
            inCommentsOnly: true,
        }
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    AutospoilerImagesModule.prototype.getLabel = function autospoilerImages_getLabel() {
        return "Автоматически спойлерить картинки"
    }

    AutospoilerImagesModule.prototype.attach = function autospoilerImages_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    AutospoilerImagesModule.prototype.detach = function autospoilerImages_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    AutospoilerImagesModule.prototype.processPage = function autospoilerImages_processPage() {
        $('IMG').not('.spoiler IMG').each(function(_, e) {
            // HACK: XXX: 40 px is arbitrary non-loaded image width
            // TODO: implement more reliable way to determine not loaded image
            if (e.width > 40 || e.height > 40) {
                this.processImage(e)
            } else {
                // either wait for full load
                // or just let the img element find out the image's size
                this.waitForImage(e)
            }
        }.bind(this))
    }

    AutospoilerImagesModule.prototype.unprocessPage = function autospoilerImages_unprocessPage() {
        $('SPAN.spoiler').each(function(_, e) {
            var data = $(e).data(this.attrName)
            if (data && data.spoileredElement) {
                e.parentNode.insertBefore(data.spoileredElement, e)
                e.parentNode.removeChild(e)
            }
        }.bind(this))
    }

    AutospoilerImagesModule.prototype.waitForImage = function autospoilerImages_waitForImage(e) {
        var timeout = setTimeout(function() {
                this.processImage(e)
            }.bind(this), 1000)
          , loadListener = function() {
                clearTimeout(timeout)
                this.processImage(e)
            }.bind(this)

        e.addEventListener('load', loadListener)
    }

    AutospoilerImagesModule.prototype.processImage = function autospoilerImages_processImage(e) {
        // HACK: prevent rare double-spoilering
        if ($(e).is('.spoiler IMG')) {
            return
        }
        // HACK: prevent processing image after module is disabled
        if (!this.isEnabled()) {
            return
        }

        var cfg = this.getConfig()

        if (cfg.inCommentsOnly && !$(e).is('.comment IMG')) {
            return
        }

        if (e.width > cfg.width) {
            this.spoiler(e, 'ширина ' + e.width + 'px')
        } else if (e.height > cfg.height) {
            this.spoiler(e, 'высота ' + e.height + 'px')
        }
    }

    AutospoilerImagesModule.prototype.spoiler = function autospoilerImages_spoiler(img, reason) {
        var spoilerBody
        $(img).after(
            $('<SPAN>')
                .attr('class', 'spoiler')
                .data(this.attrName, { spoileredElement: img })
                .append(
                    $('<SPAN>')
                        .attr('class', 'spoiler-title')
                        .attr('onclick', '')
                        .text('[КАРТИНКА (' + reason + ')]'),
                    spoilerBody = $('<SPAN>')
                        .attr('class', 'spoiler-body')
                        .css({display: 'none'})
                )
        )
        spoilerBody.append(img)
    }

    AutospoilerImagesModule.prototype.createCfgPanelApplet = function autospoilerImages_createCfgPanelApplet() {
        var txtWidth = $('<input>')
            .attr('type', 'text')
            .attr('name', 'width')
            .css({
                width: 35,
             })
        var txtHeight = $('<input>')
            .attr('type', 'text')
            .attr('name', 'height')
            .css({
                width: 35,
             })
        var chkInCommentsOnly = $('<input>')
            .attr('type', 'checkbox')
            .attr('name', 'inCommentsOnly')
        var lblInCommentsOnly = $('<label>')
            .text(' автоспойлерить только в комментариях')
            .prepend(chkInCommentsOnly)

        return new BasicCfgPanelApplet(
                "Автоматически спойлерить картинки", " больше", txtWidth, "px шириной или ", txtHeight, "px высотой",
                " (&nbsp;", lblInCommentsOnly, ")"
        )
    }

    return AutospoilerImagesModule
})
