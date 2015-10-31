define(['module', 'cfg-panel-applet'], function(Module, CfgPanelApplet) {

    function RevealLiteSpoilersModule() { }

    RevealLiteSpoilersModule.prototype = new Module()

    RevealLiteSpoilersModule.prototype.init = function revealLiteSpoilers_init(config) {
        config = config || {
            revealOnHover: false,
            revealInCurrentComment: false,
            alwaysReveal: false,
        }
        return config
    }

    RevealLiteSpoilersModule.prototype.getLabel = function revealLiteSpoilers_getLabel() {
        return "Приоткрывать лайт-спойлеры"
    }

    RevealLiteSpoilersModule.prototype.attach = function revealLiteSpoilers_attach(config) {
        this._generateStyleSheet(config)
        if (this._style) {
            this._style.appendTo(document.head)
        }
    }

    RevealLiteSpoilersModule.prototype.detach = function revealLiteSpoilers_detach(сonfig) {
        if (this._style) {
            this._style.remove()
            this._style = null
        }
    }

    RevealLiteSpoilersModule.prototype.createCfgPanelApplet = function revealLiteSpoilers_createCfgPanelApplet() {
        return new RevealLiteSpoilersCfgPanelApplet()
    }

    RevealLiteSpoilersModule.prototype._generateStyleSheet = function revealLiteSpoilers_generateStyleSheet(config) {
        // http://userstyles.org/styles/92211/night-tabun
        var nightTabun = getComputedStyle($('<span>').attr('class', 'spoiler-gray')[0]).backgroundColor == "rgb(63, 53, 61)"

        // always visible state
        var transBgColor           = nightTabun ? '#2F252D' : '#EEE'
        var transTextColor         = nightTabun ? '#8F8F8F' : '#999'
        var transATextColor        = nightTabun ? '#7C89CA' : '#66AAFF'
        var transAVisitedTextColor = nightTabun ? '#7C89CA' : '#66AAFF'

        // hover state (fully visible)
        var hoverTextColor         = nightTabun ? '#DFDFDF' : '#666'
        var hoverATextColor        = nightTabun ? '#7C89CA' : '#0099FF'
        var hoverAVisitedTextColor = nightTabun ? '#7C89CA' : '#0099FF'

        var containers = ['.comment', '.comment-preview', '.topic', '.profile-info-about']
            // селекторы для спойлеров в обычном состоянии
          , selectorSpoiler = containers.map(function(s) { return s + ' .spoiler-gray' }).join(', ')
          , selectorA = containers.map(function(s) { return s + ' .spoiler-gray A' }).join(', ')
          , selectorAVisited = containers.map(function(s) { return s + ' .spoiler-gray A:visited' }).join(', ')
            // селекторы для наведённого коммента/поста
          , selectorPostHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray' }).join(', ')
          , selectorPostHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray A' }).join(', ')
          , selectorPostHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray A:visited' }).join(', ')
            // селекторы для текущего коммента
          , selectorPostActiveSpoiler = '.comment.comment-current .spoiler-gray'
          , selectorPostActiveA = '.comment.comment-current .spoiler-gray A'
          , selectorPostActiveAVisited = '.comment.comment-current .spoiler-gray A:visited'
            // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
          , selectorHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray:hover' }).join(', ')
          , selectorHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A' }).join(', ')
          , selectorHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A:visited' }).join(', ')

        var css = ''
        if (config.alwaysReveal) {
            css += 
                selectorSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                selectorA + ' { color: ' + transATextColor + ' !important; } ' +
                selectorAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
        } else {
            if (config.revealOnHover) {
                css += 
                    selectorPostHoverSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorPostHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorPostHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
            }

            if (config.revealInCurrentComment) {
                css +=
                    selectorPostActiveSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
            }
        }

        if (css) {
            css +=
                // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
                selectorHoverSpoiler + ' { background-color: transparent !important; color: ' + hoverTextColor + ' !important; } ' +
                selectorHoverA + ' { background-color: transparent !important; color: ' + hoverATextColor + ' !important; } ' +
                selectorHoverAVisited + ' { background-color: transparent !important; color: ' + hoverAVisitedTextColor + ' !important; } '
        }


        this._style = $('<style>').text(css)
    }

    function RevealLiteSpoilersCfgPanelApplet() { }

    RevealLiteSpoilersCfgPanelApplet.prototype = new CfgPanelApplet()

    RevealLiteSpoilersCfgPanelApplet.prototype.build = function revealLiteSpoilersApplet_build() {
        this.chkOnHover = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'revealOnHover')
        this.chkInCurrent = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'revealInCurrentComment')
        this.chkAlways = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'alwaysReveal')

        var div = $('<div>')
          , labelOnHover = $('<label>')
                .text("Приоткрывать лайт-спойлеры при наведении на пост/коммент")
                .prepend(this.chkOnHover)
          , labelInCurrent = $('<label>')
                .text("Светить лайт-спойлеры в активном комменте")
                .prepend(this.chkInCurrent)
          , labelAlways = $('<label>')
                .text("Всегда светить лайт-спойлеры")
                .prepend(this.chkAlways)

        div.append(labelOnHover, '<br/>', labelInCurrent, '<br/>', labelAlways)

        this.chkAlways.on('change', function() {
            if (this.chkAlways.is(':checked')) {
                this.chkOnHover.prop('checked', null)
                this.chkInCurrent.prop('checked', null)
            }
        }.bind(this))

        this.chkOnHover.on('change', function() {
            if (this.chkOnHover.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        this.chkInCurrent.on('change', function() {
            if (this.chkInCurrent.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        return div
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.setData = function revealLiteSpoilersApplet_setData(enabled, config) {
        CfgPanelApplet.prototype.setData.apply(this, arguments) // call to super()
        config = config || {}
        this.chkOnHover.prop('checked', config.revealOnHover ? 'checked' : null)
        this.chkInCurrent.prop('checked', config.revealInCurrentComment ? 'checked' : null)
        this.chkAlways.prop('checked', config.alwaysReveal ? 'checked' : null)
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getEnabled = function revealLiteSpoilersApplet_getEnabled() {
        return this.chkOnHover.is(':checked') || this.chkAlways.is(':checked') || this.chkInCurrent.is(':checked')
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getConfig = function revealLiteSpoilersApplet_getConfig() {
        var cfg = CfgPanelApplet.prototype.getConfig.apply(this, arguments) // call to super()
        cfg = cfg || {}

        cfg.revealOnHover = this.chkOnHover.is(':checked')
        cfg.revealInCurrentComment = this.chkInCurrent.is(':checked')
        cfg.alwaysReveal = this.chkAlways.is(':checked')

        return cfg
    }

    return RevealLiteSpoilersModule
})
