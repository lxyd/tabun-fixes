define(['module', 'ls-hook', 'img/favicon'], function(Module, lsHook, imgFavicon) {

    function FaviconUnreadCountModule() { }

    FaviconUnreadCountModule.prototype = new Module()

    FaviconUnreadCountModule.prototype.getLabel = function faviconUnreadCount_getLabel() {
        return "В иконке сайта показывать кол-во непрочитанных комментов"
    }

    FaviconUnreadCountModule.prototype.attach = function faviconUnreadCount_attach(config) {
        this.onTick = this.updateFavicon.bind(this)
        this.data = this.prepareData()
        this.interval = setInterval(this.onTick, 1000)
        this.updateFavicon()
    }

    FaviconUnreadCountModule.prototype.detach = function faviconUnreadCount_detach() {
        if (this.interval) {
            clearInterval(this.interval)
        }
        delete this.interval
        delete this.onTick

        // revert favicon
        if (this.data) {
            this.data.eFavLink.setAttribute('href', this.data.bakHref)
            reAttachEl(this.data.eFavLink)
        }
        delete this.data
    }

    FaviconUnreadCountModule.prototype.prepareData = function faviconUnreadCount_prepareCanvas() {
        var eFavLink = document.head.querySelector('LINK[rel~="icon"]')
          , bakHref = eFavLink.getAttribute('href')
          , eFavicon = new Image()
          , curCnt = 0
          , eCanvas = document.createElement('canvas')
          , ctx = eCanvas.getContext('2d')
          , dimen = 64
          , pad = 4
          , fontSizeNormal = -1
          , fontSize100 = -1
          , fontSizeMoreThan100 = -1

        eCanvas.setAttribute('width', dimen)
        eCanvas.setAttribute('height', dimen)

        // calculate font sizes
        for (var s = 32; s > 0; s--) {
            setFontSize(ctx, s)
            if (fontSizeNormal == -1 && ctx.measureText("'00").width < dimen - 2*pad) {
                fontSizeNormal = s
            }
            if (fontSize100 == -1 && ctx.measureText("100").width < dimen - 2*pad) {
                fontSize100 = s
            }
            if (ctx.measureText(">100").width < dimen - 2*pad) {
                fontSizeMoreThan100 = s
                break
            }
        }

        eFavicon.onload = this.updateFavicon.bind(this)
        eFavicon.src = imgFavicon

        return {
            bakHref:             bakHref,
            eFavLink:            eFavLink,
            eFavicon:            eFavicon,
            eCanvas:             eCanvas,
            ctx:                 ctx,
            fontSizeNormal:      fontSizeNormal,
            fontSize100:         fontSize100,
            fontSizeMoreThan100: fontSizeMoreThan100,
            dimen:               dimen,
            pad:                 pad,
        }
    }


    FaviconUnreadCountModule.prototype.updateFavicon = function faviconUnreadCount_updateFavicon() {
        var cnt = getCountToDisplay()
        if (cnt != this.data.curCnt) {
            this.data.curCnt = cnt
            this.redraw()
        }
    }

    FaviconUnreadCountModule.prototype.redraw = function faviconUnreadCount_redraw() {
        var w = this.data.eFavicon.width
          , h = this.data.eFavicon.height
          , dimen = this.data.dimen
          , curCnt = this.data.curCnt

        this.data.ctx.clearRect(0, 0, dimen, dimen)

        if (w > 0 && h > 0) {
            // draw favicon
            this.data.ctx.scale(dimen/w, dimen/h)
            this.data.ctx.drawImage(this.data.eFavicon, 0, 0)
            this.data.ctx.scale(w/dimen, h/dimen)
        }

        // draw text
        if (curCnt == 0) {
            // do nothing
        } else if (curCnt < 100) {
            this.drawCnt(curCnt, this.data.fontSizeNormal)
        } else if (curCnt == 100) {
            this.drawCnt(curCnt, this.data.fontSize100)
        } else {
            this.drawCnt(">100", this.data.fontSizeMoreThan100)
        }

        // force browser to redraw
        this.data.eFavLink.setAttribute('href', this.data.eCanvas.toDataURL())
        reAttachEl(this.data.eFavLink)
    }

    FaviconUnreadCountModule.prototype.drawCnt = function faviconUnreadCount_drawCnt(sCnt, fontSize) {
        var ctx = this.data.ctx
          , dimen = this.data.dimen
          , pad = this.data.pad

        setFontSize(ctx, fontSize)
        var m = ctx.measureText(sCnt)

        ctx.fillStyle = "rgba(255,255,255,0.8)"

        ctx.fillRect(dimen - 2*pad - m.width, dimen - 2*pad - fontSize, m.width + 2*pad, fontSize + 2*pad)

        ctx.fillStyle = "black"
        ctx.shadowColor = "white"
        ctx.shadowOffsetX = -2
        ctx.shadowOffsetY = -2
        ctx.shadowBlur = 5
        ctx.fillText(sCnt, dimen - pad - m.width, dimen - pad)
    }

    function setFontSize(ctx, size) {
        ctx.font = size + 'pt Sans'
    }

    function reAttachEl(e) {
        var eNext = e.nextSibling
          , eParent = e.parentNode
        eParent.removeChild(e)
        if (eNext) {
            eParent.insertBefore(e, eNext)
        } else {
            eParent.appendChild(e)
        }
    }

    function getCountToDisplay() {
        var el = document.getElementById('new_comments_counter')
        if (!el) {
            return 0
        }
        if (el && el.offsetWidth) {
            return parseInt(el.textContent.trim())
        } else {
            return 0
        }
    }

    return FaviconUnreadCountModule

})
