define(['module', 'ls-hook', 'img/favicon'], function(Module, lsHook, imgFavicon) {

    function FaviconUnreadCountModule() { }

    FaviconUnreadCountModule.prototype = new Module()

    FaviconUnreadCountModule.prototype.getLabel = function faviconUnreadCount_getLabel() {
        return "В иконке сайта показывать кол-во непрочитанных комментов"
    }

    FaviconUnreadCountModule.prototype.attach = function faviconUnreadCount_attach(config) {
        this.onCheckNeeded = this.checkAndUpdateFavicon.bind(this)
        this.data = this.prepareData()

        this.data.eFavicon.onload = function() {
            this.checkAndUpdateFavicon()
            if (!window.MutationObserver) {
                this.interval = setInterval(this.onCheckNeeded, 1000)
            } else {
                this.observer = new MutationObserver(this.onCheckNeeded)

                var o = document.getElementById('new_comments_counter')
                if (o) {
                    this.observer.observe(o, {childList:true,characterData:true,subtree:true})
                }
            }
        }.bind(this)

        this.data.eFavicon.src = imgFavicon
    }

    FaviconUnreadCountModule.prototype.detach = function faviconUnreadCount_detach() {
        if (this.interval) {
            clearInterval(this.interval)
        }
        if (this.observer) {
            observer.disconnect()
        }
        delete this.interval
        delete this.observer
        delete this.onCheckNeeded

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
          , fontSizeXX = -1
          , fontSizeXXX = -1
          , fontSize1k = -1
          , fontSizeMoreThan1k = -1

        eCanvas.setAttribute('width', dimen)
        eCanvas.setAttribute('height', dimen)

        // calculate font sizes
        for (var s = 32; s > 0; s--) {
            setFontSize(ctx, s)
            if (fontSizeXX == -1 && ctx.measureText("'00").width < dimen - 2*pad) {
                fontSizeXX = s
            }
            if (fontSizeXXX == -1 && ctx.measureText("000").width < dimen - 2*pad) {
                fontSizeXXX = s
            }
            if (fontSize1k == -1 && ctx.measureText("1k").width < dimen - 2*pad) {
                fontSize1k = s
            }
            if (fontSizeMoreThan1k == -1 && ctx.measureText(">1k").width < dimen - 2*pad) {
                fontSizeMoreThan1k = s
            }
            if (fontSizeXX > -1 && fontSizeXXX > -1 && fontSize1k > -1 && fontSizeMoreThan1k > -1) {
                break
            }
        }

        return {
            bakHref:            bakHref,
            eFavLink:           eFavLink,
            eFavicon:           eFavicon,
            eCanvas:            eCanvas,
            ctx:                ctx,
            fontSizeXX:         fontSizeXX,
            fontSizeXXX:        fontSizeXXX,
            fontSize1k:         fontSize1k,
            fontSizeMoreThan1k: fontSizeMoreThan1k,
            dimen:              dimen,
            pad:                pad,
        }
    }


    FaviconUnreadCountModule.prototype.checkAndUpdateFavicon = function faviconUnreadCount_checkAndUpdateFavicon() {
        if (!this.data) {
            return
        }
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
            this.drawCnt(curCnt, this.data.fontSizeXX)
        } else if (curCnt < 1000) {
            this.drawCnt(curCnt, this.data.fontSizeXXX)
        } else if (curCnt == 1000) {
            this.drawCnt('1k', this.data.fontSize1k)
        } else {
            this.drawCnt(">1k", this.data.fontSizeMoreThan1k)
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
